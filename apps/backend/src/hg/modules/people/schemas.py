"""Pydantic v2 schemas para Manager & RRHH (B4-A)."""
from __future__ import annotations

from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

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


# ─────────────── Home colaborador (B3-04) ───────────────


class NextStepOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    course_id: UUID
    course_slug: str
    course_title: str
    pillar_code: str  # "P1".."P6"
    career_level: str  # "L1".."L6"
    duration_seconds: int
    watch_pct: float
    last_played_at: datetime


class RecentActivityItem(BaseModel):
    course_id: UUID
    course_slug: str
    course_title: str
    pillar_code: str
    is_completed: bool
    last_played_at: datetime
    completed_at: datetime | None


class HomeStats(BaseModel):
    courses_in_progress: int
    courses_completed: int
    total_watch_minutes: int
    month_watch_minutes: int
    streak_days: int


class HomeDashboardOut(BaseModel):
    next_step: NextStepOut | None
    active_enrollments: list[EnrollmentOut]
    pillar_completion_rates: dict[str, float]  # {"P1": 0.33, ...}
    recent_activity: list[RecentActivityItem]
    stats: HomeStats


# ─────────────── Widgets dashboard v1 (B4-E) ───────────────


class StreakDay(BaseModel):
    date: date  # ISO YYYY-MM-DD
    minutes: int
    has_activity: bool


class WeeklyMinutesBar(BaseModel):
    week_start: date  # lunes de la semana
    minutes: int


class MeWidgetsOut(BaseModel):
    streak: list[StreakDay]  # 90 días, oldest first
    weekly_minutes: list[WeeklyMinutesBar]  # 12 semanas, oldest first


class TeamActivityCell(BaseModel):
    user_id: UUID
    user_full_name: str
    date: date
    minutes: int


class InactivityBuckets(BaseModel):
    active: int  # last_active >= now - 1d
    inactive_1_7d: int
    inactive_8_14d: int
    inactive_15_30d: int
    inactive_gt_30d: int
    never_active: int  # last_active IS NULL


class ManagerWidgetsOut(BaseModel):
    team_activity: list[TeamActivityCell]  # 30 días x N reportes (solo cells >0)
    inactivity_buckets: InactivityBuckets


class AdoptionMonthPoint(BaseModel):
    month: str  # "YYYY-MM"
    active_users: int


class OnboardingFunnel(BaseModel):
    invited: int
    accepted: int
    first_login: int
    first_course: int
    first_completion: int


class MonthlyWatchPoint(BaseModel):
    month: str  # "YYYY-MM"
    minutes: int


class OrgWidgetsOut(BaseModel):
    adoption_curve: list[AdoptionMonthPoint]  # 12 meses oldest first
    onboarding_funnel: OnboardingFunnel
    monthly_watch: list[MonthlyWatchPoint]  # 12 meses oldest first
