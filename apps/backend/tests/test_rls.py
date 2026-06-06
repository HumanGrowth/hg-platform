"""Tests for Row Level Security tenant isolation (DEV-04).

The ``db`` fixture connects as the dev superuser (``hg``), which BYPASSes
RLS — used here only to bootstrap rows across tenants. To verify that the
policies actually isolate tenants we switch the in-transaction role to the
non-superuser ``hg_app`` (``SET LOCAL ROLE``) and drive
``app.current_org_id`` exactly as the application will at runtime.
"""
from __future__ import annotations

import pytest
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError
from sqlalchemy.orm import Session

from hg.modules.identity.models import Organization, User


def _bootstrap_two_orgs(db: Session) -> tuple[Organization, Organization]:
    """Create org A + org B, each with exactly one user. Runs as superuser
    (RLS bypassed) so no org context is required for the inserts."""
    org_a = Organization(name="Org A", slug="org-a")
    org_b = Organization(name="Org B", slug="org-b")
    db.add_all([org_a, org_b])
    db.flush()

    db.add_all(
        [
            User(org_id=org_a.id, email="a@a.com", hashed_password="h" * 10, full_name="A"),
            User(org_id=org_b.id, email="b@b.com", hashed_password="h" * 10, full_name="B"),
        ]
    )
    db.flush()
    return org_a, org_b


def _count_users(db: Session) -> int:
    return db.execute(text("SELECT count(*) FROM users")).scalar_one()


def _set_org(db: Session, org_id) -> None:
    db.execute(
        text("SELECT set_config('app.current_org_id', :v, true)"), {"v": str(org_id)}
    )


def test_tenant_isolation_select(db: Session) -> None:
    org_a, org_b = _bootstrap_two_orgs(db)

    # Enforce RLS from here on by acting as the non-superuser app role.
    db.execute(text("SET LOCAL ROLE hg_app"))

    # Scoped to org A -> only A's user is visible.
    _set_org(db, org_a.id)
    assert _count_users(db) == 1
    visible = db.execute(text("SELECT email FROM users")).scalars().all()
    assert visible == ["a@a.com"]

    # Switch to org B -> only B's user is visible.
    _set_org(db, org_b.id)
    assert _count_users(db) == 1
    visible = db.execute(text("SELECT email FROM users")).scalars().all()
    assert visible == ["b@b.com"]

    # No org context set -> NULL filter -> zero rows, and no error.
    db.execute(text("RESET app.current_org_id"))
    assert _count_users(db) == 0


def test_with_check_blocks_cross_tenant_insert(db: Session) -> None:
    org_a, org_b = _bootstrap_two_orgs(db)

    db.execute(text("SET LOCAL ROLE hg_app"))
    _set_org(db, org_a.id)

    # Inserting a row for a DIFFERENT org than the current context must be
    # rejected by the policy's WITH CHECK clause (surfaces as a DBAPIError).
    with pytest.raises(DBAPIError):
        db.execute(
            text(
                "INSERT INTO users "
                "(id, org_id, email, hashed_password, full_name, role, is_active) "
                "VALUES (gen_random_uuid(), :oid, 'x@x.com', 'h', 'n', 'collaborator', true)"
            ),
            {"oid": str(org_b.id)},
        )
