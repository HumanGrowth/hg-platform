"""Service layer del motor de assessment (B2-03).

Funciones puras sobre una Session ya scopeada al tenant (RLS). Orquesta sesiones,
respuestas, scoring (strategy pattern) y el snapshot read-optimized en
``UserLearningProfile.dimension_states``.
"""
from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from hg.modules.assessment.enums import (
    DimensionCode,
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
    DimensionResult,
)
from hg.modules.assessment.scorers import SCORERS, ScoringInput, score_dimension
from hg.modules.identity.models import User
from hg.modules.learning.models import UserLearningProfile

DIMENSION_ORDER = [
    DimensionCode.P1, DimensionCode.P2, DimensionCode.P3, DimensionCode.P4,
    DimensionCode.P5, DimensionCode.P6A, DimensionCode.P6B,
]
SESSION_TTL_DAYS = 30


class AssessmentError(Exception):
    """Error de regla de negocio del assessment (→ 422 en el router)."""


def now_utc() -> datetime:
    return datetime.now(UTC)


# ─────────────────────────── Items ───────────────────────────


def ordered_items(db: Session, kind: SessionKind, target_dimension: DimensionCode | None) -> list[AssessmentItem]:
    if kind == SessionKind.onboarding_short:
        items = list(
            db.scalars(
                select(AssessmentItem).where(
                    AssessmentItem.short_subset.is_(True), AssessmentItem.is_active.is_(True)
                )
            ).all()
        )
        order = {p: i for i, p in enumerate(DIMENSION_ORDER)}
        items.sort(key=lambda it: (order.get(it.dimension_code, 99), it.order_index))
        return items
    # dimension_detail
    items = list(
        db.scalars(
            select(AssessmentItem).where(
                AssessmentItem.dimension_code == target_dimension, AssessmentItem.is_active.is_(True)
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
    db: Session, user: User, kind: SessionKind, target_dimension: DimensionCode | None
) -> AssessmentSession:
    profile = _profile(db, user)
    if kind == SessionKind.onboarding_short:
        if profile is not None and profile.onboarding_short_completed_at is not None:
            raise AssessmentError("onboarding ya completado")
        target_dimension = None
    else:
        if target_dimension is None:
            raise AssessmentError("target_dimension requerido para dimension_detail")
        existing = list(
            db.scalars(
                select(DimensionResult)
                .where(DimensionResult.user_id == user.id, DimensionResult.dimension_code == target_dimension)
                .order_by(DimensionResult.derived_at.desc())
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
        target_dimension=target_dimension,
        status=SessionStatus.in_progress,
        expires_at=now + timedelta(days=SESSION_TTL_DAYS),
    )
    db.add(session)
    # flush (no commit): populates server defaults (started_at) via RETURNING
    # while keeping the transaction open, so the SET LOCAL ROLE hg_app +
    # app.current_org_id set by get_current_user stays valid for the RLS
    # queries the router runs right after this returns (_session_out).
    # A commit here would end the transaction and reset both SET LOCAL
    # values, breaking every subsequent RLS-scoped query in the request.
    db.flush()
    return session


def _responses(db: Session, session: AssessmentSession) -> list[AssessmentResponse]:
    return list(
        db.scalars(
            select(AssessmentResponse).where(AssessmentResponse.session_id == session.id)
        ).all()
    )


def get_next_item(db: Session, session: AssessmentSession) -> AssessmentItem | None:
    items = ordered_items(db, session.kind, session.target_dimension)
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
        # Deliberate commit: we want the expiry to persist even though we're
        # about to raise (which the router turns into a 422, never reaching
        # _session_out), so there's no later RLS query in this request that
        # a reset SET LOCAL context could break.
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
        db.flush()
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
    db.flush()
    return resp


def finalize_session(db: Session, session: AssessmentSession) -> list[DimensionResult]:
    if session.status == SessionStatus.completed:
        raise AssessmentError("la sesión ya fue finalizada")
    items = ordered_items(db, session.kind, session.target_dimension)
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
    by_dimension: dict[DimensionCode, list[AssessmentResponse]] = {}
    for r in responses:
        it = item_lookup[r.item_id]
        by_dimension.setdefault(it.dimension_code, []).append(r)

    if session.kind == SessionKind.onboarding_short:
        dimensions = [p for p in DIMENSION_ORDER if p in by_dimension]
    else:
        if session.target_dimension is None:
            raise AssessmentError("sesión sin pilar objetivo")
        dimensions = [session.target_dimension]

    results: list[DimensionResult] = []
    for dimension in dimensions:
        inp = ScoringInput(responses=by_dimension[dimension], items=item_lookup, source=source)
        out = score_dimension(dimension, inp)
        retake = SCORERS[dimension].next_retake_eligible_at(source)
        result = DimensionResult(
            org_id=session.org_id,
            user_id=session.user_id,
            dimension_code=dimension,
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
    # flush (not commit): populates each result's server default (derived_at)
    # via RETURNING while keeping the transaction — and its SET LOCAL ROLE
    # hg_app / app.current_org_id — open for _update_profile below and for
    # the router's subsequent _result_out(...) calls.
    db.flush()
    _update_profile(db, session, results)
    db.flush()
    _recompute_progression(db, session.user_id, [r.dimension_code.value for r in results])
    return results


def _recompute_progression(db: Session, user_id: uuid.UUID, assessment_codes: list[str]) -> None:
    """Recalcula el completion + badges de las dimensiones tocadas por el assessment
    (Capa Empresa · TASK 6). Best-effort: no rompe el finalize si algo falla."""
    from hg.modules.badges import progression

    user = db.get(User, user_id)
    if user is None:
        return
    for code in set(assessment_codes):
        progression.recompute_for_assessment_code(db, user, code)


def _update_profile(db: Session, session: AssessmentSession, results: list[DimensionResult]) -> None:
    profile = db.scalar(
        select(UserLearningProfile).where(UserLearningProfile.user_id == session.user_id)
    )
    if profile is None:
        profile = UserLearningProfile(
            org_id=session.org_id, user_id=session.user_id, dimension_states={}
        )
        db.add(profile)
        db.flush()

    states = dict(profile.dimension_states or {})
    for r in results:
        states[r.dimension_code.value] = {
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
    profile.dimension_states = states
    profile.last_assessment_at = now_utc()
    if session.kind == SessionKind.onboarding_short:
        profile.onboarding_short_completed_at = now_utc()


def confirm_dimension(db: Session, user: User, dimension: DimensionCode) -> DimensionResult:
    """User confirma el upgrade (ej. P3 N3 → N4 Generativo)."""
    latest = db.scalar(
        select(DimensionResult)
        .where(DimensionResult.user_id == user.id, DimensionResult.dimension_code == dimension)
        .order_by(DimensionResult.derived_at.desc())
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
        states = dict(profile.dimension_states or {})
        st = dict(states.get(dimension.value, {}))
        st.update(
            {
                "state": latest.state_code,
                "state_label": latest.state_label,
                "requires_user_confirmation": False,
            }
        )
        states[dimension.value] = st
        profile.dimension_states = states
    # flush (not commit): latest's mutated fields are already in memory, no
    # refresh needed — a commit here would end the transaction and reset
    # SET LOCAL ROLE hg_app / app.current_org_id before the router's
    # _result_out(result) read (harmless here since it's plain attrs, but
    # keeping the pattern consistent avoids re-introducing this class of bug).
    db.flush()
    _recompute_progression(db, user.id, [dimension.value])
    return latest


def reset_retake(db: Session, user_id: uuid.UUID, dimension: DimensionCode) -> None:
    """RRHH/superadmin: habilita la re-evaluación inmediata de un pilar."""
    latest = db.scalar(
        select(DimensionResult)
        .where(DimensionResult.user_id == user_id, DimensionResult.dimension_code == dimension)
        .order_by(DimensionResult.derived_at.desc())
    )
    if latest is not None:
        latest.next_retake_eligible_at = now_utc()
        # No explicit commit: get_db()'s wrapper commits once the request
        # completes successfully.


# ─────────────────────────── Catálogo (instrumentos) ───────────────────────────


def instrument_for(db: Session, code: str) -> AssessmentInstrument | None:
    return db.scalar(select(AssessmentInstrument).where(AssessmentInstrument.code == code))


# ─────────────────── Métricas por usuario (fuente canónica · Release TASK 2) ──────────────────
# Estado del assessment derivado SIEMPRE del histórico `DimensionResult` (fuente de
# verdad), no del snapshot denormalizado `UserLearningProfile.dimension_states`. Así
# el colaborador (/me/results) y el manager (/team/[id]) ven exactamente lo mismo.


def latest_dimension_results(db: Session, user_id: uuid.UUID) -> list[DimensionResult]:
    """Último `DimensionResult` por pilar (dedup por derived_at desc)."""
    rows = list(
        db.scalars(
            select(DimensionResult)
            .where(DimensionResult.user_id == user_id)
            .order_by(DimensionResult.derived_at.desc(), DimensionResult.id.desc())
        ).all()
    )
    seen: set[str] = set()
    out: list[DimensionResult] = []
    for r in rows:
        if r.dimension_code.value not in seen:
            seen.add(r.dimension_code.value)
            out.append(r)
    return out


def assessment_states_snapshot(results: list[DimensionResult]) -> dict[str, dict]:
    """`{dimension_code: {state, state_label, source}}` desde `DimensionResult`."""
    return {
        r.dimension_code.value: {
            "state": r.state_code,
            "state_label": r.state_label,
            "source": r.source.value,
        }
        for r in results
    }
