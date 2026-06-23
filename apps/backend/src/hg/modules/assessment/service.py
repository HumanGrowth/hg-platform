"""Service layer del motor de assessment (B2-03).

Funciones puras sobre una Session ya scopeada al tenant (RLS). Orquesta sesiones,
respuestas, scoring (strategy pattern) y el snapshot read-optimized en
``UserLearningProfile.pillar_states``.
"""
from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from hg.modules.assessment.enums import (
    PillarCode,
    ResultSource,
    SessionKind,
    SessionStatus,
)
from hg.modules.assessment.models import (
    AssessmentInstrument,
    AssessmentItem,
    AssessmentItemOption,
    AssessmentResponse,
    AssessmentSession,
    PillarResult,
)
from hg.modules.assessment.scorers import SCORERS, ScoringInput, score_pillar
from hg.modules.identity.models import User
from hg.modules.learning.models import UserLearningProfile

PILLAR_ORDER = [
    PillarCode.P1, PillarCode.P2, PillarCode.P3, PillarCode.P4,
    PillarCode.P5, PillarCode.P6A, PillarCode.P6B,
]
SESSION_TTL_DAYS = 30


class AssessmentError(Exception):
    """Error de regla de negocio del assessment (→ 422 en el router)."""


def now_utc() -> datetime:
    return datetime.now(UTC)


# ─────────────────────────── Items ───────────────────────────


def ordered_items(db: Session, kind: SessionKind, target_pillar: PillarCode | None) -> list[AssessmentItem]:
    if kind == SessionKind.onboarding_short:
        items = list(
            db.scalars(
                select(AssessmentItem).where(
                    AssessmentItem.short_subset.is_(True), AssessmentItem.is_active.is_(True)
                )
            ).all()
        )
        order = {p: i for i, p in enumerate(PILLAR_ORDER)}
        items.sort(key=lambda it: (order.get(it.pillar_code, 99), it.order_index))
        return items
    # pillar_detail
    items = list(
        db.scalars(
            select(AssessmentItem).where(
                AssessmentItem.pillar_code == target_pillar, AssessmentItem.is_active.is_(True)
            )
        ).all()
    )
    items.sort(key=lambda it: it.order_index)
    return items


def _options_for(db: Session, item: AssessmentItem) -> list[AssessmentItemOption]:
    return list(
        db.scalars(
            select(AssessmentItemOption)
            .where(AssessmentItemOption.item_id == item.id)
            .order_by(AssessmentItemOption.order_index)
        ).all()
    )


# ─────────────────────────── Sesiones ───────────────────────────


def _profile(db: Session, user: User) -> UserLearningProfile | None:
    return db.scalar(select(UserLearningProfile).where(UserLearningProfile.user_id == user.id))


