"""Schemas de badges."""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class MyBadgeOut(BaseModel):
    """Badge del catálogo + estado de desbloqueo del usuario."""

    code: str
    name: str
    description: str
    icon_url: str
    unlock_hint: str
    unlocked: bool
    unlocked_at: datetime | None


# ─────────────────────────── Progresión por dimensión (TASK 6) ───────────────────────────


class LevelProgressOut(BaseModel):
    level_code: str
    name: str
    completion_pct: float
    unlock_threshold: int
    earned: bool


class DimensionProgressionOut(BaseModel):
    """Progreso del usuario en una dimensión: nivel actual (completion 0-100 =
    mezcla aprendizaje+assessment) + todos sus niveles."""

    dimension_code: str
    current_level_code: str | None
    current_level_name: str | None
    current_completion_pct: float
    current_unlock_threshold: int
    levels: list[LevelProgressOut]
