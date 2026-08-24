"""Demo seed: HG superadmin + empresas demo (Company → Orgs) con actividad.

Estructura (ago-2026): cada empresa tiene un ``admin`` que gestiona TODA la
empresa (todas sus orgs + dashboard) y varias organizaciones, cada una con un
``manager`` y 2-8 colaboradores. Ejemplo: Acme Corp → IT / Finanzas /
Manufactura. Se siembra además **actividad realista** (attempts + bloques
completados con recencia variada) para que el dashboard RRHH y los buckets de
inactividad muestren datos con sentido.

Idempotente: get-or-create por slug / (org, email) / (user, unit) / (attempt,
block). Re-ejecutable con ``make seed``. Corre como ``hg`` (superusuario en dev
→ BYPASSRLS). Requiere que existan learning units publicadas para la actividad
(``python -m hg.scripts.seed_learning_units`` primero); si no hay, la actividad
se omite con un warning.

Emails/nombres demo (todos ``.test``, RFC 2606 — no rebotan). Passwords en
``scripts/seed_data/README.md``.
"""
from __future__ import annotations

import hashlib
from datetime import UTC, datetime, timedelta

from sqlalchemy import delete, select, update
from sqlalchemy.orm import Session

from hg.core.security import hash_password
from hg.db import SessionLocal
from hg.modules.identity.invitations import Invitation
from hg.modules.identity.models import Company, Organization, OrgTier, User, UserRole
from hg.modules.learning_units.models import (
    BlockProgress,
    BlockProgressStatus,
    LearningUnit,
    LearningUnitAttempt,
)
from hg.scripts.seed_data.realistic_names import (
    ACME_PROSPECTS,
    DEMO_COMPANIES,
    email_from,
)

HG_PWD = "HGsuper#2026"

# Perfiles de actividad (deterministas por índice de usuario): rota entre
# usuarios para poblar los buckets de inactividad. (días_desde_última_actividad,
# unidades_completadas). None = usuario que nunca entró.
_ACTIVITY_PROFILES: list[tuple[int | None, int]] = [
    (2, 3), (1, 2), (4, 3), (3, 2), (5, 2), (2, 3),  # activos (≤7d)
    (10, 2), (15, 1), (18, 1),                        # rezagados (activos ≤21d)
    (26, 1), (33, 1),                                 # inactivos (>21d)
    (None, 0),                                        # nunca activo
]


# Demos viejos (una sola org por empresa) a purgar para un refresh limpio.
_LEGACY_ORG_SLUGS = ("acme", "globex")
_LEGACY_COMPANY_SLUGS = ("acme-co", "globex-co")


# ── Purga del demo viejo ─────────────────────────────────────────────────────

def _purge_legacy_demo(db: Session) -> int:
    """Elimina los demos viejos (org única por empresa) para un refresh limpio.

    El seed anterior creaba orgs slug ``acme``/``globex`` bajo companies wrapper
    ``acme-co``/``globex-co``. La estructura nueva usa la Company como
    ``acme``/``globex`` con orgs ``acme-it``… (slugs que NO colisionan), así que
    borrar los viejos es seguro. Los hijos de cada user caen por ON DELETE CASCADE;
    solo hay que anular antes las referencias self de ``manager_id``.
    """
    old_orgs = list(
        db.scalars(select(Organization.id).where(Organization.slug.in_(_LEGACY_ORG_SLUGS))).all()
    )
    n_users = 0
    if old_orgs:
        uids = list(db.scalars(select(User.id).where(User.org_id.in_(old_orgs))).all())
        n_users = len(uids)
        if uids:
            db.execute(update(User).where(User.manager_id.in_(uids)).values(manager_id=None))
            db.execute(delete(User).where(User.id.in_(uids)))
        db.execute(delete(Organization).where(Organization.id.in_(old_orgs)))
    # Companies wrapper viejas (ya sin orgs tras el borrado anterior).
    db.execute(delete(Company).where(Company.slug.in_(_LEGACY_COMPANY_SLUGS)))
    db.flush()
    return n_users


# ── Company / Org / User helpers ────────────────────────────────────────────

def _goc_company(
    db: Session, *, slug: str, name: str, licenses_total: int, tier: OrgTier = OrgTier.B,
    billing_status: str = "active",
) -> Company:
    # CE-06: tier / billing / pool de licencias viven en la Empresa (no en la org).
    company = db.execute(select(Company).where(Company.slug == slug)).scalar_one_or_none()
    if company:
        company.name = name
        company.licenses_total = licenses_total
        return company
    company = Company(
        slug=slug, name=name, licenses_total=licenses_total,
        tier=tier, billing_status=billing_status,
    )
    db.add(company)
    db.flush()
    return company


