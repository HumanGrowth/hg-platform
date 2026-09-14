"""Schemas de la matriz de comportamientos / evaluación del manager (FASE 1.2)."""
from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class BehaviorOut(BaseModel):
    behavior_id: UUID
    text: str
    order_index: int
    rating: int | None
    updated_at: datetime | None
    evaluated_by_name: str | None


class PillarBehaviorsOut(BaseModel):
    pillar_code: str
    pillar_name: str
    is_current: bool
    behaviors: list[BehaviorOut]


class BehaviorMatrixOut(BaseModel):
    dimension_code: str
    dimension_name: str
    current_pillar_code: str | None
    pillars: list[PillarBehaviorsOut]
    # Aporte al score (lee los pesos reales, el front no hardcodea nada).
    manager_pct: float | None
    manager_weight: float
    learning_weight: float
    assessment_weight: float


class BehaviorEvaluationIn(BaseModel):
    behavior_id: UUID
    rating: int = Field(ge=1, le=3)
    note: str | None = Field(default=None, max_length=2000)


class UpsertBehaviorEvaluationsRequest(BaseModel):
    evaluations: list[BehaviorEvaluationIn] = Field(min_length=1, max_length=100)


class MyBehaviorEvaluationOut(BaseModel):
    behavior_id: UUID
    dimension_code: str
    pillar_code: str
    text: str
    rating: int
    updated_at: datetime
