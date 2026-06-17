"""Pydantic v2 schemas para el catálogo (career paths + courses + progress)."""
from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class CareerPathOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    code: str  # "P1".."P6"
    name: str
    description: str | None
    order_index: int


class CourseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    career_path_id: UUID
    title: str
    slug: str
    description: str | None
    thumbnail_url: str | None
    hls_master_url: str | None
    duration_seconds: int
    career_level: str  # "L1".."L6"
    competency_code: str | None
    track: str
    is_active: bool


class CourseListResponse(BaseModel):
    items: list[CourseOut]
    total: int


class CourseProgressOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    last_position_seconds: int
    watch_pct: float
    is_completed: bool
    completed_at: datetime | None


class CourseDetailOut(CourseOut):
    """Curso + progreso del usuario actual (None si nunca lo abrió)."""

    progress: CourseProgressOut | None = None


class CourseProgressIn(BaseModel):
    position_seconds: int = Field(ge=0)
    watch_pct: float = Field(ge=0.0, le=100.0)
