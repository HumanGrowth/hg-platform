"""Schemas de badges."""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field, model_validator


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


# ─────────────────────────── Pesos del score (FASE 1.4) ───────────────────────────


class DimensionScoringConfigOut(BaseModel):
    dimension_code: str
    learning_weight: float
    assessment_weight: float
    manager_weight: float


class UpdateScoringWeightsRequest(BaseModel):
    learning_weight: float = Field(ge=0)
    assessment_weight: float = Field(ge=0)
    manager_weight: float = Field(ge=0)

    @model_validator(mode="after")
    def _weights_must_sum_positive(self) -> UpdateScoringWeightsRequest:
        if self.learning_weight + self.assessment_weight + self.manager_weight <= 0:
            raise ValueError("la suma de los 3 pesos debe ser > 0")
        return self


class RecomputeResultOut(BaseModel):
    dimension_codes: list[str]
    users_recomputed: int
