"""Demo seed: 1 HG superadmin + 2 demo orgs (Acme, Globex) con rosters realistas.

Idempotente: get-or-create por slug / (org, email) y upsert de nombre/rol/manager.
Re-ejecutable con ``make seed``. Los emails y nombres realistas viven en
``seed_data/realistic_names.py`` (AOD-05).

Corre como ``hg`` (superusuario en dev → BYPASSRLS), por lo que no requiere
contexto de tenant para insertar filas con RLS.

Emails/nombres demo (todos ``.test``, RFC 2606 — no rebotan). Passwords en
``scripts/seed_data/README.md``.
"""
from __future__ import annotations

import hashlib
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from hg.core.security import hash_password
from hg.db import SessionLocal
from hg.modules.identity.invitations import Invitation
from hg.modules.identity.models import Organization, OrgTier, User, UserRole
from hg.scripts.seed_data.realistic_names import (
    ACME_PROSPECTS,
    ACME_USERS,
    GLOBEX_USERS,
    email_from,
)

# Password demo por org (documentado en seed_data/README.md).
ACME_PWD = "AcmeDemo#2026"
GLOBEX_PWD = "GlobexDemo#2026"
HG_PWD = "HGsuper#2026"

# Remapeo idempotente de emails viejos (seed anterior / aceptación de invites)
# → nuevos realistas. Guardado a direcciones .test demo conocidas: en prod estas
# no existen, así que el UPDATE afecta 0 filas (no toca datos reales).
# {slug: {old_email: new_email}}
LEGACY_USER_EMAILS: dict[str, dict[str, str]] = {
    "acme": {
        "admin@acme.test": "maria.fernandez@acme.test",
        "collab1@acme.test": "carlos.rodriguez@acme.test",
        "collab2@acme.test": "ana.mendez@acme.test",
        "collab3@acme.test": "diego.hernandez@acme.test",
        "newhire@acme.test": "sofia.castro@acme.test",
    },
    "globex": {
        "admin@globex.test": "roberto.soto@globex.test",
        "collab1@globex.test": "lucia.vargas@globex.test",
        "collab2@globex.test": "javier.morales@globex.test",
        "collab3@globex.test": "camila.jimenez@globex.test",
    },
}

# Invitaciones viejas de Acme con prefijo UUID / genérico → prospects realistas.
LEGACY_INVITE_EMAILS: dict[str, str] = {
    "prospect0-e11af@acme.test": "andres.vega@acme.test",
    "prospect1-430c6@acme.test": "valeria.quiros@acme.test",
    "preview@acme.test": "fernando.picado@acme.test",
}


def _get_or_create_org(db: Session, *, slug: str, **kwargs) -> Organization:
    org = db.execute(select(Organization).where(Organization.slug == slug)).scalar_one_or_none()
    if org:
        return org
    org = Organization(slug=slug, **kwargs)
    db.add(org)
    db.flush()
    return org


def _upsert_user(
    db: Session, *, org: Organization, email: str, password: str, full_name: str,
    role: UserRole, manager_id=None,
) -> User:
    """Get-or-create por (org, email); si existe, actualiza nombre/rol/manager/password.

    Idempotente: no duplica filas. Actualizar el password en cada corrida
    garantiza credenciales deterministas para la demo.
    """
    user = db.execute(
        select(User).where(User.org_id == org.id, User.email == email)
    ).scalar_one_or_none()
    if user:
        user.full_name = full_name
        user.role = role
        user.manager_id = manager_id
        user.hashed_password = hash_password(password)
        return user
    user = User(
        org_id=org.id,
        email=email,
        hashed_password=hash_password(password),
        full_name=full_name,
        role=role,
        manager_id=manager_id,
    )
    db.add(user)
    db.flush()
    if org.licenses_total:
        org.licenses_used += 1
    return user


