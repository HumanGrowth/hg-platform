"""Pydantic v2 schemas para el catálogo (career paths + courses)."""
from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, ConfigDict


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