def _goc_org(
    db: Session, *, company: Company, slug: str, name: str, license_quota: int = 0
) -> Organization:
    # La org es la unidad operativa (CE-06); CE-07: cupo de licencias del pool.
    org = db.execute(select(Organization).where(Organization.slug == slug)).scalar_one_or_none()
    if org:
        org.name = name
        org.company_id = company.id
        org.license_quota = license_quota
        return org
    org = Organization(slug=slug, name=name, company_id=company.id, license_quota=license_quota)
    db.add(org)
    db.flush()
    return org


def _upsert_user(
    db: Session, *, org: Organization, email: str, password: str, full_name: str,
    role: UserRole, manager_id=None,
) -> User:
    """Get-or-create por (org, email); si existe, actualiza nombre/rol/pass."""
    user = db.execute(
        select(User).where(User.org_id == org.id, User.email == email)
    ).scalar_one_or_none()
    if user:
        user.full_name = full_name
        user.role = role
        user.manager_id = manager_id
        user.company_id = org.company_id
        user.hashed_password = hash_password(password)
        return user
    user = User(
        org_id=org.id,
        company_id=org.company_id,
        email=email,
        hashed_password=hash_password(password),
        full_name=full_name,
        role=role,
        manager_id=manager_id,
    )
    db.add(user)
    db.flush()
    return user


def _seed_company(db: Session, spec: dict) -> tuple[Organization, User, list[User]]:
    """Crea la empresa, sus orgs, el admin (company-wide) y los rosters.

    Devuelve (org_principal, admin, colaboradores+managers) para actividad.
    """
    company = _goc_company(
        db, slug=spec["slug"], name=spec["name"], licenses_total=spec["licenses_total"]
    )
    domain = spec["domain"]
    orgs: dict[str, Organization] = {}
    for o in spec["orgs"]:
        orgs[o["slug"]] = _goc_org(
            db, company=company, slug=o["slug"], name=o["name"],
            license_quota=o.get("licenses", 0),
        )
    db.flush()

    # Admin de la empresa (rol unificado) → vive en la primera org, gestiona todo.
    first_org = orgs[spec["orgs"][0]["slug"]]
    admin_email = email_from(spec["admin"][0], spec["admin"][1], domain)
    admin = _upsert_user(
        db, org=first_org, email=admin_email, password=spec["password"],
        full_name=f'{spec["admin"][0]} {spec["admin"][1]}', role=UserRole.admin,
    )
    db.flush()

    # Pass 1: crear managers + colaboradores.
    by_email: dict[str, User] = {admin_email: admin}
    activity_users: list[User] = []
    for o in spec["orgs"]:
        org = orgs[o["slug"]]
        for first, last, role, _mgr in o["roster"]:
            email = email_from(first, last, domain)
            u = _upsert_user(
                db, org=org, email=email, password=spec["password"],
                full_name=f"{first} {last}", role=UserRole(role),
            )
            by_email[email] = u
            activity_users.append(u)
    db.flush()

    # Pass 2: grafo de reporte — managers → admin; colaboradores → su manager.
    for o in spec["orgs"]:
        for first, last, role, mgr_lp in o["roster"]:
            email = email_from(first, last, domain)
            if role == "manager":
                by_email[email].manager_id = admin.id
            elif mgr_lp:
                mgr = by_email.get(f"{mgr_lp}@{domain}")
                if mgr:
                    by_email[email].manager_id = mgr.id
    db.flush()

    return first_org, admin, activity_users


# ── Actividad (attempts + bloques completados) ──────────────────────────────

def _goc_attempt(
    db: Session, *, user: User, unit: LearningUnit, started_at: datetime,
    completed_at: datetime | None,
) -> LearningUnitAttempt:
    a = db.execute(
        select(LearningUnitAttempt).where(
            LearningUnitAttempt.user_id == user.id, LearningUnitAttempt.unit_id == unit.id
        )
    ).scalar_one_or_none()
    if a:
        a.started_at = started_at
        a.completed_at = completed_at
        return a
    a = LearningUnitAttempt(
        user_id=user.id, unit_id=unit.id, org_id=user.org_id,
        started_at=started_at, completed_at=completed_at,
    )
    db.add(a)
    db.flush()
    return a


def _goc_block_progress(
    db: Session, *, attempt: LearningUnitAttempt, block_id, submitted_at: datetime
) -> None:
    bp = db.execute(
        select(BlockProgress).where(
            BlockProgress.attempt_id == attempt.id, BlockProgress.unit_block_id == block_id
        )
    ).scalar_one_or_none()
    if bp:
        bp.status = BlockProgressStatus.completed
        bp.submitted_at = submitted_at
        return
    db.add(
        BlockProgress(
            attempt_id=attempt.id, unit_block_id=block_id,
            status=BlockProgressStatus.completed, submitted_at=submitted_at,
        )
    )


