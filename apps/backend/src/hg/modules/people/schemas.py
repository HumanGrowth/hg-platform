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


class PillarMetric(BaseModel):
    completion_rate: float
    active_users: int
    total_courses_started: int


class TopPerformerOut(BaseModel):
    user_id: UUID
    full_name: str
    courses_completed: int


class OrgMetricsOut(BaseModel):
    # Adopción
    total_licenses: int
    active_licenses: int  # users con last_active en últimos 30d
    adoption_rate: float
    # Engagement
    avg_watch_minutes_per_user: float
    total_courses_completed: int
    completion_rate_global: float  # completados / iniciados
    # Por pilar / nivel
    by_pillar: dict[str, PillarMetric]
    by_career_level: dict[str, int]
    # Top + inactivos
    top_performers: list[TopPerformerOut]
    inactive_users_count: int
