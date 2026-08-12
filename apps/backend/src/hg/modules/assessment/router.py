"""Endpoints del motor de assessment (B2-03). Prefix /api/v1/assessment."""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from hg.core.deps import get_current_user, require_role
from hg.db import get_db
from hg.modules.assessment import service
from hg.modules.assessment.enums import DimensionCode, SessionKind
from hg.modules.assessment.models import AssessmentItem, AssessmentSession, DimensionResult
from hg.modules.assessment.schemas import (
    AssessmentItemOptionOut,
    AssessmentItemOut,
    DimensionResultOut,
    FinalizeOut,
    MeResultsOut,
    RadarHistoryOut,
    RadarSnapshotItem,
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
        dimension_code=item.dimension_code.value,
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
    items = service.ordered_items(db, session.kind, session.target_dimension)
    answered = service._responses(db, session)
    nxt = service.get_next_item(db, session)
    return SessionOut(
        id=session.id,
        kind=session.kind.value,
        target_dimension=session.target_dimension.value if session.target_dimension else None,
        status=session.status.value,
        started_at=session.started_at,
        expires_at=session.expires_at,
        completed_at=session.completed_at,
        next_item=_item_out(db, nxt) if nxt else None,
        total_items=len(items),
        answered_items=len(answered),
    )


def _result_out(r: DimensionResult) -> DimensionResultOut:
    return DimensionResultOut(
        dimension_code=r.dimension_code.value,
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
            db, current_user, SessionKind(payload.kind), payload.target_dimension
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
        # No explicit commit: get_db()'s wrapper commits once the request
        # completes successfully (see AssessmentSession.start_session for
        # why a mid-request commit here would be actively harmful).


@router.get("/me/results", response_model=MeResultsOut)
def my_results(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MeResultsOut:
    # Estado actual = último DimensionResult por pilar (fuente canónica compartida).
    latest = service.latest_dimension_results(db, current_user.id)
    return MeResultsOut(results=[_result_out(r) for r in latest])


@router.get("/me/radar", response_model=RadarHistoryOut)
def my_radar(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> RadarHistoryOut:
    """Radar actual + evaluación anterior por pilar (overlay histórico · TASK 6.3).

    ``DimensionResult`` es append-only, así que el histórico ya existe: para cada
    pilar tomamos el último (actual) y el anteúltimo (previo) por ``derived_at``.
    """
    rows = list(
        db.scalars(
            select(DimensionResult)
            .where(DimensionResult.user_id == current_user.id)
            .order_by(DimensionResult.derived_at.desc())
        ).all()
    )
    current: list[RadarSnapshotItem] = []
    previous: list[RadarSnapshotItem] = []
    seen_current: set[str] = set()
    seen_previous: set[str] = set()
    for r in rows:
        code = r.dimension_code.value
        if code not in seen_current:
            seen_current.add(code)
            current.append(
                RadarSnapshotItem(dimension_code=code, state_code=r.state_code, derived_at=r.derived_at)
            )
        elif code not in seen_previous:
            seen_previous.add(code)
            previous.append(
                RadarSnapshotItem(dimension_code=code, state_code=r.state_code, derived_at=r.derived_at)
            )
    previous_date = max((p.derived_at for p in previous), default=None)
    return RadarHistoryOut(
        current=current,
        previous=previous or None,
        previous_date=previous_date,
    )


@router.post("/me/results/{dimension}/confirm", response_model=DimensionResultOut)
def confirm(
    dimension: DimensionCode,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DimensionResultOut:
    try:
        result = service.confirm_dimension(db, current_user, dimension)
    except service.AssessmentError as exc:
        raise _bad_request(exc) from exc
    return _result_out(result)


@router.post("/admin/users/{user_id}/reset-retake/{dimension}", status_code=status.HTTP_204_NO_CONTENT)
def reset_retake(
    user_id: UUID,
    dimension: DimensionCode,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "superadmin")),
) -> None:
    service.reset_retake(db, user_id, dimension)
