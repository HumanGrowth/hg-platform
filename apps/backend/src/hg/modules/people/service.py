"""People aggregations — cálculo on-demand de actividad/completion.

Funciones puras sobre una Session ya scopeada al tenant (hg_app + org context).
La fuente de verdad de actividad es ``course_progress``; los enrollments dan los
paths asignados. Sin Celery beat — todo se calcula en cada request (ADR-0009).
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from hg.modules.learning.models import CareerPath, Course, CourseProgress, Enrollment

INACTIVE_DAYS = 7
ACTIVE_WINDOW_DAYS = 30


def streak_days(activity_dates: set[date], today: date) -> int:
    """Días consecutivos con actividad terminando hoy o ayer (gap >24h rompe)."""
    if not activity_dates:
        return 0
    ordered = sorted(activity_dates, reverse=True)
    if ordered[0] not in (today, today - timedelta(days=1)):
        return 0
    streak = 1
    prev = ordered[0]
    for d in ordered[1:]:
        if d == prev - timedelta(days=1):
            streak += 1
            prev = d
        else:
            break
    return streak


def now_utc() -> datetime:
    return datetime.now(UTC)


@dataclass
class ActivityAgg:
    last_active_at: datetime | None = None
    courses_in_progress: int = 0
    courses_completed: int = 0
    total_watch_minutes: int = 0
    active_enrollments: int = 0

    @property
    def is_inactive(self) -> bool:
        if self.last_active_at is None:
            return True
        return self.last_active_at < now_utc() - timedelta(days=INACTIVE_DAYS)


def activity_by_users(db: Session, user_ids: list[UUID]) -> dict[UUID, ActivityAgg]:
    """Agrega course_progress + enrollments por usuario (un dict por user_id)."""
    aggs: dict[UUID, ActivityAgg] = {uid: ActivityAgg() for uid in user_ids}
    if not user_ids:
        return aggs

    # course_progress: last_active, in_progress, completed, watch_seconds
    rows = db.execute(
        select(
            CourseProgress.user_id,
            func.max(CourseProgress.last_played_at),
            func.count().filter(
                CourseProgress.is_completed.is_(False), CourseProgress.watch_pct > 0
            ),
            func.count().filter(CourseProgress.is_completed.is_(True)),
            func.coalesce(func.sum(CourseProgress.last_position_seconds), 0),
        )
        .where(CourseProgress.user_id.in_(user_ids))
        .group_by(CourseProgress.user_id)
    ).all()
    for uid, last_active, in_prog, completed, watch_sec in rows:
        a = aggs[uid]
        a.last_active_at = last_active
        a.courses_in_progress = int(in_prog)
        a.courses_completed = int(completed)
        a.total_watch_minutes = int(watch_sec) // 60

    # enrollments activos
    erows = db.execute(
        select(Enrollment.user_id, func.count())
        .where(Enrollment.user_id.in_(user_ids), Enrollment.is_active.is_(True))
        .group_by(Enrollment.user_id)
    ).all()
    for uid, count in erows:
        aggs[uid].active_enrollments = int(count)

    return aggs


def org_pillar_metrics(
    db: Session, user_ids: list[UUID]
) -> dict[UUID, tuple[int, int, int]]:
    """Por career_path_id (de los cursos): (started, completed, active_users_30d).

    started = progress con watch_pct>0; active_users = usuarios distintos con
    last_played_at en la ventana de 30d.
    """
    if not user_ids:
        return {}
    cutoff = now_utc() - timedelta(days=ACTIVE_WINDOW_DAYS)
    rows = db.execute(
        select(
            Course.career_path_id,
            func.count().filter(CourseProgress.watch_pct > 0),
            func.count().filter(CourseProgress.is_completed.is_(True)),
            func.count(func.distinct(CourseProgress.user_id)).filter(
                CourseProgress.last_played_at >= cutoff
            ),
        )
        .join(Course, Course.id == CourseProgress.course_id)
        .where(CourseProgress.user_id.in_(user_ids))
        .group_by(Course.career_path_id)
    ).all()
    return {pid: (int(started), int(completed), int(active)) for pid, started, completed, active in rows}


def pillar_completion_rate(db: Session, user_id: UUID) -> dict[str, float]:
    """Por cada pilar P1..P6: cursos completados del path / cursos activos del path.

    0.0 si no hay enrollment activo a ese pilar o el path no tiene cursos activos.
    """
    paths = db.scalars(select(CareerPath).order_by(CareerPath.order_index)).all()
    active_path_ids = set(
        db.scalars(
            select(Enrollment.career_path_id).where(
                Enrollment.user_id == user_id, Enrollment.is_active.is_(True)
            )
        ).all()
    )
    rates: dict[str, float] = {}
    for path in paths:
        if path.id not in active_path_ids:
            rates[path.code] = 0.0
            continue
        total = (
            db.scalar(
                select(func.count())
                .select_from(Course)
                .where(Course.career_path_id == path.id, Course.is_active.is_(True))
            )
            or 0
        )
        if total == 0:
            rates[path.code] = 0.0
            continue
        completed = (
            db.scalar(
                select(func.count())
                .select_from(CourseProgress)
                .join(Course, Course.id == CourseProgress.course_id)
                .where(
                    CourseProgress.user_id == user_id,
                    CourseProgress.is_completed.is_(True),
                    Course.career_path_id == path.id,
                    Course.is_active.is_(True),
                )
            )
            or 0
        )
        rates[path.code] = round(completed / total, 4)
    return rates
