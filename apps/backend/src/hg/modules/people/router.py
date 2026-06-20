"""Manager & RRHH routers (B4-A). Agregaciones on-demand (ADR-0009).

- ``manager_router`` (prefix /manager): vista de equipo del manager.
- ``admin_router`` (prefix /admin): métricas de org para RRHH (TASK 06).
"""
from __future__ import annotations

import csv
import io
from collections import Counter
from datetime import timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from hg.core.deps import get_current_user, get_db_as_superadmin, require_role
from hg.db import get_db
from hg.modules.identity.models import User, UserRole
from hg.modules.learning import enrollments_service
from hg.modules.learning.enrollments_service import InvalidPathCodeError
from hg.modules.learning.models import CareerPath, Course, CourseProgress, Enrollment
from hg.modules.learning.schemas import EnrollmentIn, EnrollmentOut
from hg.modules.people import service
from hg.modules.people.schemas import (
    AdoptionMonthPoint,
    CourseProgressDetailOut,
    HomeDashboardOut,
    HomeStats,
    InactivityBuckets,
    ManagerWidgetsOut,
    MeWidgetsOut,
    MonthlyWatchPoint,
    NextStepOut,
    OnboardingFunnel,
    OrgMetricsOut,
    OrgWidgetsOut,
    PillarMetric,
    RecentActivityItem,
    StreakDay,
    TeamActivityCell,
    TeamMemberDetailOut,
    TeamMemberOut,
    TeamResponse,
    TopPerformerOut,
    WeeklyMinutesBar,
)
from hg.modules.people.service import (
    ACTIVE_WINDOW_DAYS,
    ActivityAgg,
    activity_by_users,
    now_utc,
    org_pillar_metrics,
    pillar_completion_rate,
    streak_days,
)

manager_router = APIRouter()
admin_router = APIRouter()
me_router = APIRouter()

_ADMIN_ROLES = (UserRole.admin, UserRole.superadmin)


def _member_out(user: User, agg: ActivityAgg) -> TeamMemberOut:
    return TeamMemberOut(
        id=user.id,
        full_name=user.full_name,
        email=user.email,
        role=user.role.value,
        career_level=user.career_level.value if user.career_level else None,
        job_title=user.job_title,
        last_active_at=agg.last_active_at,
        is_inactive=agg.is_inactive,
        courses_in_progress=agg.courses_in_progress,
        courses_completed=agg.courses_completed,
        total_watch_minutes=agg.total_watch_minutes,
        active_enrollments=agg.active_enrollments,
    )


def _authorize_target(db: Session, current_user: User, user_id: UUID) -> User:
    """El target debe estar en la org (RLS) y ser reporte directo, salvo
    admin/superadmin. 404 si no existe o no es visible para el usuario."""
    target = db.get(User, user_id)
    if target is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="user not found")
    if current_user.role in _ADMIN_ROLES or target.manager_id == current_user.id:
        return target
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="user not found")


def _enrollment_out(db: Session, e: Enrollment) -> EnrollmentOut:
    path = db.get(CareerPath, e.career_path_id)
    assigner = db.get(User, e.assigned_by_user_id) if e.assigned_by_user_id else None
    return EnrollmentOut(
        id=e.id,
        user_id=e.user_id,
        career_path_id=e.career_path_id,
        career_path_code=path.code if path else "?",
        career_path_name=path.name if path else "?",
        assigned_by_user_id=e.assigned_by_user_id,
        assigned_by_name=assigner.full_name if assigner else None,
        source=e.source,
        is_active=e.is_active,
        enrolled_at=e.enrolled_at,
        completed_at=e.completed_at,
    )


def _team_members(db: Session, current_user: User) -> list[User]:
    """Reportes que el usuario puede ver. Admin/superadmin → toda la org;
    cualquier otro → sus reportes directos (lista vacía si no tiene)."""
    if current_user.role in _ADMIN_ROLES:
        return list(db.scalars(select(User).where(User.id != current_user.id)).all())
    return list(db.scalars(select(User).where(User.manager_id == current_user.id)).all())


