"""People aggregations — cálculo on-demand de actividad/completion.

Funciones puras sobre una Session ya scopeada al tenant (hg_app + org context).
La fuente de verdad de actividad son los **Learning Units** (modelo nuevo): los
``learning_unit_attempts`` (un intento por user x unit) y su ``block_progress``
(bloques completados). Sin Celery beat — todo se calcula en cada request
(ADR-0009).

Unidad de esfuerzo (decisión de producto, ago-2026): **bloques completados**.
Los módulos no son video continuo, así que las series históricas (streak,
semanal, mensual, team activity) cuentan *bloques completados* por período —
NO minutos de video. Por compat de contrato con el frontend, los campos del
wire siguen llamándose ``minutes`` / ``watch_minutes`` pero su semántica es
"bloques completados"; el label que ve el usuario dice "bloques".
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from hg.modules.learning.models import CareerPath, Enrollment
from hg.modules.learning_units.dimensions import (
    DRIVE_TO_CAREER_PATH,
    dimensions_for_career_paths,
)
from hg.modules.learning_units.models import (
    BlockProgress,
    BlockProgressStatus,
    LearningUnit,
    LearningUnitAttempt,
)

# Umbral de inactividad ampliado a 21 días (ago-2026): 7 era muy agresivo para
# dar seguimiento a colaboradores (marcaba inactivo a la semana).
INACTIVE_DAYS = 21
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
    courses_in_progress: int = 0  # units iniciadas sin completar
    courses_completed: int = 0  # units completadas
    total_watch_minutes: int = 0  # bloques completados (ver módulo docstring)
    active_enrollments: int = 0

    @property
    def is_inactive(self) -> bool:
        if self.last_active_at is None:
            return True
        return self.last_active_at < now_utc() - timedelta(days=INACTIVE_DAYS)


def _completed_block_events(
    db: Session, user_ids: list[UUID], since: datetime
) -> list[tuple[UUID, datetime]]:
    """(user_id, submitted_at) por cada bloque **completado** desde ``since``.

    Fuente única de las series históricas (streak/semanal/mensual/team/adopción):
    cada bloque completado es un "evento de actividad" fechado en ``submitted_at``.
    """
    if not user_ids:
        return []
    return [
        (uid, ts)
        for uid, ts in db.execute(
            select(LearningUnitAttempt.user_id, BlockProgress.submitted_at)
            .join(BlockProgress, BlockProgress.attempt_id == LearningUnitAttempt.id)
            .where(
                LearningUnitAttempt.user_id.in_(user_ids),
                BlockProgress.status == BlockProgressStatus.completed,
                BlockProgress.submitted_at.is_not(None),
                BlockProgress.submitted_at >= since,
            )
        ).all()
        if ts is not None
    ]


def activity_by_users(db: Session, user_ids: list[UUID]) -> dict[UUID, ActivityAgg]:
    """Agrega attempts + bloques completados por usuario (un dict por user_id)."""
    aggs: dict[UUID, ActivityAgg] = {uid: ActivityAgg() for uid in user_ids}
    if not user_ids:
        return aggs

    # attempts: last_active (max start/complete), in_progress, completed
    rows = db.execute(
        select(
            LearningUnitAttempt.user_id,
            func.max(
                func.coalesce(
                    LearningUnitAttempt.completed_at, LearningUnitAttempt.started_at
                )
            ),
            func.count().filter(
                LearningUnitAttempt.completed_at.is_(None),
                LearningUnitAttempt.started_at.is_not(None),
            ),
            func.count().filter(LearningUnitAttempt.completed_at.is_not(None)),
        )
        .where(LearningUnitAttempt.user_id.in_(user_ids))
        .group_by(LearningUnitAttempt.user_id)
    ).all()
    for uid, last_active, in_prog, completed in rows:
        a = aggs[uid]
        a.last_active_at = last_active
        a.courses_in_progress = int(in_prog)
        a.courses_completed = int(completed)

    # bloques completados: total (= "watch_minutes") + refinar last_active con
    # el submitted_at más reciente (más granular que el timestamp del attempt).
    brows = db.execute(
        select(
            LearningUnitAttempt.user_id,
            func.count(),
            func.max(BlockProgress.submitted_at),
        )
        .join(BlockProgress, BlockProgress.attempt_id == LearningUnitAttempt.id)
        .where(
            LearningUnitAttempt.user_id.in_(user_ids),
            BlockProgress.status == BlockProgressStatus.completed,
        )
        .group_by(LearningUnitAttempt.user_id)
    ).all()
    for uid, blocks, last_block in brows:
        a = aggs[uid]
        a.total_watch_minutes = int(blocks)
        if last_block is not None and (a.last_active_at is None or last_block > a.last_active_at):
            a.last_active_at = last_block

    # enrollments activos (career paths asignados) — concepto separado, sigue
    # viviendo en la tabla `enrollments`.
    erows = db.execute(
        select(Enrollment.user_id, func.count())
        .where(Enrollment.user_id.in_(user_ids), Enrollment.is_active.is_(True))
        .group_by(Enrollment.user_id)
    ).all()
    for uid, count in erows:
        aggs[uid].active_enrollments = int(count)

    return aggs


def _career_path_id_by_code(db: Session) -> dict[str, UUID]:
    return {p.code: p.id for p in db.scalars(select(CareerPath)).all()}


def org_dimension_metrics(
    db: Session, user_ids: list[UUID]
) -> dict[UUID, tuple[int, int, int]]:
    """Por career_path_id: (started, completed, active_users_30d).

    Agrupa los attempts por la ``dimension_code`` de la unit y la mapea al
    career_path (CP→P1, …). Varias dimensiones pueden caer en el mismo path.
    started = attempts iniciados; active_users = usuarios distintos con
    actividad en la ventana de 30d.
    """
    if not user_ids:
        return {}
    cutoff = now_utc() - timedelta(days=ACTIVE_WINDOW_DAYS)
    rows = db.execute(
        select(
            LearningUnit.dimension_code,
            func.count().filter(LearningUnitAttempt.started_at.is_not(None)),
            func.count().filter(LearningUnitAttempt.completed_at.is_not(None)),
            func.count(func.distinct(LearningUnitAttempt.user_id)).filter(
                func.coalesce(
                    LearningUnitAttempt.completed_at, LearningUnitAttempt.started_at
                )
                >= cutoff
            ),
        )
        .join(LearningUnit, LearningUnit.id == LearningUnitAttempt.unit_id)
        .where(LearningUnitAttempt.user_id.in_(user_ids))
        .group_by(LearningUnit.dimension_code)
    ).all()
    code_to_id = _career_path_id_by_code(db)
    out: dict[UUID, tuple[int, int, int]] = {}
    for dim, started, completed, active in rows:
        cp_code = DRIVE_TO_CAREER_PATH.get((dim or "").upper())
        pid = code_to_id.get(cp_code) if cp_code else None
        if pid is None:
            continue
        s, c, a = out.get(pid, (0, 0, 0))
        out[pid] = (s + int(started), c + int(completed), a + int(active))
    return out


def dimension_completion_rate(db: Session, user_id: UUID) -> dict[str, float]:
    """Por cada pilar P1..P6: units completadas por el user / units publicadas.

    Se calcula sobre el catálogo global de units agrupado por dimensión
    (mapeada al career_path). 0.0 si el pilar no tiene units publicadas.
    """
    paths = db.scalars(select(CareerPath).order_by(CareerPath.order_index)).all()

    total_by_dim = {
        d: int(c)
        for d, c in db.execute(
            select(LearningUnit.dimension_code, func.count())
            .where(LearningUnit.published_at.is_not(None))
            .group_by(LearningUnit.dimension_code)
        ).all()
    }
    completed_by_dim = {
        d: int(c)
        for d, c in db.execute(
            select(
                LearningUnit.dimension_code,
                func.count(func.distinct(LearningUnitAttempt.unit_id)),
            )
            .join(LearningUnit, LearningUnit.id == LearningUnitAttempt.unit_id)
            .where(
                LearningUnitAttempt.user_id == user_id,
                LearningUnitAttempt.completed_at.is_not(None),
                LearningUnit.published_at.is_not(None),
            )
            .group_by(LearningUnit.dimension_code)
        ).all()
    }

    rates: dict[str, float] = {}
    for path in paths:
        dims = dimensions_for_career_paths([path.code])
        total = sum(total_by_dim.get(d, 0) for d in dims)
        completed = sum(completed_by_dim.get(d, 0) for d in dims)
        rates[path.code] = round(completed / total, 4) if total else 0.0
    return rates


# ─────────────────────────── Widgets dashboard v1 (B4-E) ───────────────────────────
# Agregaciones on-demand para los widgets (streak, weekly, team activity, adoption,
# funnel, monthly). Se calculan en Python desde block_progress para ser
# DB-agnósticas y explícitas con el timezone (UTC). El "valor" de cada celda es
# el CONTEO DE BLOQUES COMPLETADOS en el período. Ver ADR-0011.

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
    """90 días (oldest first): (día, bloques completados ese día)."""
    start = today - timedelta(days=STREAK_DAYS - 1)
    events = _completed_block_events(db, [user_id], _day_start(start))
    per_day: dict[date, int] = {}
    for _uid, submitted in events:
        per_day[submitted.date()] = per_day.get(submitted.date(), 0) + 1
    return [
        (d, per_day.get(d, 0))
        for i in range(STREAK_DAYS)
        if (d := start + timedelta(days=i))
    ]


def weekly_minutes(db: Session, user_id: UUID, today: date) -> list[tuple[date, int]]:
    """12 semanas (oldest first): (lunes de la semana, bloques completados)."""
    this_monday = today - timedelta(days=today.weekday())
    start_monday = this_monday - timedelta(weeks=WEEKLY_WEEKS - 1)
    events = _completed_block_events(db, [user_id], _day_start(start_monday))
    per_week: dict[date, int] = {}
    for _uid, submitted in events:
        d = submitted.date()
        monday = d - timedelta(days=d.weekday())
        per_week[monday] = per_week.get(monday, 0) + 1
    return [
        (wk, per_week.get(wk, 0))
        for i in range(WEEKLY_WEEKS)
        if (wk := start_monday + timedelta(weeks=i))
    ]


def team_activity_cells(
    db: Session, user_ids: list[UUID], today: date
) -> list[tuple[UUID, date, int]]:
    """30 días x reportes: solo cells con bloques > 0 (el front rellena los gaps)."""
    if not user_ids:
        return []
    start = today - timedelta(days=TEAM_ACTIVITY_DAYS - 1)
    events = _completed_block_events(db, user_ids, _day_start(start))
    per_cell: dict[tuple[UUID, date], int] = {}
    for uid, submitted in events:
        key = (uid, submitted.date())
        per_cell[key] = per_cell.get(key, 0) + 1
    return [(uid, d, n) for (uid, d), n in per_cell.items() if n > 0]


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
    events = _completed_block_events(db, user_ids, _day_start(earliest))
    by_month: dict[str, set[UUID]] = {}
    for uid, submitted in events:
        by_month.setdefault(_month_key(submitted.date()), set()).add(uid)
    return [(k, len(by_month.get(k, set()))) for k in keys]


def monthly_watch(db: Session, user_ids: list[UUID], today: date) -> list[tuple[str, int]]:
    """12 meses (oldest first): (YYYY-MM, bloques completados en el mes)."""
    keys = last_n_month_keys(today, ADOPTION_MONTHS)
    if not user_ids:
        return [(k, 0) for k in keys]
    earliest = date(int(keys[0][:4]), int(keys[0][5:]), 1)
    events = _completed_block_events(db, user_ids, _day_start(earliest))
    per_month: dict[str, int] = {}
    for _uid, submitted in events:
        k = _month_key(submitted.date())
        per_month[k] = per_month.get(k, 0) + 1
    return [(k, per_month.get(k, 0)) for k in keys]


def onboarding_funnel(db: Session, org_ids: list[UUID], user_ids: list[UUID]) -> dict[str, int]:
    """Snapshot histórico del funnel de onboarding de una o varias orgs (empresa).

    ``first_course`` = users con >=1 attempt (empezaron un módulo);
    ``first_completion`` = users con >=1 módulo completado.
    """
    from hg.modules.identity.invitations import Invitation
    from hg.modules.identity.models import User

    if not org_ids:
        return {"invited": 0, "accepted": 0, "first_login": 0, "first_course": 0, "first_completion": 0}
    invited = db.scalar(
        select(func.count()).select_from(Invitation).where(Invitation.org_id.in_(org_ids))
    ) or 0
    accepted = db.scalar(
        select(func.count())
        .select_from(Invitation)
        .where(Invitation.org_id.in_(org_ids), Invitation.accepted_at.is_not(None))
    ) or 0
    first_login = db.scalar(
        select(func.count())
        .select_from(User)
        .where(User.org_id.in_(org_ids), User.last_login_at.is_not(None))
    ) or 0
    if user_ids:
        first_course = db.scalar(
            select(func.count(func.distinct(LearningUnitAttempt.user_id))).where(
                LearningUnitAttempt.user_id.in_(user_ids),
                LearningUnitAttempt.started_at.is_not(None),
            )
        ) or 0
        first_completion = db.scalar(
            select(func.count(func.distinct(LearningUnitAttempt.user_id))).where(
                LearningUnitAttempt.user_id.in_(user_ids),
                LearningUnitAttempt.completed_at.is_not(None),
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


# ─────────────── Métricas por usuario · fuente única (Release TASK 2) ───────────────
# Un solo lugar que arma las métricas canónicas de UN usuario, para que el
# colaborador (/me/metrics) y el manager (/team/[id]) muestren los MISMOS números.


@dataclass
class UserMetrics:
    courses_completed: int
    courses_in_progress: int
    total_watch_minutes: int  # bloques completados (ver docstring del módulo)
    last_assessment_date: datetime | None
    badges_unlocked_count: int
    assessment_states: dict[str, dict[str, str]]  # {dimension: {state, state_label, source}} — desde DimensionResult
    dimension_completion_rate: dict[str, float]


def get_user_metrics(db: Session, user_id: UUID) -> UserMetrics:
    from hg.modules.assessment.service import (
        assessment_states_snapshot,
        latest_dimension_results,
    )
    from hg.modules.badges.models import UserBadge

    agg = activity_by_users(db, [user_id])[user_id]
    results = latest_dimension_results(db, user_id)
    last_assessment = max((r.derived_at for r in results), default=None)
    badges = (
        db.scalar(select(func.count()).select_from(UserBadge).where(UserBadge.user_id == user_id))
        or 0
    )
    return UserMetrics(
        courses_completed=agg.courses_completed,
        courses_in_progress=agg.courses_in_progress,
        total_watch_minutes=agg.total_watch_minutes,
        last_assessment_date=last_assessment,
        badges_unlocked_count=badges,
        assessment_states=assessment_states_snapshot(results),
        dimension_completion_rate=dimension_completion_rate(db, user_id),
    )