def _seed_activity(db: Session, users: list[User]) -> int:
    """Siembra attempts + bloques completados con recencia variada por perfil."""
    units = list(
        db.scalars(
            select(LearningUnit)
            .where(LearningUnit.published_at.is_not(None))
            .order_by(LearningUnit.created_at)
        ).all()
    )
    if not units:
        print("  ⚠ actividad omitida: no hay learning units publicadas "
              "(corré `python -m hg.scripts.seed_learning_units` primero).")
        return 0

    now = datetime.now(UTC)
    seeded = 0
    for idx, user in enumerate(users):
        days_ago, k = _ACTIVITY_PROFILES[idx % len(_ACTIVITY_PROFILES)]
        if days_ago is None or k == 0:
            continue
        for j in range(min(k, len(units))):
            unit = units[j]
            # La unidad más reciente (j = k-1) se completó hace `days_ago`; las
            # anteriores, escalonadas hacia atrás (3 días c/u).
            unit_days_ago = days_ago + (k - 1 - j) * 3
            completed_at = now - timedelta(days=unit_days_ago)
            started_at = completed_at - timedelta(days=1)
            attempt = _goc_attempt(
                db, user=user, unit=unit, started_at=started_at, completed_at=completed_at
            )
            blocks = list(unit.blocks)
            n = max(len(blocks), 1)
            for bi, block in enumerate(blocks):
                frac = (bi + 1) / n
                submitted = started_at + (completed_at - started_at) * frac
                _goc_block_progress(db, attempt=attempt, block_id=block.id, submitted_at=submitted)
        seeded += 1
        db.flush()
    return seeded


def _seed_invitations(db: Session, org: Organization, invited_by: User, domain: str) -> None:
    """Invitaciones demo (mix de estados) en la org dada. Idempotente por (org,email)."""
    now = datetime.now(UTC)
    for first, last, status in ACME_PROSPECTS:
        email = email_from(first, last, domain)
        if status == "expired":
            expires_at, accepted_at = now - timedelta(days=3), None
        elif status == "accepted":
            expires_at, accepted_at = now + timedelta(days=11), now - timedelta(days=2)
        else:  # pending
            expires_at, accepted_at = now + timedelta(days=14), None

        inv = db.execute(
            select(Invitation).where(Invitation.org_id == org.id, Invitation.email == email)
        ).scalar_one_or_none()
        if inv:
            inv.role = UserRole.collaborator
            inv.expires_at = expires_at
            inv.accepted_at = accepted_at
            inv.invited_by_user_id = invited_by.id
        else:
            db.add(
                Invitation(
                    org_id=org.id,
                    email=email,
                    role=UserRole.collaborator,
                    token_hash=hashlib.sha256(f"seed:{org.id}:{email}".encode()).hexdigest(),
                    invited_by_user_id=invited_by.id,
                    expires_at=expires_at,
                    accepted_at=accepted_at,
                )
            )


def run() -> None:
    db = SessionLocal()
    try:
        db.begin()
        # Refresh: eliminar el demo viejo (org única) antes de recrear la estructura.
        purged = _purge_legacy_demo(db)
        # Org interna de HG para el superadmin global.
        hg_company = _goc_company(
            db, slug="hg", name="Human Growth", licenses_total=999,
            tier=OrgTier.A, billing_status="internal",
        )
        hg_org = _goc_org(db, company=hg_company, slug="hg", name="Human Growth")
        _upsert_user(
            db, org=hg_org, email="superadmin@humangrowth.io", password=HG_PWD,
            full_name="HG Superadmin", role=UserRole.superadmin,
        )

        all_activity_users: list[User] = []
        first_company_ctx: tuple[Organization, User, str] | None = None
        for spec in DEMO_COMPANIES:
            first_org, admin, activity_users = _seed_company(db, spec)
            all_activity_users.extend(activity_users)
            if first_company_ctx is None:
                first_company_ctx = (first_org, admin, spec["domain"])

        # Invitaciones demo en la primera org de la primera empresa (Acme · IT).
        if first_company_ctx is not None:
            org, admin, domain = first_company_ctx
            _seed_invitations(db, org, admin, domain)

        seeded = _seed_activity(db, all_activity_users)

        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

    print("Seed OK (Company → Orgs + actividad):")
    if purged:
        print(f"  - purgado demo viejo: {purged} usuarios (orgs únicas acme/globex)")
    for spec in DEMO_COMPANIES:
        admin_email = email_from(spec["admin"][0], spec["admin"][1], spec["domain"])
        orgs = " / ".join(o["name"] for o in spec["orgs"])
        print(f"  - {spec['name']:11} admin={admin_email}  orgs=[{orgs}]")
    print("  - HG superadmin : superadmin@humangrowth.io")
    print(f"  - actividad     : {seeded} usuarios con attempts/bloques completados")
    print("  Credenciales: src/hg/scripts/seed_data/README.md")


if __name__ == "__main__":
    run()
