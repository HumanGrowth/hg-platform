"""Manager & RRHH routers (B4-A). Agregaciones on-demand (ADR-0009).

- ``manager_router`` (prefix /manager): vista de equipo del manager.
- ``admin_router`` (prefix /admin): métricas de org para RRHH (TASK 06).
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from hg.core.deps import get_current_user
from hg.db import get_db
from hg.modules.identity.models import User, UserRole
from hg.modules.people.schemas import TeamMemberOut, TeamResponse
from hg.modules.people.service import activity_by_users

manager_router = APIRouter()

_ADMIN_ROLES = (UserRole.admin, UserRole.superadmin)


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

    rows = [
        TeamMemberOut(
            id=m.id,
            full_name=m.full_name,
            email=m.email,
            role=m.role.value,
            career_level=m.career_level.value if m.career_level else None,
            job_title=m.job_title,
            last_active_at=aggs[m.id].last_active_at,
            is_inactive=aggs[m.id].is_inactive,
            courses_in_progress=aggs[m.id].courses_in_progress,
            courses_completed=aggs[m.id].courses_completed,
            total_watch_minutes=aggs[m.id].total_watch_minutes,
            active_enrollments=aggs[m.id].active_enrollments,
        )
        for m in members
    ]

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