@manager_router.get("/me/team", response_model=TeamResponse)
def list_my_team(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    sort: str = Query("name", pattern="^(name|last_active|completion)$"),
    inactive_only: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TeamResponse:
    members = _team_members(db, current_user)
    aggs = activity_by_users(db, [m.id for m in members])
    rows = [_member_out(m, aggs[m.id]) for m in members]

    inactive_count = sum(1 for r in rows if r.is_inactive)
    if inactive_only:
        rows = [r for r in rows if r.is_inactive]

    if sort == "name":
        rows.sort(key=lambda r: r.full_name.lower())
    elif sort == "completion":
        rows.sort(key=lambda r: r.courses_completed, reverse=True)
    elif sort == "last_active":  # DESC NULLS LAST
        have = sorted(
            (r for r in rows if r.last_active_at is not None),
            key=lambda r: r.last_active_at,  # type: ignore[arg-type, return-value]
            reverse=True,
        )
        rows = [*have, *(r for r in rows if r.last_active_at is None)]

    total = len(rows)
    start = (page - 1) * page_size
    paged = rows[start : start + page_size]
    return TeamResponse(items=paged, total=total, inactive_count=inactive_count)


def _course_progress_list(
    db: Session, user_id: UUID, *, completed: bool, limit: int = 10
) -> list[CourseProgressDetailOut]:
    rows = db.execute(
        select(CourseProgress, Course)
        .join(Course, Course.id == CourseProgress.course_id)
        .where(
            CourseProgress.user_id == user_id,
            CourseProgress.is_completed.is_(completed),
            *([] if completed else [CourseProgress.watch_pct > 0]),
        )
        .order_by(CourseProgress.last_played_at.desc())
        .limit(limit)
    ).all()
    return [
        CourseProgressDetailOut(
            course_slug=c.slug,
            course_title=c.title,
            career_level=c.career_level.value,
            competency_code=c.competency_code.value if c.competency_code else None,
            watch_pct=cp.watch_pct,
            is_completed=cp.is_completed,
            last_played_at=cp.last_played_at,
        )
        for cp, c in rows
    ]


@manager_router.get("/users/{user_id}/detail", response_model=TeamMemberDetailOut)
def get_user_detail(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TeamMemberDetailOut:
    target = _authorize_target(db, current_user, user_id)
    agg = activity_by_users(db, [target.id])[target.id]
    base = _member_out(target, agg)
    enrollments = enrollments_service.list_user_enrollments(
        db, user_id=target.id, active_only=False
    )
    return TeamMemberDetailOut(
        **base.model_dump(),
        enrollments=[_enrollment_out(db, e) for e in enrollments],
        courses_in_progress_list=_course_progress_list(db, target.id, completed=False),
        courses_completed_list=_course_progress_list(db, target.id, completed=True),
        pillar_completion_rate=pillar_completion_rate(db, target.id),
    )


@manager_router.post(
    "/users/{user_id}/enroll", response_model=EnrollmentOut, status_code=status.HTTP_201_CREATED
)
def assign_path_to_user(
    user_id: UUID,
    payload: EnrollmentIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> EnrollmentOut:
    target = _authorize_target(db, current_user, user_id)
    try:
        enrollment = enrollments_service.enroll_user_in_path(
            db,
            org_id=target.org_id,
            target_user_id=target.id,
            career_path_code=payload.career_path_code,
            assigned_by_user_id=current_user.id,
        )
    except InvalidPathCodeError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="invalid career_path_code"
        ) from exc
    return _enrollment_out(db, enrollment)


@manager_router.delete("/users/{user_id}/enroll/{path_code}", status_code=status.HTTP_204_NO_CONTENT)
def unassign_path_from_user(
    user_id: UUID,
    path_code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    target = _authorize_target(db, current_user, user_id)
    try:
        enrollments_service.unenroll_user_from_path(
            db, org_id=target.org_id, target_user_id=target.id, career_path_code=path_code
        )
    except InvalidPathCodeError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="invalid career_path_code"
        ) from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ─────────────────────────── RRHH / Org metrics ───────────────────────────
# Corren bajo hg_superadmin (BYPASSRLS) con filtro explícito por org, para que
# superadmin pueda inspeccionar cualquier org via ?org_id=. Admin → su propia org.

_CSV_HEADERS = [
    "email", "full_name", "role", "manager_email", "career_level",
    "active_enrollments", "courses_in_progress", "courses_completed",
    "last_active_at", "total_watch_minutes",
]


def _resolve_org(current_user: User, org_id: UUID | None) -> UUID:
    if current_user.role == UserRole.superadmin and org_id is not None:
        return org_id
    return current_user.org_id


@admin_router.get("/org/metrics", response_model=OrgMetricsOut)
def org_metrics(
    org_id: UUID | None = Query(None, description="solo superadmin"),
    db: Session = Depends(get_db_as_superadmin),
    current_user: User = Depends(require_role("admin", "superadmin")),
) -> OrgMetricsOut:
    target_org = _resolve_org(current_user, org_id)
    users = list(db.scalars(select(User).where(User.org_id == target_org)).all())
    uids = [u.id for u in users]
    aggs = activity_by_users(db, uids)
    total = len(users)
    cutoff30 = now_utc() - timedelta(days=ACTIVE_WINDOW_DAYS)

    active = sum(
        1
        for u in users
        if (la := aggs[u.id].last_active_at) is not None and la >= cutoff30
    )
    inactive = sum(1 for u in users if aggs[u.id].is_inactive)
    total_completed = sum(aggs[u.id].courses_completed for u in users)
    total_started = sum(
        aggs[u.id].courses_in_progress + aggs[u.id].courses_completed for u in users
    )
    total_watch = sum(aggs[u.id].total_watch_minutes for u in users)

    pillar_raw = org_pillar_metrics(db, uids)
    by_pillar: dict[str, PillarMetric] = {}
    for path in db.scalars(select(CareerPath).order_by(CareerPath.order_index)).all():
        started, completed, active_u = pillar_raw.get(path.id, (0, 0, 0))
        by_pillar[path.code] = PillarMetric(
            completion_rate=round(completed / started, 4) if started else 0.0,
            active_users=active_u,
            total_courses_started=started,
        )

    by_level = Counter(u.career_level.value for u in users if u.career_level)
    top = sorted(users, key=lambda u: aggs[u.id].courses_completed, reverse=True)
    top_performers = [
        TopPerformerOut(user_id=u.id, full_name=u.full_name, courses_completed=aggs[u.id].courses_completed)
        for u in top[:5]
        if aggs[u.id].courses_completed > 0
    ]

    return OrgMetricsOut(
        total_licenses=total,
        active_licenses=active,
        adoption_rate=round(active / total, 4) if total else 0.0,
        avg_watch_minutes_per_user=round(total_watch / total, 2) if total else 0.0,
        total_courses_completed=total_completed,
        completion_rate_global=round(total_completed / total_started, 4) if total_started else 0.0,
        by_pillar=by_pillar,
        by_career_level=dict(by_level),
        top_performers=top_performers,
        inactive_users_count=inactive,
    )


@admin_router.get("/org/users/export.csv")
def export_users_csv(
    org_id: UUID | None = Query(None, description="solo superadmin"),
    db: Session = Depends(get_db_as_superadmin),
    current_user: User = Depends(require_role("admin", "superadmin")),
) -> Response:
    target_org = _resolve_org(current_user, org_id)
    users = list(db.scalars(select(User).where(User.org_id == target_org)).all())
    aggs = activity_by_users(db, [u.id for u in users])
    by_id = {u.id: u for u in users}

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(_CSV_HEADERS)
    for u in users:
        mgr = by_id.get(u.manager_id) if u.manager_id else None
        a = aggs[u.id]
        writer.writerow([
            u.email, u.full_name, u.role.value,
            mgr.email if mgr else "",
            u.career_level.value if u.career_level else "",
            a.active_enrollments, a.courses_in_progress, a.courses_completed,
            a.last_active_at.isoformat() if a.last_active_at else "",
            a.total_watch_minutes,
        ])
    return Response(
        content=buf.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=users.csv"},
    )


# ─────────────────────────── Home colaborador (B3-04) ───────────────────────────
# /api/v1/me/home — dashboard agregado del usuario autenticado (solo su data, RLS).


@me_router.get("/home", response_model=HomeDashboardOut)
def get_my_home_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> HomeDashboardOut:
    uid = current_user.id

    # next_step: curso en progreso (no completado, <80%) jugado más recientemente.
    ns = db.execute(
        select(CourseProgress, Course, CareerPath)
        .join(Course, Course.id == CourseProgress.course_id)
        .join(CareerPath, CareerPath.id == Course.career_path_id)
        .where(
            CourseProgress.user_id == uid,
            CourseProgress.is_completed.is_(False),
            CourseProgress.watch_pct < 80,
        )
        .order_by(CourseProgress.last_played_at.desc())
        .limit(1)
    ).first()
    next_step = (
        NextStepOut(
            course_id=ns[1].id,
            course_slug=ns[1].slug,
            course_title=ns[1].title,
            pillar_code=ns[2].code,
            career_level=ns[1].career_level.value,
            duration_seconds=ns[1].duration_seconds,
            watch_pct=ns[0].watch_pct,
            last_played_at=ns[0].last_played_at,
        )
        if ns
        else None
    )

    # recent_activity: últimos 5 eventos (completados + en progreso).
    recent_rows = db.execute(
        select(CourseProgress, Course, CareerPath)
        .join(Course, Course.id == CourseProgress.course_id)
        .join(CareerPath, CareerPath.id == Course.career_path_id)
        .where(CourseProgress.user_id == uid)
        .order_by(CourseProgress.last_played_at.desc())
        .limit(5)
    ).all()
    recent_activity = [
        RecentActivityItem(
            course_id=c.id,
            course_slug=c.slug,
            course_title=c.title,
            pillar_code=p.code,
            is_completed=cp.is_completed,
            last_played_at=cp.last_played_at,
            completed_at=cp.completed_at,
        )
        for cp, c, p in recent_rows
    ]

    # stats
    agg = activity_by_users(db, [uid])[uid]
    now = now_utc()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    month_sec = (
        db.scalar(
            select(func.coalesce(func.sum(CourseProgress.last_position_seconds), 0)).where(
                CourseProgress.user_id == uid, CourseProgress.last_played_at >= month_start
            )
        )
        or 0
    )
    played_dates = {
        d.date()
        for d in db.scalars(
            select(CourseProgress.last_played_at).where(CourseProgress.user_id == uid)
        ).all()
    }
    stats = HomeStats(
        courses_in_progress=agg.courses_in_progress,
        courses_completed=agg.courses_completed,
        total_watch_minutes=agg.total_watch_minutes,
        month_watch_minutes=int(month_sec) // 60,
        streak_days=streak_days(played_dates, now.date()),
    )

    enrollments = enrollments_service.list_user_enrollments(db, user_id=uid, active_only=True)
    return HomeDashboardOut(
        next_step=next_step,
        active_enrollments=[_enrollment_out(db, e) for e in enrollments],
        pillar_completion_rates=pillar_completion_rate(db, uid),
        recent_activity=recent_activity,
        stats=stats,
    )


# ─────────────────────────── Widgets dashboard v1 (B4-E) ───────────────────────────
# 3 endpoints densos multi-widget (1 round-trip por página). Cache HTTP 60s. ADR-0011.

_WIDGET_CACHE = "private, max-age=60"


@me_router.get("/widgets", response_model=MeWidgetsOut)
def get_my_widgets(
    response: Response,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MeWidgetsOut:
    response.headers["Cache-Control"] = _WIDGET_CACHE
    today = now_utc().date()
    streak = [
        StreakDay(date=d, minutes=m, has_activity=m > 0)
        for d, m in service.streak_heatmap(db, current_user.id, today)
    ]
    weekly = [
        WeeklyMinutesBar(week_start=wk, minutes=m)
        for wk, m in service.weekly_minutes(db, current_user.id, today)
    ]
    return MeWidgetsOut(streak=streak, weekly_minutes=weekly)


@manager_router.get("/me/widgets", response_model=ManagerWidgetsOut)
def get_manager_widgets(
    response: Response,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ManagerWidgetsOut:
    response.headers["Cache-Control"] = _WIDGET_CACHE
    members = _team_members(db, current_user)
    names = {m.id: m.full_name for m in members}
    member_ids = list(names)
    today = now_utc().date()
    cells = [
        TeamActivityCell(user_id=uid, user_full_name=names[uid], date=d, minutes=m)
        for uid, d, m in service.team_activity_cells(db, member_ids, today)
    ]
    buckets = InactivityBuckets(**service.inactivity_buckets(db, member_ids, now_utc()))
    return ManagerWidgetsOut(team_activity=cells, inactivity_buckets=buckets)


@admin_router.get("/org/widgets", response_model=OrgWidgetsOut)
def get_org_widgets(
    response: Response,
    org_id: UUID | None = Query(None, description="solo superadmin"),
    db: Session = Depends(get_db_as_superadmin),
    current_user: User = Depends(require_role("admin", "superadmin")),
) -> OrgWidgetsOut:
    response.headers["Cache-Control"] = _WIDGET_CACHE
    target_org = _resolve_org(current_user, org_id)
    user_ids = list(db.scalars(select(User.id).where(User.org_id == target_org)).all())
    today = now_utc().date()
    adoption = [
        AdoptionMonthPoint(month=m, active_users=c)
        for m, c in service.adoption_curve(db, user_ids, today)
    ]
    funnel = OnboardingFunnel(**service.onboarding_funnel(db, target_org, user_ids))
    watch = [
        MonthlyWatchPoint(month=m, minutes=mins)
        for m, mins in service.monthly_watch(db, user_ids, today)
    ]
    return OrgWidgetsOut(adoption_curve=adoption, onboarding_funnel=funnel, monthly_watch=watch)
