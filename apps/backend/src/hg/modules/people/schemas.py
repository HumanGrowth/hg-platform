"""Pydantic v2 schemas para Manager & RRHH (B4-A)."""
from __future__ import annotations

from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from hg.modules.learning.schemas import EnrollmentOut


class AssessmentStateSnapshotOut(BaseModel):
    state: str
    state_label: str
    source: str


class UserMetricsOut(BaseModel):
    """Métricas canónicas de un usuario (Release TASK 2) — misma fuente para el
    colaborador (/me/metrics) y el manager (/team/[id])."""

    courses_completed: int
    courses_in_progress: int
    total_watch_minutes: int
    last_assessment_date: datetime | None
    badges_unlocked_count: int
    assessment_states: dict[str, AssessmentStateSnapshotOut]
    dimension_completion_rate: dict[str, float]

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
    dimension_completion_rate: dict[str, float]  # {"P1": 0.25, ...}
    # Estados del assessment (snapshot de UserLearningProfile.dimension_states). El
    # manager ve estados/vías, NUNCA respuestas item-by-item (privacidad B2-03).
    assessment_states: dict  # {"P1": {"state":"L3","state_label":...,"source":...}, ...}


class DimensionMetric(BaseModel):
    completion_rate: float
    active_users: int
    total_courses_started: int


class TopPerformerOut(BaseModel):
    user_id: UUID
    full_name: str
    courses_completed: int


class OrgBreakdownOut(BaseModel):
    """Fila de la comparativa por organización (cuando el scope es una empresa)."""

    org_id: UUID
    org_name: str
    total_users: int
    active_users: int  # last_active en últimos 30d
    adoption_rate: float
    completion_rate: float
    inactive_users: int  # > umbral de inactividad (21d)


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
    by_dimension: dict[str, DimensionMetric]
    by_career_level: dict[str, int]
    # Top + inactivos
    top_performers: list[TopPerformerOut]
    inactive_users_count: int
    # Distribución de inactividad por buckets (alineada a 21d).
    inactivity: InactivityBuckets
    # Comparativa por organización (solo cuando el scope abarca varias orgs).
    by_org: list[OrgBreakdownOut]


# ─────────────── Home colaborador (B3-04) ───────────────


class NextStepOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    course_id: UUID
    course_slug: str
    course_title: str
    dimension_code: str  # "P1".."P6"
    career_level: str  # "L1".."L6"
    duration_seconds: int
    watch_pct: float
    last_played_at: datetime


class RecentActivityItem(BaseModel):
    course_id: UUID
    course_slug: str
    course_title: str
    dimension_code: str
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
    dimension_completion_rates: dict[str, float]  # {"P1": 0.33, ...}
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
    # Alineado al umbral de inactividad de 21 dias (ago-2026).
    active_7d: int  # 0-7 dias
    d8_21: int  # 8-21 dias (aun activo bajo el umbral)
    d22_30: int  # 22-30 dias
    gt_30: int  # mas de 30 dias
    never_active: int  # nunca activo


# OrgMetricsOut referencia InactivityBuckets (definido acá abajo) por forward ref.
OrgMetricsOut.model_rebuild()


class TeamOrgComparison(BaseModel):
    """Comparativa del equipo del manager vs el promedio de su organización."""

    team_size: int
    org_size: int
    team_adoption: float  # activos 30d / total
    org_adoption: float
    team_avg_completed: float  # promedio de módulos completados por persona
    org_avg_completed: float


class ManagerWidgetsOut(BaseModel):
    team_activity: list[TeamActivityCell]  # 30 días x N reportes (solo cells >0)
    inactivity_buckets: InactivityBuckets
    comparison: TeamOrgComparison | None = None


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
