"""Demo seed: 1 HG superadmin + 2 demo orgs (Acme, Globex) con admin + 3 collaborators c/u.

Idempotente: get-or-create por slug / (org, email). Re-ejecutable con ``make seed``.

Corre como ``hg`` (superusuario en dev → BYPASSRLS), por lo que no requiere
contexto de tenant para insertar filas con RLS.
"""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from hg.core.security import hash_password
from hg.db import SessionLocal
from hg.modules.identity.models import Organization, OrgTier, User, UserRole


def _get_or_create_org(db: Session, *, slug: str, **kwargs) -> tuple[Organization, bool]:
    org = db.execute(select(Organization).where(Organization.slug == slug)).scalar_one_or_none()
    if org:
        return org, False
    org = Organization(slug=slug, **kwargs)
    db.add(org)
    db.flush()
    return org, True


def _get_or_create_user(
    db: Session, *, org: Organization, email: str, password: str, full_name: str,
    role: UserRole, manager_id=None,
) -> tuple[User, bool]:
    existing = db.execute(
        select(User).where(User.org_id == org.id, User.email == email)
    ).scalar_one_or_none()
    if existing:
        return existing, False
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
    return user, True


def _seed_demo_org(db: Session, *, name: str, slug: str, admin_email: str, admin_pwd: str) -> None:
    org, _ = _get_or_create_org(
        db, slug=slug, name=name, tier=OrgTier.B, licenses_total=50, billing_status="active"
    )
    admin, _ = _get_or_create_user(
        db, org=org, email=admin_email, password=admin_pwd,
        full_name=f"{name} Admin", role=UserRole.admin,
    )
    for i in (1, 2, 3):
        # collab1 reporta al admin de la org.
        _get_or_create_user(
            db, org=org, email=f"collab{i}@{slug}.test", password="Collab#2026",
            full_name=f"{name} Collaborator {i}", role=UserRole.collaborator,
            manager_id=admin.id if i == 1 else None,
        )


def run() -> None:
    db = SessionLocal()
    try:
        db.begin()
        # Org interna de HG para el superadmin global.
        hg_org, _ = _get_or_create_org(
            db, slug="hg", name="Human Growth", tier=OrgTier.A,
            licenses_total=999, billing_status="internal",
        )
        _get_or_create_user(
            db, org=hg_org, email="superadmin@humangrowth.app", password="HGsuper#2026",
            full_name="HG Superadmin", role=UserRole.superadmin,
        )

        _seed_demo_org(db, name="Acme Corp", slug="acme",
                       admin_email="admin@acme.test", admin_pwd="AdminAcme#2026")
        _seed_demo_org(db, name="Globex Ltd", slug="globex",
                       admin_email="admin@globex.test", admin_pwd="AdminGlobex#2026")

        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

    print("Seed OK:")
    print("  - 1 superadmin (HG)  : superadmin@humangrowth.app")
    print("  - org acme   (50 lic): admin@acme.test   + collab1..3@acme.test")
    print("  - org globex (50 lic): admin@globex.test + collab1..3@globex.test")
    print("  Credenciales: ver docs/dev-credentials.md")


if __name__ == "__main__":
    run()
