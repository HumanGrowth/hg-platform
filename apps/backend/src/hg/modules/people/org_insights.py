"""Insights del dashboard RRHH (v2) — agregaciones on-demand (ADR-0009).

Todo recibe usuarios ya resueltos por ``_resolve_scope`` (sin invitados). El
colaborador autoriza a RRHH al ingresar, así que acá no se filtra por
consentimiento. Privacidad (invariante 3 del CLAUDE raíz): nunca respuestas item
por item, y las distribuciones por pilar se suprimen bajo ``ASSESSMENT_MIN_GROUP``
personas para no re-identificar.
"""
from __future__ import annotations

from collections import Counter, defaultdict
from datetime import datetime, timedelta
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from hg.modules.assessment.models import DimensionResult
from hg.modules.identity.models import Company, Organization, User
from hg.modules.learning_units.assignment_status import assignment_completed_clause
from hg.modules.learning_units.dimensions import DRIVE_TO_CAREER_PATH
from hg.modules.learning_units.models import (
    BlockProgress,
    BlockProgressStatus,
    LearningUnit,
    LearningUnitAttempt,
    ModuleAssignment,
)
from hg.modules.learning_units.onboarding import ONBOARDING_DIMENSION_CODE
from hg.modules.people.schemas import (
    AccountProgressOut,
    AssessmentOverviewOut,
    AssessmentStateCount,
    AssignmentComplianceOut,
    AssignmentOrgOut,
    DimensionAssessmentOut,
    LicenseOrgUsageOut,
    LicenseUsageOut,
    StalledOut,
)
from hg.modules.people.service import (
    ASSIGNMENT_DUE_SOON_DAYS,
    ActivityAgg,
    assigned_modules_progress,
    now_utc,
)

ASSESSMENT_MIN_GROUP = 5
STALLED_DAYS = 14


# ─────────────────────────── Cumplimiento de asignaciones ───────────────────────────


def _bucket(due: datetime | None, done: bool, now: datetime, soon: datetime) -> str:
    """Categoría excluyente de una asignación."""
    if done:
        return "completed"
    if due is not None and due < now:
        return "overdue"
    if due is not None and due <= soon:
        return "due_soon"
    return "open"


def assignment_compliance(
    db: Session, users: list[User], org_names: dict[UUID, str]
) -> AssignmentComplianceOut:
    """Estado de las ``ModuleAssignment`` del alcance, total y por organización.
    Categorías excluyentes: cumplida / vencida / por vencer (≤7d) / en curso."""
    out = AssignmentComplianceOut(
        total=0, completed=0, overdue=0, due_soon=0, open=0, users_with_overdue=0
    )
    if not users:
        return out
    org_of = {u.id: u.org_id for u in users}
    now = now_utc()
    soon = now + timedelta(days=ASSIGNMENT_DUE_SOON_DAYS)
    rows = db.execute(
        select(
            ModuleAssignment.user_id,
            ModuleAssignment.due_date,
            assignment_completed_clause(),
        ).where(ModuleAssignment.user_id.in_(list(org_of)))
    ).all()
    per_org: dict[UUID, Counter[str]] = {oid: Counter() for oid in set(org_of.values())}
    overdue_users: set[UUID] = set()
    for uid, due, done in rows:
        cat = _bucket(due, bool(done), now, soon)
        out.total += 1
        setattr(out, cat, getattr(out, cat) + 1)
        per_org[org_of[uid]][cat] += 1
        if cat == "overdue":
            overdue_users.add(uid)
    out.users_with_overdue = len(overdue_users)
    out.by_org = [
        AssignmentOrgOut(
            org_id=oid,
            org_name=org_names.get(oid, "—"),
            total=sum(c.values()),
            completed=c["completed"],
            overdue=c["overdue"],
            due_soon=c["due_soon"],
            open=c["open"],
        )
        for oid, c in sorted(per_org.items(), key=lambda kv: org_names.get(kv[0], ""))
    ]
    return out


# ─────────────────────────── Progreso de cuentas ───────────────────────────


def account_progress(
    db: Session,
    users: list[User],
    aggs: dict[UUID, ActivityAgg],
    org_names: dict[UUID, str],
) -> list[AccountProgressOut]:
    """Todas las cuentas del alcance con último login y avance sobre lo asignado.
    El colaborador autoriza a RRHH al ingresar, así que no se filtra por
    consentimiento. Orden: nunca ingresaron primero, luego login más antiguo."""
    progress = assigned_modules_progress(db, [u.id for u in users])
    names = {u.id: u.full_name for u in users}

    def _key(u: User) -> tuple[int, float]:
        return (0, 0.0) if u.last_login_at is None else (1, u.last_login_at.timestamp())

    return [
        AccountProgressOut(
            user_id=u.id,
            full_name=u.full_name,
            email=u.email,
            org_id=u.org_id,
            org_name=org_names.get(u.org_id, "—"),
            manager_id=u.manager_id,
            manager_name=names.get(u.manager_id) if u.manager_id else None,
            last_login_at=u.last_login_at,
            is_inactive=aggs[u.id].is_inactive,
            modules_completed=progress[u.id][0],
            modules_assigned=progress[u.id][1],
        )
        for u in sorted(users, key=_key)
    ]


# ─────────────────────────── Assessment agregado por pilar ───────────────────────────


