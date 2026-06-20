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


# ─────────────────────────── Widgets dashboard v1 (B4-E) ───────────────────────────
# Agregaciones on-demand para los widgets (streak, weekly, team activity, adoption,
# funnel, monthly watch). Se calculan en Python desde course_progress para ser
# DB-agnósticas y explícitas con el timezone (UTC). Ver ADR-0011.

STREAK_DAYS = 90
WEEKLY_WEEKS = 12
TEAM_ACTIVITY_DAYS = 30
ADOPTION_MONTHS = 12


def _day_start(d: date) -> datetime:
    return datetime(d.year, d.month, d.day, tzinfo=UTC)


def _month_key(d: date) -> str:
    return f"{d.year:04d}-{d.month:02d}"


def last_n_month_keys(today: date, n: int) -> list[str]:
    """Claves YYYY-MM de los últimos ``n`` meses, oldest first (incluye el actual)."""
    y, m = today.year, today.month
    pairs: list[tuple[int, int]] = []
    for _ in range(n):
        pairs.append((y, m))
        m -= 1
        if m == 0:
            m, y = 12, y - 1
    return [f"{yy:04d}-{mm:02d}" for yy, mm in reversed(pairs)]


def streak_heatmap(db: Session, user_id: UUID, today: date) -> list[tuple[date, int]]:
    """90 días (oldest first): (día, minutos del día). Minutos = suma de
    last_position_seconds de los progress jugados ese día // 60 (aprox MVP)."""
    start = today - timedelta(days=STREAK_DAYS - 1)
    rows = db.execute(
        select(CourseProgress.last_played_at, CourseProgress.last_position_seconds).where(
            CourseProgress.user_id == user_id, CourseProgress.last_played_at >= _day_start(start)
        )
    ).all()
    secs: dict[date, int] = {}
    for lp, s in rows:
        secs[lp.date()] = secs.get(lp.date(), 0) + (s or 0)
    return [
        (d, secs.get(d, 0) // 60)
        for i in range(STREAK_DAYS)
        if (d := start + timedelta(days=i))
    ]


def weekly_minutes(db: Session, user_id: UUID, today: date) -> list[tuple[date, int]]:
    """12 semanas (oldest first): (lunes de la semana, minutos)."""
    this_monday = today - timedelta(days=today.weekday())
    start_monday = this_monday - timedelta(weeks=WEEKLY_WEEKS - 1)
    rows = db.execute(
        select(CourseProgress.last_played_at, CourseProgress.last_position_seconds).where(
            CourseProgress.user_id == user_id,
            CourseProgress.last_played_at >= _day_start(start_monday),
        )
    ).all()
    secs: dict[date, int] = {}
    for lp, s in rows:
        d = lp.date()
        monday = d - timedelta(days=d.weekday())
        secs[monday] = secs.get(monday, 0) + (s or 0)
    return [
        (wk, secs.get(wk, 0) // 60)
        for i in range(WEEKLY_WEEKS)
        if (wk := start_monday + timedelta(weeks=i))
    ]


def team_activity_cells(
    db: Session, user_ids: list[UUID], today: date
) -> list[tuple[UUID, date, int]]:
    """30 días x reportes: solo cells con minutos > 0 (el front rellena los gaps)."""
    if not user_ids:
        return []
    start = today - timedelta(days=TEAM_ACTIVITY_DAYS - 1)
    rows = db.execute(
        select(
            CourseProgress.user_id,
            CourseProgress.last_played_at,
            CourseProgress.last_position_seconds,
        ).where(
            CourseProgress.user_id.in_(user_ids),
            CourseProgress.last_played_at >= _day_start(start),
        )
    ).all()
    secs: dict[tuple[UUID, date], int] = {}
    for uid, lp, s in rows:
        key = (uid, lp.date())
        secs[key] = secs.get(key, 0) + (s or 0)
    return [(uid, d, m // 60) for (uid, d), m in secs.items() if m // 60 > 0]


def inactivity_buckets(
    db: Session, user_ids: list[UUID], now: datetime
) -> dict[str, int]:
    """Clasifica cada usuario por gap desde su última actividad."""
    buckets = {
        "active": 0,
        "inactive_1_7d": 0,
        "inactive_8_14d": 0,
        "inactive_15_30d": 0,
        "inactive_gt_30d": 0,
        "never_active": 0,
    }
    if not user_ids:
        return buckets
    aggs = activity_by_users(db, user_ids)
    for uid in user_ids:
        la = aggs[uid].last_active_at
        if la is None:
            buckets["never_active"] += 1
            continue
        gap = (now - la).total_seconds() / 86400
        if gap <= 1:
            buckets["active"] += 1
        elif gap <= 7:
            buckets["inactive_1_7d"] += 1
        elif gap <= 14:
            buckets["inactive_8_14d"] += 1
        elif gap <= 30:
            buckets["inactive_15_30d"] += 1
        else:
            buckets["inactive_gt_30d"] += 1
    return buckets


def adoption_curve(
    db: Session, user_ids: list[UUID], today: date
) -> list[tuple[str, int]]:
    """12 meses (oldest first): (YYYY-MM, usuarios distintos con actividad ese mes)."""
    keys = last_n_month_keys(today, ADOPTION_MONTHS)
    if not user_ids:
        return [(k, 0) for k in keys]
    earliest = date(int(keys[0][:4]), int(keys[0][5:]), 1)
    rows = db.execute(
        select(CourseProgress.user_id, CourseProgress.last_played_at).where(
            CourseProgress.user_id.in_(user_ids),
            CourseProgress.last_played_at >= _day_start(earliest),
        )
    ).all()
    by_month: dict[str, set[UUID]] = {}
    for uid, lp in rows:
        by_month.setdefault(_month_key(lp.date()), set()).add(uid)
    return [(k, len(by_month.get(k, set()))) for k in keys]


def monthly_watch(db: Session, user_ids: list[UUID], today: date) -> list[tuple[str, int]]:
    """12 meses (oldest first): (YYYY-MM, minutos totales)."""
    keys = last_n_month_keys(today, ADOPTION_MONTHS)
    if not user_ids:
        return [(k, 0) for k in keys]
    earliest = date(int(keys[0][:4]), int(keys[0][5:]), 1)
    rows = db.execute(
        select(CourseProgress.last_played_at, CourseProgress.last_position_seconds).where(
            CourseProgress.user_id.in_(user_ids),
            CourseProgress.last_played_at >= _day_start(earliest),
        )
    ).all()
    secs: dict[str, int] = {}
    for lp, s in rows:
        k = _month_key(lp.date())
        secs[k] = secs.get(k, 0) + (s or 0)
    return [(k, secs.get(k, 0) // 60) for k in keys]


def onboarding_funnel(db: Session, org_id: UUID, user_ids: list[UUID]) -> dict[str, int]:
    """Snapshot histórico del funnel de onboarding de la org."""
    from hg.modules.identity.invitations import Invitation
    from hg.modules.identity.models import User

    invited = db.scalar(
        select(func.count()).select_from(Invitation).where(Invitation.org_id == org_id)
    ) or 0
    accepted = db.scalar(
        select(func.count())
        .select_from(Invitation)
        .where(Invitation.org_id == org_id, Invitation.accepted_at.is_not(None))
    ) or 0
    first_login = db.scalar(
        select(func.count())
        .select_from(User)
        .where(User.org_id == org_id, User.last_login_at.is_not(None))
    ) or 0
    if user_ids:
        first_course = db.scalar(
            select(func.count(func.distinct(CourseProgress.user_id))).where(
                CourseProgress.user_id.in_(user_ids)
            )
        ) or 0
        first_completion = db.scalar(
            select(func.count(func.distinct(CourseProgress.user_id))).where(
                CourseProgress.user_id.in_(user_ids),
                CourseProgress.is_completed.is_(True),
            )
        ) or 0
    else:
        first_course = first_completion = 0
    return {
        "invited": int(invited),
        "accepted": int(accepted),
        "first_login": int(first_login),
        "first_course": int(first_course),
        "first_completion": int(first_completion),
    }
