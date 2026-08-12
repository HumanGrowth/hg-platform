"""Pydantic v2 schemas del motor de assessment (B2-03)."""
from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel

from hg.modules.assessment.enums import DimensionCode


class AssessmentItemOptionOut(BaseModel):
    id: UUID
    order_index: int
    label: str
    value: int


class AssessmentItemOut(BaseModel):
    id: UUID
    item_code: str
    dimension_code: str
    sub_scale: str | None
    sub_domain: str | None
    response_type: str
    scale_min: int | None
    scale_max: int | None
    prompt: str
    order_index: int
    options: list[AssessmentItemOptionOut] | None = None


class SessionStartIn(BaseModel):
    kind: Literal["onboarding_short", "dimension_detail"]
    target_dimension: DimensionCode | None = None


class SessionOut(BaseModel):
    id: UUID
    kind: str
    target_dimension: str | None
    status: str
    started_at: datetime
    expires_at: datetime
    completed_at: datetime | None
    next_item: AssessmentItemOut | None
    total_items: int
    answered_items: int


class ResponseIn(BaseModel):
    item_id: UUID
    response_value: int
    qualitative_text: str | None = None
    response_time_ms: int | None = None


class DimensionResultOut(BaseModel):
    dimension_code: str
    source: str
    state_code: str
    state_label: str
    sub_scores: dict
    requires_user_confirmation: bool
    user_confirmed_at: datetime | None
    recaida_detected: bool
    suggested_next_step: str | None
    derived_at: datetime
    next_retake_eligible_at: datetime


class FinalizeOut(BaseModel):
    session_id: UUID
    results: list[DimensionResultOut]


class MeResultsOut(BaseModel):
    results: list[DimensionResultOut]


class RadarSnapshotItem(BaseModel):
    """Estado de un pilar en un punto del tiempo (para el radar · TASK 6.3)."""

    dimension_code: str
    state_code: str
    derived_at: datetime


class RadarHistoryOut(BaseModel):
    """Radar actual + evaluación anterior (overlay histórico · TASK 6.3).

    `current` = último DimensionResult por pilar; `previous` = anteúltimo por pilar
    (sólo los pilares con ≥2 evaluaciones); `previous_date` = fecha más reciente
    del set anterior. `previous`/`previous_date` en null si no hay evolución.
    """

    current: list[RadarSnapshotItem]
    previous: list[RadarSnapshotItem] | None
    previous_date: datetime | None
