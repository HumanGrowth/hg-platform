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
    # Ya NO pondera el score (ver badges/progression._manager_approved) — es
    # un gate: `manager_approved` = true cuando TODOS los comportamientos
    # activos de la dimensión están en "Demostrando", condición (junto con el
    # completion de aprendizaje+assessment) para que se otorgue el badge de
    # nivel. `manager_pct` queda de referencia (promedio 0-100 de lo
    # calificado), no determina nada por sí solo.
    manager_pct: float | None
    manager_approved: bool


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


PILLAR_FEEDBACK_MAX_CHARS = 2000


class UpsertPillarFeedbackRequest(BaseModel):
    dimension_code: str = Field(min_length=1, max_length=4)
    pillar_code: str = Field(min_length=1, max_length=8)
    text: str = Field(min_length=1, max_length=PILLAR_FEEDBACK_MAX_CHARS)


class PillarFeedbackOut(BaseModel):
    pillar_code: str
    dimension_code: str
    text: str
    updated_at: datetime
    manager_name: str | None
