"""Pydantic v2 schemas del motor de assessment (B2-03)."""
from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel

from hg.modules.assessment.enums import PillarCode


class AssessmentItemOptionOut(BaseModel):
    id: UUID
    order_index: int
    label: str
    value: int


class AssessmentItemOut(BaseModel):
    id: UUID
    item_code: str
    pillar_code: str
    sub_scale: str | None
    sub_domain: str | None
    response_type: str
    scale_min: int | None
    scale_max: int | None
    prompt: str
    order_index: int
    options: list[AssessmentItemOptionOut] | None = None


class SessionStartIn(BaseModel):
    kind: Literal["onboarding_short", "pillar_detail"]
    target_pillar: PillarCode | None = None


class SessionOut(BaseModel):
    id: UUID
    kind: str
    target_pillar: str | None
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


class PillarResultOut(BaseModel):
    pillar_code: str
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
    results: list[PillarResultOut]


class MeResultsOut(BaseModel):
    results: list[PillarResultOut]