def _remap_legacy_emails(db: Session, org: Organization) -> None:
    """Renombra en sitio los emails viejos → nuevos (preserva FKs/manager_id).

    Corre ANTES del upsert del roster: así el upsert encuentra la fila renombrada
    y no crea duplicados. No-op si la fila ya fue renombrada (idempotente).
    """
    for old_email, new_email in LEGACY_USER_EMAILS.get(org.slug, {}).items():
        row = db.execute(
            select(User).where(User.org_id == org.id, User.email == old_email)
        ).scalar_one_or_none()
        if row and not db.execute(
            select(User).where(User.org_id == org.id, User.email == new_email)
        ).scalar_one_or_none():
            row.email = new_email
    # autoflush=False: forzar el rename antes de que el roster consulte por el
    # email nuevo (si no, el upsert no lo encuentra e intenta INSERT → colisión).
    db.flush()


def _seed_org(
    db: Session, *, name: str, slug: str, roster: list[tuple[str, str, str, str | None]],
    password: str,
) -> Organization:
    org = _get_or_create_org(
        db, slug=slug, name=name, tier=OrgTier.B, licenses_total=50, billing_status="active"
    )
    _remap_legacy_emails(db, org)

    # Pass 1: crear/actualizar todos los usuarios (sin manager aún).
    by_email: dict[str, User] = {}
    for first, last, role, _mgr in roster:
        email = email_from(first, last, f"{slug}.test")
        by_email[email] = _upsert_user(
            db, org=org, email=email, password=password,
            full_name=f"{first} {last}", role=UserRole(role),
        )
    db.flush()

    # Pass 2: enlazar manager_id según el grafo del roster.
    for first, last, _role, mgr_email in roster:
        if not mgr_email:
            continue
        email = email_from(first, last, f"{slug}.test")
        manager = by_email.get(mgr_email)
        if manager:
            by_email[email].manager_id = manager.id
    return org


def _seed_acme_invitations(db: Session, org: Organization, invited_by: User) -> None:
    """Invitaciones realistas de Acme (mix de estados). Idempotente por (org,email)."""
    # Renombrar invitaciones viejas feas antes de sembrar (evita duplicados).
    for old_email, new_email in LEGACY_INVITE_EMAILS.items():
        row = db.execute(
            select(Invitation).where(Invitation.org_id == org.id, Invitation.email == old_email)
        ).scalar_one_or_none()
        if row and not db.execute(
            select(Invitation).where(Invitation.org_id == org.id, Invitation.email == new_email)
        ).scalar_one_or_none():
            row.email = new_email
    db.flush()

    now = datetime.now(UTC)
    for first, last, status in ACME_PROSPECTS:
        email = email_from(first, last, "acme.test")
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
                    # token opaco determinista (solo dev/demo; nunca se envía).
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
        # Org interna de HG para el superadmin global.
        hg_org = _get_or_create_org(
            db, slug="hg", name="Human Growth", tier=OrgTier.A,
            licenses_total=999, billing_status="internal",
        )
        _upsert_user(
            db, org=hg_org, email="superadmin@humangrowth.app", password=HG_PWD,
            full_name="HG Superadmin", role=UserRole.superadmin,
        )

        acme = _seed_org(db, name="Acme Corp", slug="acme", roster=ACME_USERS, password=ACME_PWD)
        _seed_org(db, name="Globex Ltd", slug="globex", roster=GLOBEX_USERS, password=GLOBEX_PWD)

        acme_admin = db.execute(
            select(User).where(User.org_id == acme.id, User.email == "maria.fernandez@acme.test")
        ).scalar_one()
        _seed_acme_invitations(db, acme, acme_admin)

        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

    print("Seed OK (AOD-05 · emails realistas):")
    print("  - HG superadmin : superadmin@humangrowth.app")
    print("  - acme  (admin) : maria.fernandez@acme.test  (+ carlos/ana/diego/sofia)")
    print("  - globex(admin) : roberto.soto@globex.test   (+ lucia[mgr]/javier/camila)")
    print("  - acme invites  : andres.vega / valeria.quiros / fernando.picado / mariana.salas")
    print("  Credenciales: src/hg/scripts/seed_data/README.md")


if __name__ == "__main__":
    run()
