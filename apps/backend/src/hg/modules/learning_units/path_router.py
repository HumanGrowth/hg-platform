"""Endpoint de "Mi Ruta" (cierre-beta TASK 1): GET /me/path."""
from __future__ import annotations

from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from hg.core.deps import get_current_user
from hg.db import get_db
from hg.modules.identity.models import User
from hg.modules.learning_units import path_engine

router = APIRouter()


class PathStepOut(BaseModel):
    unit_id: UUID
    slug: str
    title: str
    dimension_code: str
    career_path_code: str
    level_code: str
    pillar_code: str | None
    estimated_minutes: int | None


class PathMilestoneOut(BaseModel):
    """Hito de la ruta: dónde se cierra un área o un nivel y qué insignia da.
    ``after_unit_id`` es la unit de `next_step`/`upcoming` tras la cual va —
    solo sirve para interlinear en esa lista, y puede no estar entre las
    visibles. ``sequence_position`` (0-based, sobre la secuencia COMPLETA del
    nivel) es lo que hay que usar para ubicar el hito en la barra de progreso:
    no depende de cuántos pasos muestre `upcoming`."""

    kind: Literal["area", "level"]
    after_unit_id: UUID
    title: str
    dimension_code: str
    career_path_code: str
    pillar_code: str | None
    level_code: str | None
    badge_code: str
    badge_name: str
    badge_icon_url: str
    units_remaining: int
    requires_assessment: bool
    sequence_position: int


class DimensionProgressOut(BaseModel):
    career_path_code: str
    name: str
    completed: int
    total: int


class PathOut(BaseModel):
    current_level: str | None
    next_step: PathStepOut | None
    upcoming: list[PathStepOut]
    completed_this_level: int
    total_this_level: int
    dimensions_progress: list[DimensionProgressOut]
    milestones: list[PathMilestoneOut]


@router.get("/path", response_model=PathOut)
def get_my_path(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PathOut:
    r = path_engine.build_path(db, current_user.id)
    return PathOut(
        current_level=r.current_level,
        next_step=PathStepOut(**vars(r.next_step)) if r.next_step else None,
        upcoming=[PathStepOut(**vars(s)) for s in r.upcoming],
        completed_this_level=r.completed_this_level,
        total_this_level=r.total_this_level,
        dimensions_progress=[DimensionProgressOut(**vars(d)) for d in r.dimensions_progress],
        milestones=[PathMilestoneOut(**vars(m)) for m in r.milestones],
    )
