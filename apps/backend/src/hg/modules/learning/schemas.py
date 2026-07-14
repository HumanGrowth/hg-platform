"""Pydantic v2 schemas para el catálogo (career paths + events + progress).

``Event*`` reemplaza a ``Course*`` (TASK A-07). ``CourseProgressIn``/
``CourseProgressOut`` quedan como están a propósito — ver
``hg.modules.learning.models`` para el porqué.
"""
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


class EventOut(BaseModel):
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
    event_type: str
    is_preview: bool
    presenter_id: UUID | None
    scheduled_at: datetime | None


class EventListResponse(BaseModel):
    items: list[EventOut]
    total: int


class CourseProgressOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    last_position_seconds: int
    watch_pct: float
    is_completed: bool
    completed_at: datetime | None


class EventDetailOut(EventOut):
    """Event + progreso del usuario actual (None si nunca lo abrió)."""

    progress: CourseProgressOut | None = None
    pillar_code: str | None = None  # código del path (P1..P6) para la metadata del player


class NextEventOut(BaseModel):
    """Siguiente event del path (o null si es el último)."""

    next: EventOut | None = None


class CourseProgressIn(BaseModel):
    position_seconds: int = Field(ge=0)
    watch_pct: float = Field(ge=0.0, le=100.0)


class EnrollmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    career_path_id: UUID
    career_path_code: str  # P1..P6 (denormalizado)
    career_path_name: str
    assigned_by_user_id: UUID | None
    assigned_by_name: str | None  # NULL si auto / asignador borrado
    source: str
    is_active: bool
    enrolled_at: datetime
    completed_at: datetime | None


class EnrollmentIn(BaseModel):
    career_path_code: str  # P1..P6 — más usable que pasar UUID
