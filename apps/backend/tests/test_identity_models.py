"""Tests for Capa 1 identity models (DEV-03)."""
from __future__ import annotations

from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from hg.modules.identity.models import (
    CareerLevel,
    Company,
    Organization,
    OrgTier,
    User,
    UserRole,
    UserSession,
)


def _make_org(db: Session, *, slug: str | None = None, name: str = "Acme") -> Organization:
    # Slug único por defecto: la DB es compartida y puede tener datos de seed.
    # Capa Empresa (CE-01): la org vive bajo una Company.
    company = Company(name=name, slug=f"c-{uuid4().hex[:10]}")
    db.add(company)
    db.flush()
    org = Organization(
        name=name, slug=slug or f"t-{uuid4().hex[:10]}", tier=OrgTier.B, company_id=company.id
    )
    db.add(org)
    db.flush()
    return org


def test_insert_and_read_back_org_user_session(db: Session) -> None:
    org = _make_org(db)

    user = User(
        org_id=org.id,
        company_id=org.company_id,
        email="alice@acme.com",
        hashed_password="x" * 20,
        full_name="Alice Doe",
        role=UserRole.collaborator,
        career_level=CareerLevel.L2,
        job_title="Engineer",
        department="R&D",
    )
    db.add(user)
    db.flush()

    session = UserSession(
        user_id=user.id,
        org_id=org.id,
        refresh_token_hash="hash-" + "a" * 20,
        device_info={"ua": "pytest"},
        ip_address="127.0.0.1",
        expires_at=datetime.now(UTC) + timedelta(days=14),
    )
    db.add(session)
    db.flush()

    # Read back
    fetched_user = db.execute(select(User).where(User.id == user.id)).scalar_one()
    assert fetched_user.email == "alice@acme.com"
    assert fetched_user.org_id == org.id
    assert fetched_user.career_level is CareerLevel.L2
    assert fetched_user.role is UserRole.collaborator

    fetched_session = db.execute(
        select(UserSession).where(UserSession.id == session.id)
    ).scalar_one()
    assert fetched_session.user_id == user.id
    assert fetched_session.org_id == org.id
    assert fetched_session.device_info == {"ua": "pytest"}


def test_org_defaults(db: Session) -> None:
    company = Company(name="Defaults Inc", slug=f"c-{uuid4().hex[:10]}")
    db.add(company)
    db.flush()
    org = Organization(name="Defaults Inc", slug=f"t-{uuid4().hex[:10]}", company_id=company.id)
    db.add(org)
    db.flush()
    db.refresh(org)
    assert org.tier is OrgTier.C  # default
    assert org.billing_status == "trial"
    # Capa Empresa (CE-01): licenses_total (cap) es nullable sin default → NULL
    # (sin cap propio; consume del pool de la Company). licenses_used default 0.
    assert org.licenses_total is None
    assert org.licenses_used == 0
    assert org.settings == {}
    assert org.is_active is True


def test_same_email_different_orgs_allowed(db: Session) -> None:
    org_a = _make_org(db)
    org_b = _make_org(db)

    db.add(
        User(
            org_id=org_a.id,
            company_id=org_a.company_id,
            email="dup@example.com",
            hashed_password="x" * 20,
            full_name="A",
        )
    )
    db.add(
        User(
            org_id=org_b.id,
            company_id=org_b.company_id,
            email="dup@example.com",
            hashed_password="x" * 20,
            full_name="B",
        )
    )
    # Same email, different org -> no violation
    db.flush()


def test_same_email_same_org_rejected(db: Session) -> None:
    org = _make_org(db)
    db.add(
        User(
            org_id=org.id,
            company_id=org.company_id,
            email="dup@example.com",
            hashed_password="x" * 20,
            full_name="A",
        )
    )
    db.flush()

    db.add(
        User(
            org_id=org.id,
            company_id=org.company_id,
            email="dup@example.com",
            hashed_password="x" * 20,
            full_name="B",
        )
    )
    with pytest.raises(IntegrityError):
        db.flush()  # violates uq_users_org_email
