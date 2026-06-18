"""Pydantic v2 schemas para Manager & RRHH (B4-A)."""
from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class TeamMemberOut(BaseModel):
    id: UUID
    full_name: str
    email: str
    role: str
    career_level: str | None
    job_title: str | None
    last_active_at: datetime | None
    is_inactive: bool
    courses_in_progress: int
    courses_completed: int
    total_watch_minutes: int
    active_enrollments: int


class TeamResponse(BaseModel):
    items: list[TeamMemberOut]
    total: int
    inactive_count: int
