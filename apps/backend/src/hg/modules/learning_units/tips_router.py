"""Plan de Acción — tips guardados del usuario (cierre-beta TASK 5).

Endpoints /me/tips (CRUD + reorder) + /me/plan-accion/ai-summary (sugerencias
AI detrás de un feature flag). Todo scoped al usuario del token (RLS por org +
filtro user_id explícito). Usa flush() (regla del P0 #57).
"""
from __future__ import annotations

from datetime import UTC, datetime
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, Field
from sqlalchemy import delete as sa_delete
from sqlalchemy import select
from sqlalchemy.orm import Session

from hg.config import get_settings
from hg.core.deps import get_current_user
from hg.db import get_db
from hg.modules.identity.models import User
from hg.modules.learning_units.models import SAVED_TIP_SOURCES, LearningUnit, SavedTip

router = APIRouter()


class SaveTipRequest(BaseModel):
    tip_text: str = Field(min_length=1, max_length=2000)
    source: Literal["solution", "reflection", "custom"] = "custom"
    unit_id: UUID | None = None
    block_id: UUID | None = None
    dimension_code: str | None = Field(default=None, max_length=10)


class UpdateTipRequest(BaseModel):
    is_completed: bool | None = None
    order_index: int | None = None


class ReorderItem(BaseModel):
    id: UUID
    order_index: int


class TipOut(BaseModel):
    id: UUID
    tip_text: str
    source: str
    learning_unit_id: UUID | None
    unit_slug: str | None
    unit_title: str | None
    block_id: UUID | None
    dimension_code: str | None
    is_completed: bool
    completed_at: datetime | None
    order_index: int
    saved_at: datetime


def _serialize(db: Session, tips: list[SavedTip]) -> list[TipOut]:
    unit_ids = {t.learning_unit_id for t in tips if t.learning_unit_id}
    units = {
        u.id: u for u in db.scalars(select(LearningUnit).where(LearningUnit.id.in_(unit_ids))).all()
    } if unit_ids else {}
    out = []
    for t in tips:
        u = units.get(t.learning_unit_id) if t.learning_unit_id else None
        out.append(TipOut(
            id=t.id, tip_text=t.tip_text, source=t.source, learning_unit_id=t.learning_unit_id,
            unit_slug=u.slug if u else None, unit_title=u.title if u else None, block_id=t.block_id,
            dimension_code=t.dimension_code, is_completed=t.is_completed, completed_at=t.completed_at,
            order_index=t.order_index, saved_at=t.saved_at,
        ))
    return out


def _own_tip_or_404(db: Session, tip_id: UUID, user: User) -> SavedTip:
    t = db.get(SavedTip, tip_id)  # RLS limita a la org; validamos user abajo
    if t is None or t.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="tip not found")
    return t


@router.post("/tips", response_model=TipOut, status_code=status.HTTP_201_CREATED)
def save_tip(
    body: SaveTipRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> TipOut:
    if body.source not in SAVED_TIP_SOURCES:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="invalid source")
    tip = SavedTip(
        org_id=user.org_id, user_id=user.id, tip_text=body.tip_text.strip(), source=body.source,
        learning_unit_id=body.unit_id, block_id=body.block_id, dimension_code=body.dimension_code,
    )
    db.add(tip)
    db.flush()
    db.refresh(tip)
    return _serialize(db, [tip])[0]


@router.get("/tips", response_model=list[TipOut])
def list_tips(
    dimension: str | None = None,
    completed: bool | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[TipOut]:
    conds = [SavedTip.user_id == user.id]
    if dimension:
        conds.append(SavedTip.dimension_code == dimension)
    if completed is not None:
        conds.append(SavedTip.is_completed.is_(completed))
    rows = list(
        db.scalars(
            select(SavedTip).where(*conds).order_by(SavedTip.order_index.asc(), SavedTip.saved_at.desc())
        ).all()
    )
    return _serialize(db, rows)


@router.patch("/tips/{tip_id}", response_model=TipOut)
def update_tip(
    tip_id: UUID,
    body: UpdateTipRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> TipOut:
    tip = _own_tip_or_404(db, tip_id, user)
    if body.is_completed is not None:
        tip.is_completed = body.is_completed
        tip.completed_at = datetime.now(UTC) if body.is_completed else None
    if body.order_index is not None:
        tip.order_index = body.order_index
    db.flush()
    db.refresh(tip)
    return _serialize(db, [tip])[0]


@router.delete("/tips/{tip_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tip(
    tip_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Response:
    tip = _own_tip_or_404(db, tip_id, user)
    db.execute(sa_delete(SavedTip).where(SavedTip.id == tip.id))
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/tips/reorder", response_model=list[TipOut])
def reorder_tips(
    items: list[ReorderItem],
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[TipOut]:
    ids = [i.id for i in items]
    owned = {
        t.id: t for t in db.scalars(
            select(SavedTip).where(SavedTip.user_id == user.id, SavedTip.id.in_(ids))
        ).all()
    }
    for i in items:
        t = owned.get(i.id)
        if t is not None:
            t.order_index = i.order_index
    db.flush()
    rows = list(
        db.scalars(
            select(SavedTip).where(SavedTip.user_id == user.id)
            .order_by(SavedTip.order_index.asc(), SavedTip.saved_at.desc())
        ).all()
    )
    return _serialize(db, rows)


# ─────────────────────────── AI (5.4) ───────────────────────────


class AiSummaryOut(BaseModel):
    enabled: bool
    suggestions: list[str]
    generated_at: datetime | None = None


@router.post("/plan-accion/ai-summary", response_model=AiSummaryOut)
def ai_summary(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> AiSummaryOut:
    """Sugerencias AI a partir de los tips. Detrás del flag
    `ai_recommendations_enabled` (default off → el front muestra AISoonBadge).
    La integración real con el LLM se conecta cuando Andy confirme el presupuesto."""
    if not get_settings().ai_recommendations_enabled:
        return AiSummaryOut(enabled=False, suggestions=[])
    # TODO(Andrés): conectar el LLM (usa los últimos 20 tips no completados del
    # user). Por ahora, con el flag on, devolvemos vacío hasta cablear el proveedor.
    return AiSummaryOut(enabled=True, suggestions=[], generated_at=datetime.now(UTC))
