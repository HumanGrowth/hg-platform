"""Manager & RRHH routers (B4-A). Agregaciones on-demand (ADR-0009).

- ``manager_router`` (prefix /manager): vista de equipo del manager.
- ``admin_router`` (prefix /admin): métricas de org para RRHH (TASK 06).
"""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from hg.core.deps import get_current_user
from hg.db import get_db
from hg.modules.identity.models import User, UserRole
from hg.modules.learning import enrollments_service
from hg.modules.learning.enrollments_service import InvalidPathCodeError
from hg.modules.learning.models import CareerPath, Course, CourseProgress, Enrollment
from hg.modules.learning.schemas import EnrollmentIn, EnrollmentOut
from hg.modules.people.schemas import (
    CourseProgressDetailOut,
    TeamMemberDetailOut,
    TeamMemberOut,
    TeamResponse,
)
from hg.modules.people.service import ActivityAgg, activity_by_users, pillar_completion_rate

manager_router = APIRouter()

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
    manager → reportes directos. Sin reportes y no admin → 403."""
    if current_user.role in _ADMIN_ROLES:
        return list(db.scalars(select(User).where(User.id != current_user.id)).all())
    reports = list(
        db.scalars(select(User).where(User.manager_id == current_user.id)).all()
    )
    if not reports:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="no direct reports"
        )
    return reports


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