def start_session(
    db: Session, user: User, kind: SessionKind, target_pillar: PillarCode | None
) -> AssessmentSession:
    profile = _profile(db, user)
    if kind == SessionKind.onboarding_short:
        if profile is not None and profile.onboarding_short_completed_at is not None:
            raise AssessmentError("onboarding ya completado")
        target_pillar = None
    else:
        if target_pillar is None:
            raise AssessmentError("target_pillar requerido para pillar_detail")
        existing = list(
            db.scalars(
                select(PillarResult)
                .where(PillarResult.user_id == user.id, PillarResult.pillar_code == target_pillar)
                .order_by(PillarResult.derived_at.desc())
            ).all()
        )
        if not existing:
            raise AssessmentError("se requiere un resultado preliminar del pilar primero")
        latest = existing[0]
        if latest.source == ResultSource.confirmed and latest.next_retake_eligible_at > now_utc():
            raise AssessmentError("re-evaluación no disponible todavía")

    now = now_utc()
    session = AssessmentSession(
        org_id=user.org_id,
        user_id=user.id,
        kind=kind,
        target_pillar=target_pillar,
        status=SessionStatus.in_progress,
        expires_at=now + timedelta(days=SESSION_TTL_DAYS),
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def _responses(db: Session, session: AssessmentSession) -> list[AssessmentResponse]:
    return list(
        db.scalars(
            select(AssessmentResponse).where(AssessmentResponse.session_id == session.id)
        ).all()
    )


def get_next_item(db: Session, session: AssessmentSession) -> AssessmentItem | None:
    items = ordered_items(db, session.kind, session.target_pillar)
    answered = {r.item_id for r in _responses(db, session)}
    for it in items:
        if it.id not in answered:
            return it
    return None


def record_response(
    db: Session, session: AssessmentSession, item_id: uuid.UUID, value: int,
    qualitative_text: str | None = None, response_time_ms: int | None = None,
) -> AssessmentResponse:
    if session.status != SessionStatus.in_progress:
        raise AssessmentError("la sesión no está activa")
    if session.expires_at < now_utc():
        session.status = SessionStatus.expired
        db.commit()
        raise AssessmentError("la sesión expiró")

    item = db.get(AssessmentItem, item_id)
    if item is None:
        raise AssessmentError("item inexistente")

    options = _options_for(db, item)
    if options:
        valid = {o.value for o in options}
        if value not in valid:
            raise AssessmentError("response_value no corresponde a ninguna opción")
    else:
        smin = item.scale_min if item.scale_min is not None else 0
        smax = item.scale_max if item.scale_max is not None else 0
        if not (smin <= value <= smax):
            raise AssessmentError("response_value fuera de rango")

    existing = db.scalar(
        select(AssessmentResponse).where(
            AssessmentResponse.session_id == session.id, AssessmentResponse.item_id == item_id
        )
    )
    if existing is not None:
        existing.response_value = value
        existing.qualitative_text = qualitative_text
        existing.response_time_ms = response_time_ms
        db.commit()
        return existing

    resp = AssessmentResponse(
        org_id=session.org_id,
        session_id=session.id,
        item_id=item_id,
        response_value=value,
        qualitative_text=qualitative_text,
        response_time_ms=response_time_ms,
    )
    db.add(resp)
    db.commit()
    db.refresh(resp)
    return resp


def finalize_session(db: Session, session: AssessmentSession) -> list[PillarResult]:
    if session.status == SessionStatus.completed:
        raise AssessmentError("la sesión ya fue finalizada")
    items = ordered_items(db, session.kind, session.target_pillar)
    responses = _responses(db, session)
    answered = {r.item_id for r in responses}
    missing = [it for it in items if it.id not in answered]
    if missing:
        raise AssessmentError(f"faltan {len(missing)} respuestas para finalizar")

    item_lookup = {it.id: it for it in items}
    source = (
        ResultSource.preliminary
        if session.kind == SessionKind.onboarding_short
        else ResultSource.confirmed
    )

    # Agrupar respuestas por pilar.
    by_pillar: dict[PillarCode, list[AssessmentResponse]] = {}
    for r in responses:
        it = item_lookup[r.item_id]
        by_pillar.setdefault(it.pillar_code, []).append(r)

    if session.kind == SessionKind.onboarding_short:
        pillars = [p for p in PILLAR_ORDER if p in by_pillar]
    else:
        if session.target_pillar is None:
            raise AssessmentError("sesión sin pilar objetivo")
        pillars = [session.target_pillar]

    results: list[PillarResult] = []
    for pillar in pillars:
        inp = ScoringInput(responses=by_pillar[pillar], items=item_lookup, source=source)
        out = score_pillar(pillar, inp)
        retake = SCORERS[pillar].next_retake_eligible_at(source)
        result = PillarResult(
            org_id=session.org_id,
            user_id=session.user_id,
            pillar_code=pillar,
            source=source,
            state_code=out.state_code,
            state_label=out.state_label,
            sub_scores=out.sub_scores,
            requires_user_confirmation=out.requires_user_confirmation,
            recaida_detected=out.recaida_detected,
            suggested_next_step=out.suggested_next_step,
            derived_from_session_id=session.id,
            next_retake_eligible_at=retake,
        )
        db.add(result)
        results.append(result)

    session.status = SessionStatus.completed
    session.completed_at = now_utc()
    db.flush()
    _update_profile(db, session, results)
    db.commit()
    for res in results:
        db.refresh(res)
    return results


def _update_profile(db: Session, session: AssessmentSession, results: list[PillarResult]) -> None:
    profile = db.scalar(
        select(UserLearningProfile).where(UserLearningProfile.user_id == session.user_id)
    )
    if profile is None:
        profile = UserLearningProfile(
            org_id=session.org_id, user_id=session.user_id, pillar_states={}
        )
        db.add(profile)
        db.flush()

    states = dict(profile.pillar_states or {})
    for r in results:
        states[r.pillar_code.value] = {
            "state": r.state_code,
            "state_label": r.state_label,
            "source": r.source.value,
            "sub_scores": r.sub_scores,
            "requires_user_confirmation": r.requires_user_confirmation,
            "recaida_detected": r.recaida_detected,
            "suggested_next_step": r.suggested_next_step,
            "derived_at": now_utc().isoformat(),
            "next_retake_eligible_at": r.next_retake_eligible_at.isoformat(),
        }
    profile.pillar_states = states
    profile.last_assessment_at = now_utc()
    if session.kind == SessionKind.onboarding_short:
        profile.onboarding_short_completed_at = now_utc()


def confirm_pillar(db: Session, user: User, pillar: PillarCode) -> PillarResult:
    """User confirma el upgrade (ej. P3 N3 → N4 Generativo)."""
    latest = db.scalar(
        select(PillarResult)
        .where(PillarResult.user_id == user.id, PillarResult.pillar_code == pillar)
        .order_by(PillarResult.derived_at.desc())
    )
    if latest is None or not latest.requires_user_confirmation:
        raise AssessmentError("no hay confirmación pendiente para este pilar")

    upgrade = {"N3": ("N4", "Generativo")}
    if latest.state_code in upgrade:
        latest.state_code, latest.state_label = upgrade[latest.state_code]
    latest.requires_user_confirmation = False
    latest.user_confirmed_at = now_utc()

    profile = db.scalar(
        select(UserLearningProfile).where(UserLearningProfile.user_id == user.id)
    )
    if profile is not None:
        states = dict(profile.pillar_states or {})
        st = dict(states.get(pillar.value, {}))
        st.update(
            {
                "state": latest.state_code,
                "state_label": latest.state_label,
                "requires_user_confirmation": False,
            }
        )
        states[pillar.value] = st
        profile.pillar_states = states
    db.commit()
    db.refresh(latest)
    return latest


def reset_retake(db: Session, user_id: uuid.UUID, pillar: PillarCode) -> None:
    """RRHH/superadmin: habilita la re-evaluación inmediata de un pilar."""
    latest = db.scalar(
        select(PillarResult)
        .where(PillarResult.user_id == user_id, PillarResult.pillar_code == pillar)
        .order_by(PillarResult.derived_at.desc())
    )
    if latest is not None:
        latest.next_retake_eligible_at = now_utc()
        db.commit()


# ─────────────────────────── Catálogo (instrumentos) ───────────────────────────


def instrument_for(db: Session, code: str) -> AssessmentInstrument | None:
    return db.scalar(select(AssessmentInstrument).where(AssessmentInstrument.code == code))
