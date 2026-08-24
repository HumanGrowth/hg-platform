"""Manager & RRHH routers (B4-A). Agregaciones on-demand (ADR-0009).

- ``manager_router`` (prefix /manager): vista de equipo del manager.
- ``admin_router`` (prefix /admin): métricas de org para RRHH (TASK 06).
"""
from __future__ import annotations

import csv
import io
from collections import Counter
from datetime import datetime, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from hg.core.deps import get_current_user, get_db_as_superadmin, require_role
from hg.db import get_db
from hg.modules.identity.models import Organization, User, UserRole
from hg.modules.learning import enrollments_service
from hg.modules.learning.enrollments_service import InvalidPathCodeError
from hg.modules.learning.models import (
    CareerPath,
    Enrollment,
)
from hg.modules.learning.schemas import EnrollmentIn, EnrollmentOut
from hg.modules.learning_units.dimensions import career_path_for_dimension
from hg.modules.learning_units.models import (
    BlockProgress,
    BlockProgressStatus,
    LearningUnit,
    LearningUnitAttempt,
    UnitBlock,
)
from hg.modules.people import service
from hg.modules.people.schemas import (
    AdoptionMonthPoint,
    CourseProgressDetailOut,
    DimensionMetric,
    HomeDashboardOut,
    HomeStats,
    InactivityBuckets,
    ManagerWidgetsOut,
    MeWidgetsOut,
    MonthlyWatchPoint,
    NextStepOut,
    OnboardingFunnel,
    OrgBreakdownOut,
    OrgMetricsOut,
    OrgWidgetsOut,
    RecentActivityItem,
    StreakDay,
    TeamActivityCell,
    TeamMemberDetailOut,
    TeamMemberOut,
    TeamOrgComparison,
    TeamResponse,
    TopPerformerOut,
    UserMetricsOut,
    WeeklyMinutesBar,
)
from hg.modules.people.service import (
    ACTIVE_WINDOW_DAYS,
    ActivityAgg,
    activity_by_users,
    dimension_completion_rate,
    now_utc,
    org_dimension_metrics,
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
    # Auditoría (TASK 5): el manager consultó el roster de su equipo. El listado no
    # expone el estado por dimensión (solo agregados), así que no requiere gate.
    from hg.modules.consent import service as consent_service

    consent_service.log_access(db, actor=current_user, resource=consent_service.RESOURCE_ROSTER)
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


def _completed_blocks_by_attempt(db: Session, attempt_ids: list[UUID]) -> dict[UUID, int]:
    if not attempt_ids:
        return {}
    return {
        aid: int(n)
        for aid, n in db.execute(
            select(BlockProgress.attempt_id, func.count())
            .where(
                BlockProgress.attempt_id.in_(attempt_ids),
                BlockProgress.status == BlockProgressStatus.completed,
            )
            .group_by(BlockProgress.attempt_id)
        ).all()
    }


def _total_blocks_by_unit(db: Session, unit_ids: list[UUID]) -> dict[UUID, int]:
    if not unit_ids:
        return {}
    return {
        uid: int(n)
        for uid, n in db.execute(
            select(UnitBlock.unit_id, func.count())
            .where(UnitBlock.unit_id.in_(unit_ids))
            .group_by(UnitBlock.unit_id)
        ).all()
    }


def _completion_pct(completed_blocks: int, total_blocks: int) -> float:
    """% de avance de una unit = bloques completados / bloques totales."""
    if total_blocks <= 0:
        return 0.0
    return round(min(completed_blocks / total_blocks, 1.0) * 100, 1)


def _course_progress_list(
    db: Session, user_id: UUID, *, completed: bool, limit: int = 10
) -> list[CourseProgressDetailOut]:
    """Units en progreso / completadas de un user (modelo nuevo), top-N recientes."""
    rows = db.execute(
        select(LearningUnitAttempt, LearningUnit)
        .join(LearningUnit, LearningUnit.id == LearningUnitAttempt.unit_id)
        .where(
            LearningUnitAttempt.user_id == user_id,
            LearningUnitAttempt.completed_at.is_not(None)
            if completed
            else LearningUnitAttempt.completed_at.is_(None),
            *([] if completed else [LearningUnitAttempt.started_at.is_not(None)]),
        )
        .order_by(
            func.coalesce(
                LearningUnitAttempt.completed_at, LearningUnitAttempt.started_at
            ).desc()
        )
        .limit(limit)
    ).all()
    completed_blocks = _completed_blocks_by_attempt(db, [a.id for a, _ in rows])
    total_blocks = _total_blocks_by_unit(db, [u.id for _, u in rows])
    return [
        CourseProgressDetailOut(
            course_slug=u.slug,
            course_title=u.title,
            career_level=u.level_code,
            competency_code=u.competency_code.value if u.competency_code else None,
            watch_pct=100.0
            if a.completed_at is not None
            else _completion_pct(completed_blocks.get(a.id, 0), total_blocks.get(u.id, 0)),
            is_completed=a.completed_at is not None,
            last_played_at=a.completed_at or a.started_at,
        )
        for a, u in rows
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
    # Estados del assessment desde la fuente canónica (DimensionResult), NO el
    # snapshot denormalizado — así el manager ve lo mismo que el colaborador
    # en /perfil (Release TASK 2, consistencia cross-role).
    from hg.modules.assessment.service import assessment_states_snapshot, latest_dimension_results
    from hg.modules.consent import service as consent_service

    # Gate de consentimiento granular (TASK 5 · docx): el manager ve el estado
    # individual solo si el colaborador autorizó a su jefe directo (consent_manager).
    # El acceso se audita.
    states = (
        assessment_states_snapshot(latest_dimension_results(db, target.id))
        if consent_service.consent_manager_ok(consent_service.get_privacy_consent(db, target.id))
        else {}
    )
    consent_service.log_access(
        db, actor=current_user,
        resource=consent_service.RESOURCE_ASSESSMENT_STATE, target_user_id=target.id,
    )
    return TeamMemberDetailOut(
        **base.model_dump(),
        enrollments=[_enrollment_out(db, e) for e in enrollments],
        courses_in_progress_list=_course_progress_list(db, target.id, completed=False),
        courses_completed_list=_course_progress_list(db, target.id, completed=True),
        dimension_completion_rate=dimension_completion_rate(db, target.id),
        assessment_states=states,
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


def _resolve_scope(
    db: Session, current_user: User, org_id: UUID | None, company_id: UUID | None
) -> tuple[list[User], list[UUID]]:
    """Usuarios + org_ids del alcance del dashboard.

    - superadmin/admin con ``org_id`` → esa org (drill-down; el admin solo dentro
      de SU empresa).
    - superadmin con ``company_id`` → toda esa empresa.
    - admin (rol unificado) → toda su empresa por defecto.
    - superadmin sin scope → su propia org (HG).
    """
    # Drill-down explícito a una org.
    if org_id is not None:
        allowed = False
        if current_user.role == UserRole.superadmin:
            allowed = True
        elif current_user.role == UserRole.admin:
            # El admin solo puede bajar a una org de SU empresa; un org_id ajeno
            # se ignora y cae al scope de su empresa (no filtra otra empresa).
            org = db.get(Organization, org_id)
            allowed = org is not None and org.company_id == current_user.company_id
        if allowed:
            users = list(db.scalars(select(User).where(User.org_id == org_id)).all())
            return users, [org_id]

    # Empresa completa.
    target_company: UUID | None = None
    if current_user.role == UserRole.superadmin and company_id is not None:
        target_company = company_id
    elif current_user.role == UserRole.admin:
        target_company = current_user.company_id
    if target_company is not None:
        users = list(db.scalars(select(User).where(User.company_id == target_company)).all())
        org_ids = list(
            db.scalars(select(Organization.id).where(Organization.company_id == target_company)).all()
        )
        return users, org_ids

    # Fallback: superadmin sin scope → su propia org.
    users = list(db.scalars(select(User).where(User.org_id == current_user.org_id)).all())
    return users, [current_user.org_id]


@admin_router.get("/org/metrics", response_model=OrgMetricsOut)
def org_metrics(
    org_id: UUID | None = Query(None, description="drill-down a una org"),
    company_id: UUID | None = Query(None, description="solo superadmin: toda la empresa"),
    db: Session = Depends(get_db_as_superadmin),
    current_user: User = Depends(require_role("admin", "superadmin")),
) -> OrgMetricsOut:
    users, _org_ids = _resolve_scope(db, current_user, org_id, company_id)
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

    dimension_raw = org_dimension_metrics(db, uids)
    by_dimension: dict[str, DimensionMetric] = {}
    for path in db.scalars(select(CareerPath).order_by(CareerPath.order_index)).all():
        started, completed, active_u = dimension_raw.get(path.id, (0, 0, 0))
        by_dimension[path.code] = DimensionMetric(
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

    inactivity = InactivityBuckets(**service.inactivity_buckets(db, uids, now_utc()))

    # Comparativa por organización (solo si el scope abarca varias orgs = empresa).
    by_org: list[OrgBreakdownOut] = []
    present_org_ids = {u.org_id for u in users}
    if len(present_org_ids) > 1:
        org_names: dict[UUID, str] = {
            r[0]: r[1]
            for r in db.execute(
                select(Organization.id, Organization.name).where(
                    Organization.id.in_(present_org_ids)
                )
            ).all()
        }
        per_org: dict[UUID, list[User]] = {}
        for u in users:
            per_org.setdefault(u.org_id, []).append(u)
        for oid, ousers in per_org.items():
            o_total = len(ousers)
            o_active = sum(
                1
                for u in ousers
                if (la := aggs[u.id].last_active_at) is not None and la >= cutoff30
            )
            o_completed = sum(aggs[u.id].courses_completed for u in ousers)
            o_started = sum(
                aggs[u.id].courses_in_progress + aggs[u.id].courses_completed for u in ousers
            )
            by_org.append(
                OrgBreakdownOut(
                    org_id=oid,
                    org_name=org_names.get(oid, "—"),
                    total_users=o_total,
                    active_users=o_active,
                    adoption_rate=round(o_active / o_total, 4) if o_total else 0.0,
                    completion_rate=round(o_completed / o_started, 4) if o_started else 0.0,
                    inactive_users=sum(1 for u in ousers if aggs[u.id].is_inactive),
                )
            )
        by_org.sort(key=lambda b: b.org_name)

    return OrgMetricsOut(
        total_licenses=total,
        active_licenses=active,
        adoption_rate=round(active / total, 4) if total else 0.0,
        avg_watch_minutes_per_user=round(total_watch / total, 2) if total else 0.0,
        total_courses_completed=total_completed,
        completion_rate_global=round(total_completed / total_started, 4) if total_started else 0.0,
        by_dimension=by_dimension,
        by_career_level=dict(by_level),
        top_performers=top_performers,
        inactive_users_count=inactive,
        inactivity=inactivity,
        by_org=by_org,
    )


@admin_router.get("/org/users/export.csv")
def export_users_csv(
    org_id: UUID | None = Query(None, description="drill-down a una org"),
    company_id: UUID | None = Query(None, description="solo superadmin: toda la empresa"),
    db: Session = Depends(get_db_as_superadmin),
    current_user: User = Depends(require_role("admin", "superadmin")),
) -> Response:
    users, _org_ids = _resolve_scope(db, current_user, org_id, company_id)
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

    # Todos los attempts del user + su unit (para next_step y recent_activity).
    attempt_rows = db.execute(
        select(LearningUnitAttempt, LearningUnit)
        .join(LearningUnit, LearningUnit.id == LearningUnitAttempt.unit_id)
        .where(
            LearningUnitAttempt.user_id == uid,
            LearningUnitAttempt.started_at.is_not(None),
        )
    ).all()
    completed_blocks = _completed_blocks_by_attempt(db, [a.id for a, _ in attempt_rows])
    total_blocks = _total_blocks_by_unit(db, [u.id for _, u in attempt_rows])

    def _activity_ts(a: LearningUnitAttempt) -> datetime:
        return a.completed_at or a.started_at  # type: ignore[return-value]

    def _pillar(u: LearningUnit) -> str:
        return career_path_for_dimension(u.dimension_code) or "P1"

    ordered = sorted(attempt_rows, key=lambda r: _activity_ts(r[0]), reverse=True)

    # next_step: unit en progreso (no completada, <80%) con actividad más reciente.
    next_step = None
    for a, u in ordered:
        if a.completed_at is not None:
            continue
        pct = _completion_pct(completed_blocks.get(a.id, 0), total_blocks.get(u.id, 0))
        if pct >= 80:
            continue
        next_step = NextStepOut(
            course_id=u.id,
            course_slug=u.slug,
            course_title=u.title,
            dimension_code=_pillar(u),
            career_level=u.level_code,
            duration_seconds=u.estimated_duration_seconds or 0,
            watch_pct=pct,
            last_played_at=_activity_ts(a),
        )
        break

    # recent_activity: últimos 5 módulos tocados (completados + en progreso).
    recent_activity = [
        RecentActivityItem(
            course_id=u.id,
            course_slug=u.slug,
            course_title=u.title,
            dimension_code=_pillar(u),
            is_completed=a.completed_at is not None,
            last_played_at=_activity_ts(a),
            completed_at=a.completed_at,
        )
        for a, u in ordered[:5]
    ]

    # stats — actividad = bloques completados (fechados en submitted_at).
    agg = activity_by_users(db, [uid])[uid]
    now = now_utc()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    block_submits = [
        ts
        for ts in db.scalars(
            select(BlockProgress.submitted_at)
            .join(LearningUnitAttempt, LearningUnitAttempt.id == BlockProgress.attempt_id)
            .where(
                LearningUnitAttempt.user_id == uid,
                BlockProgress.status == BlockProgressStatus.completed,
                BlockProgress.submitted_at.is_not(None),
            )
        ).all()
        if ts is not None
    ]
    month_blocks = sum(1 for ts in block_submits if ts >= month_start)
    block_dates = {ts.date() for ts in block_submits}
    stats = HomeStats(
        courses_in_progress=agg.courses_in_progress,
        courses_completed=agg.courses_completed,
        total_watch_minutes=agg.total_watch_minutes,
        month_watch_minutes=month_blocks,
        streak_days=streak_days(block_dates, now.date()),
    )

    enrollments = enrollments_service.list_user_enrollments(db, user_id=uid, active_only=True)
    return HomeDashboardOut(
        next_step=next_step,
        active_enrollments=[_enrollment_out(db, e) for e in enrollments],
        dimension_completion_rates=dimension_completion_rate(db, uid),
        recent_activity=recent_activity,
        stats=stats,
    )


# ─────────────────────────── Widgets dashboard v1 (B4-E) ───────────────────────────
# 3 endpoints densos multi-widget (1 round-trip por página). Cache HTTP 60s. ADR-0011.

_WIDGET_CACHE = "private, max-age=60"


@me_router.get("/metrics", response_model=UserMetricsOut)
def get_my_metrics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> UserMetricsOut:
    """Métricas canónicas del usuario autenticado (Release TASK 2). Misma fuente
    (`service.get_user_metrics`) que consume el manager para /team/[id]."""
    m = service.get_user_metrics(db, current_user.id)
    return UserMetricsOut(
        courses_completed=m.courses_completed,
        courses_in_progress=m.courses_in_progress,
        total_watch_minutes=m.total_watch_minutes,
        last_assessment_date=m.last_assessment_date,
        badges_unlocked_count=m.badges_unlocked_count,
        assessment_states=m.assessment_states,
        dimension_completion_rate=m.dimension_completion_rate,
    )


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

    # Comparativa equipo vs promedio de la organización.
    comparison: TeamOrgComparison | None = None
    if member_ids:
        org_uids = list(
            db.scalars(select(User.id).where(User.org_id == current_user.org_id)).all()
        )
        cutoff = now_utc() - timedelta(days=ACTIVE_WINDOW_DAYS)

        def _stats(uids: list[UUID]) -> tuple[float, float, int]:
            if not uids:
                return 0.0, 0.0, 0
            aggs = activity_by_users(db, uids)
            active = sum(
                1 for u in uids if (la := aggs[u].last_active_at) is not None and la >= cutoff
            )
            completed = sum(aggs[u].courses_completed for u in uids)
            n = len(uids)
            return round(active / n, 4), round(completed / n, 2), n

        t_adopt, t_avg, t_n = _stats(member_ids)
        o_adopt, o_avg, o_n = _stats(org_uids)
        comparison = TeamOrgComparison(
            team_size=t_n, org_size=o_n,
            team_adoption=t_adopt, org_adoption=o_adopt,
            team_avg_completed=t_avg, org_avg_completed=o_avg,
        )
    return ManagerWidgetsOut(
        team_activity=cells, inactivity_buckets=buckets, comparison=comparison
    )


@admin_router.get("/org/widgets", response_model=OrgWidgetsOut)
def get_org_widgets(
    response: Response,
    org_id: UUID | None = Query(None, description="drill-down a una org"),
    company_id: UUID | None = Query(None, description="solo superadmin: toda la empresa"),
    db: Session = Depends(get_db_as_superadmin),
    current_user: User = Depends(require_role("admin", "superadmin")),
) -> OrgWidgetsOut:
    response.headers["Cache-Control"] = _WIDGET_CACHE
    users, org_ids = _resolve_scope(db, current_user, org_id, company_id)
    user_ids = [u.id for u in users]
    today = now_utc().date()
    adoption = [
        AdoptionMonthPoint(month=m, active_users=c)
        for m, c in service.adoption_curve(db, user_ids, today)
    ]
    funnel = OnboardingFunnel(**service.onboarding_funnel(db, org_ids, user_ids))
    watch = [
        MonthlyWatchPoint(month=m, minutes=mins)
        for m, mins in service.monthly_watch(db, user_ids, today)
    ]
    return OrgWidgetsOut(adoption_curve=adoption, onboarding_funnel=funnel, monthly_watch=watch)