def assessment_overview(db: Session, users: list[User]) -> AssessmentOverviewOut:
    """Distribución de estados por pilar con mínimo de grupo (no es un filtro de
    consentimiento: evita re-identificar en grupos chicos). Nunca respuestas por
    ítem."""
    eligible = [u.id for u in users]
    by_dim: dict[str, list[str]] = defaultdict(list)
    users_with_result: set[UUID] = set()
    if eligible:
        rows = db.execute(
            select(DimensionResult.user_id, DimensionResult.dimension_code, DimensionResult.state_label)
            .where(DimensionResult.user_id.in_(eligible))
            .distinct(DimensionResult.user_id, DimensionResult.dimension_code)
            .order_by(
                DimensionResult.user_id,
                DimensionResult.dimension_code,
                DimensionResult.derived_at.desc(),
                DimensionResult.id.desc(),
            )
        ).all()
        for uid, code, label in rows:
            by_dim[code.value].append(label)
            users_with_result.add(uid)

    dims: list[DimensionAssessmentOut] = []
    for code in sorted(by_dim):
        labels = by_dim[code]
        n = len(labels)
        suppressed = n < ASSESSMENT_MIN_GROUP
        dims.append(
            DimensionAssessmentOut(
                code=code,
                n=n,
                suppressed=suppressed,
                states=[]
                if suppressed
                else [
                    AssessmentStateCount(state_label=lbl, count=c)
                    for lbl, c in Counter(labels).most_common()
                ],
            )
        )
    return AssessmentOverviewOut(
        total_users=len(users),
        with_results=len(users_with_result),
        min_group=ASSESSMENT_MIN_GROUP,
        dimensions=dims,
    )


# ─────────────────────────── Módulos estancados ───────────────────────────


def stalled_units(db: Session, user_ids: list[UUID]) -> StalledOut:
    """Units iniciadas, sin completar y sin avance hace > ``STALLED_DAYS``,
    agrupadas por pilar (excluye Onboarding)."""
    out = StalledOut(stale_days=STALLED_DAYS, total=0, users=0, by_dimension={})
    if not user_ids:
        return out
    cutoff = now_utc() - timedelta(days=STALLED_DAYS)
    last_block = func.max(BlockProgress.submitted_at)
    rows = db.execute(
        select(
            LearningUnitAttempt.user_id,
            LearningUnit.dimension_code,
            LearningUnitAttempt.started_at,
            last_block,
        )
        .join(LearningUnit, LearningUnit.id == LearningUnitAttempt.unit_id)
        .outerjoin(
            BlockProgress,
            (BlockProgress.attempt_id == LearningUnitAttempt.id)
            & (BlockProgress.status == BlockProgressStatus.completed),
        )
        .where(
            LearningUnitAttempt.user_id.in_(user_ids),
            LearningUnitAttempt.started_at.is_not(None),
            LearningUnitAttempt.completed_at.is_(None),
            LearningUnit.dimension_code != ONBOARDING_DIMENSION_CODE,
        )
        .group_by(
            LearningUnitAttempt.id,
            LearningUnitAttempt.user_id,
            LearningUnit.dimension_code,
            LearningUnitAttempt.started_at,
        )
    ).all()
    stalled_users: set[UUID] = set()
    by_dim: Counter[str] = Counter()
    for uid, dim, started, last in rows:
        last_ts = max(started, last) if last is not None else started
        if last_ts >= cutoff:
            continue
        cp = DRIVE_TO_CAREER_PATH.get((dim or "").upper())
        if cp is None:
            continue
        out.total += 1
        stalled_users.add(uid)
        by_dim[cp] += 1
    out.users = len(stalled_users)
    out.by_dimension = dict(by_dim)
    return out


# ─────────────────────────── Uso de licencias ───────────────────────────


def license_usage(
    db: Session, org_ids: list[UUID], drilled_org: bool
) -> LicenseUsageOut:
    """Cupo vs uso. Scope org (drill-down): cupo de la org. Scope empresa: pool
    de la Empresa + desglose por org. "Usadas" = usuarios activos (mismo criterio
    que ``identity.service.company_active_users``); los invitados que aún no
    aceptaron se cuentan aparte."""
    orgs = list(db.scalars(select(Organization).where(Organization.id.in_(org_ids))).all())
    used_by_org: dict[UUID, int] = {
        oid: int(n)
        for oid, n in db.execute(
            select(User.org_id, func.count())
            .where(User.org_id.in_(org_ids), User.is_active.is_(True))
            .group_by(User.org_id)
        ).all()
    }
    pending = int(
        db.scalar(
            select(func.count())
            .select_from(User)
            .where(User.org_id.in_(org_ids), User.is_invited.is_(True))
        )
        or 0
    )
    used = sum(used_by_org.values())
    by_org = [
        LicenseOrgUsageOut(
            org_id=o.id, org_name=o.name, quota=o.license_quota, used=used_by_org.get(o.id, 0)
        )
        for o in sorted(orgs, key=lambda o: o.name)
    ]
    if drilled_org and len(orgs) == 1:
        return LicenseUsageOut(
            scope="org", total=orgs[0].license_quota, used=used, pending_invites=pending, by_org=[]
        )
    company = db.get(Company, orgs[0].company_id) if orgs else None
    return LicenseUsageOut(
        scope="company",
        total=company.licenses_total if company else 0,
        used=used,
        pending_invites=pending,
        by_org=by_org if len(by_org) > 1 else [],
    )
