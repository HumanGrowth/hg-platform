"""Pydantic v2 schemas para Manager & RRHH (B4-A)."""
from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from hg.modules.learning.schemas import EnrollmentOut


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


class CourseProgressDetailOut(BaseModel):
    course_slug: str
    course_title: str
    career_level: str
    competency_code: str | None
    watch_pct: float
    is_completed: bool
    last_played_at: datetime


class TeamMemberDetailOut(TeamMemberOut):
    enrollments: list[EnrollmentOut]
    courses_in_progress_list: list[CourseProgressDetailOut]  # top 10 recientes
    courses_completed_list: list[CourseProgressDetailOut]  # top 10 recientes
    pillar_completion_rate: dict[str, float]  # {"P1": 0.25, ...}
