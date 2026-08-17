"""Endpoint de "Mi Ruta" (cierre-beta TASK 1): GET /me/path."""
from __future__ import annotations

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
    )
