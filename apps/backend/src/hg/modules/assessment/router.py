"""Endpoints del motor de assessment (B2-03). Prefix /api/v1/assessment."""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from hg.core.deps import get_current_user, require_role
from hg.db import get_db
from hg.modules.assessment import service
from hg.modules.assessment.enums import PillarCode, SessionKind
from hg.modules.assessment.models import AssessmentItem, AssessmentSession, PillarResult
from hg.modules.assessment.schemas import (
    AssessmentItemOptionOut,
    AssessmentItemOut,
    FinalizeOut,
    MeResultsOut,
    PillarResultOut,
    ResponseIn,
    SessionOut,
    SessionStartIn,
)
from hg.modules.identity.models import User

router = APIRouter()


def _item_out(db: Session, item: AssessmentItem) -> AssessmentItemOut:
    opts = service._options_for(db, item)
    return AssessmentItemOut(
        id=item.id,
        item_code=item.item_code,
        pillar_code=item.pillar_code.value,
        sub_scale=item.sub_scale,
        sub_domain=item.sub_domain,
        response_type=item.response_type.value,
        scale_min=item.scale_min,
        scale_max=item.scale_max,
        prompt=item.prompt,
        order_index=item.order_index,
        options=[
            AssessmentItemOptionOut(id=o.id, order_index=o.order_index, label=o.label, value=o.value)
            for o in opts
        ]
        or None,
    )


def _session_out(db: Session, session: AssessmentSession) -> SessionOut:
    items = service.ordered_items(db, session.kind, session.target_pillar)
    answered = service._responses(db, session)
    nxt = service.get_next_item(db, session)
    return SessionOut(
        id=session.id,
        kind=session.kind.value,
        target_pillar=session.target_pillar.value if session.target_pillar else None,
        status=session.status.value,
        started_at=session.started_at,
        expires_at=session.expires_at,
        completed_at=session.completed_at,
        next_item=_item_out(db, nxt) if nxt else None,
        total_items=len(items),
        answered_items=len(answered),
    )


def _result_out(r: PillarResult) -> PillarResultOut:
    return PillarResultOut(
        pillar_code=r.pillar_code.value,
        source=r.source.value,
        state_code=r.state_code,
        state_label=r.state_label,
        sub_scores=r.sub_scores,
        requires_user_confirmation=r.requires_user_confirmation,
        user_confirmed_at=r.user_confirmed_at,
        recaida_detected=r.recaida_detected,
        suggested_next_step=r.suggested_next_step,
        derived_at=r.derived_at,
        next_retake_eligible_at=r.next_retake_eligible_at,
    )


def _get_session(db: Session, session_id: UUID, user: User) -> AssessmentSession:
    session = db.get(AssessmentSession, session_id)
    if session is None or session.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="session not found")
    return session


def _bad_request(exc: service.AssessmentError) -> HTTPException:
    return HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))


@router.post("/sessions", response_model=SessionOut, status_code=status.HTTP_201_CREATED)
def create_session(
    payload: SessionStartIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SessionOut:
    try:
        session = service.start_session(
            db, current_user, SessionKind(payload.kind), payload.target_pillar
        )
    except service.AssessmentError as exc:
        raise _bad_request(exc) from exc
    return _session_out(db, session)


@router.get("/sessions/{session_id}", response_model=SessionOut)
def get_session(
    session_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SessionOut:
    return _session_out(db, _get_session(db, session_id, current_user))


@router.post("/sessions/{session_id}/respond", response_model=SessionOut)
def respond(
    session_id: UUID,
    payload: ResponseIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SessionOut:
    session = _get_session(db, session_id, current_user)
    try:
        service.record_response(
            db, session, payload.item_id, payload.response_value,
            payload.qualitative_text, payload.response_time_ms,
        )
    except service.AssessmentError as exc:
        raise _bad_request(exc) from exc
    return _session_out(db, session)


@router.post("/sessions/{session_id}/finalize", response_model=FinalizeOut)
def finalize(
    session_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> FinalizeOut:
    session = _get_session(db, session_id, current_user)
    try:
        results = service.finalize_session(db, session)
    except service.AssessmentError as exc:
        raise _bad_request(exc) from exc
    return FinalizeOut(session_id=session.id, results=[_result_out(r) for r in results])


@router.post("/sessions/{session_id}/abandon", status_code=status.HTTP_204_NO_CONTENT)
def abandon(
    session_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    from hg.modules.assessment.enums import SessionStatus

    session = _get_session(db, session_id, current_user)
    if session.status == SessionStatus.in_progress:
        session.status = SessionStatus.abandoned
        db.commit()


@router.get("/me/results", response_model=MeResultsOut)
def my_results(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MeResultsOut:
    # Estado actual = último PillarResult por pilar.
    rows = list(
        db.scalars(
            select(PillarResult)
            .where(PillarResult.user_id == current_user.id)
            .order_by(PillarResult.derived_at.desc())
        ).all()
    )
    seen: set[str] = set()
    latest: list[PillarResult] = []
    for r in rows:
        if r.pillar_code.value not in seen:
            seen.add(r.pillar_code.value)
            latest.append(r)
    return MeResultsOut(results=[_result_out(r) for r in latest])


@router.post("/me/results/{pillar}/confirm", response_model=PillarResultOut)
def confirm(
    pillar: PillarCode,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PillarResultOut:
    try:
        result = service.confirm_pillar(db, current_user, pillar)
    except service.AssessmentError as exc:
        raise _bad_request(exc) from exc
    return _result_out(result)


@router.post("/admin/users/{user_id}/reset-retake/{pillar}", status_code=status.HTTP_204_NO_CONTENT)
def reset_retake(
    user_id: UUID,
    pillar: PillarCode,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "superadmin")),
) -> None:
    service.reset_retake(db, user_id, pillar)
