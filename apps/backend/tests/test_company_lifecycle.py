"""LC-03: servicio único de transiciones de Empresa (ADR-0016)."""
from __future__ import annotations

from datetime import UTC, datetime, timedelta
from itertools import product
from uuid import uuid4

import pytest
from fastapi import HTTPException
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from hg.core.security import hash_password
from hg.modules.company.lifecycle import (
    ALLOWED_TRANSITIONS,
    STATUSES,
    transition_company,
)
from hg.modules.company.models import CompanyLifecycleEvent
from hg.modules.identity.invitations import Invitation
from hg.modules.identity.models import Company, Organization, User, UserRole


def _company(db: Session, status: str = "active", **kw) -> Company:
    c = Company(name="LC", slug=f"lc-{uuid4().hex[:10]}", licenses_total=10, status=status, **kw)
    db.add(c)
    db.flush()
    return c


def _org(db: Session, company: Company) -> Organization:
    o = Organization(name="Org", slug=f"o-{uuid4().hex[:10]}", company_id=company.id)
    db.add(o)
    db.flush()
    return o


def _user(db: Session, company: Company, role=UserRole.collaborator, org=None, active=True) -> User:
    org = org or _org(db, company)
    u = User(
        org_id=org.id,
        company_id=company.id,
        email=f"u-{uuid4().hex[:10]}@hgtest.test",
        hashed_password=hash_password("Passw0rd!!"),
        full_name="U",
        role=role,
        is_active=active,
    )
    db.add(u)
    db.flush()
    return u


def _events(db: Session, company: Company) -> list[CompanyLifecycleEvent]:
    return list(
        db.scalars(select(CompanyLifecycleEvent).where(CompanyLifecycleEvent.company_id == company.id))
    )


def _go(db: Session, company: Company, to: str, reason: str | None = "motivo", **kw):
    return transition_company(db, company_id=company.id, to_status=to, actor=None, reason=reason, **kw)


@pytest.mark.parametrize(
    ("src", "dst"),
    [(s, d) for s, d in product(STATUSES, STATUSES) if d in ALLOWED_TRANSITIONS[s]],
)
def test_valid_transitions(db: Session, src: str, dst: str) -> None:
    c = _company(db, status=src)
    _go(db, c, dst)
    db.refresh(c)
    assert c.status == dst
    ev = _events(db, c)
    assert len(ev) == 1
    assert (ev[0].event_type, ev[0].from_status, ev[0].to_status) == ("status_change", src, dst)


@pytest.mark.parametrize(
    ("src", "dst"),
    [(s, d) for s, d in product(STATUSES, STATUSES) if d not in ALLOWED_TRANSITIONS[s]],
)
def test_invalid_transitions_409(db: Session, src: str, dst: str) -> None:
    c = _company(db, status=src)
    with pytest.raises(HTTPException) as e:
        _go(db, c, dst)
    assert e.value.status_code == 409
    assert e.value.detail["code"] == "invalid_transition"
    db.refresh(c)
    assert c.status == src
    assert _events(db, c) == []


def test_transition_matrix_is_exactly_the_adr() -> None:
    assert {(s, d) for s, ds in ALLOWED_TRANSITIONS.items() for d in ds} == {
        ("trial", "active"), ("trial", "grace"), ("active", "grace"), ("grace", "active"),
        ("grace", "suspended"), ("active", "suspended"), ("suspended", "active"),
        ("suspended", "terminated"), ("terminated", "suspended"),
    }  # fmt: skip


def test_unknown_status_422(db: Session) -> None:
    c = _company(db)
    with pytest.raises(HTTPException) as e:
        _go(db, c, "bogus")
    assert e.value.status_code == 422


def test_company_not_found_404(db: Session) -> None:
    with pytest.raises(HTTPException) as e:
        transition_company(db, company_id=uuid4(), to_status="grace", actor=None, reason=None)
    assert e.value.status_code == 404


@pytest.mark.parametrize(("src", "dst"), [("active", "suspended"), ("grace", "suspended"), ("suspended", "terminated")])
@pytest.mark.parametrize("reason", [None, "", "   "])
def test_reason_required(db: Session, src: str, dst: str, reason) -> None:
    c = _company(db, status=src)
    with pytest.raises(HTTPException) as e:
        _go(db, c, dst, reason=reason)
    assert e.value.status_code == 422
    assert e.value.detail["code"] == "reason_required"
    assert _events(db, c) == []


def test_reason_not_required_for_grace_and_active(db: Session) -> None:
    c = _company(db, status="active")
    _go(db, c, "grace", reason=None)
    _go(db, c, "active", reason=None)
    db.refresh(c)
    assert c.status == "active"
    assert len(_events(db, c)) == 2


def test_grace_sets_and_clears_grace_ends_at(db: Session) -> None:
    c = _company(db, status="active", grace_days=10)
    before = datetime.now(UTC)
    _go(db, c, "grace", reason=None)
    db.refresh(c)
    assert c.grace_ends_at is not None
    assert before + timedelta(days=10) <= c.grace_ends_at <= datetime.now(UTC) + timedelta(days=10)
    _go(db, c, "suspended")
    db.refresh(c)
    assert c.grace_ends_at is None
    assert c.status_reason == "motivo"


def test_event_records_actor_and_reason(db: Session) -> None:
    c = _company(db)
    su = _user(db, _company(db), role=UserRole.superadmin)
    transition_company(db, company_id=c.id, to_status="suspended", actor=su, reason=" impago ")
    (ev,) = _events(db, c)
    assert ev.actor_user_id == su.id
    assert ev.reason == "impago"


def test_dry_run_writes_nothing_and_previews(db: Session) -> None:
    c = _company(db, status="active", grace_days=15)
    org = _org(db, c)
    _user(db, c, org=org)
    _user(db, c, org=org)
    _user(db, c, role=UserRole.company_admin, org=org)
    _user(db, c, org=org, active=False)  # inactivo: no cuenta
    db.add_all(
        [
            Invitation(org_id=org.id, email="a@hgtest.test", role=UserRole.collaborator,
                       token_hash=uuid4().hex, expires_at=datetime.now(UTC) + timedelta(days=3)),
            Invitation(org_id=org.id, email="b@hgtest.test", role=UserRole.collaborator,
                       token_hash=uuid4().hex, expires_at=datetime.now(UTC) - timedelta(days=1)),  # vencida
            Invitation(org_id=org.id, email="c@hgtest.test", role=UserRole.collaborator,
                       token_hash=uuid4().hex, expires_at=datetime.now(UTC) + timedelta(days=3),
                       revoked_at=datetime.now(UTC)),  # revocada
        ]
    )  # fmt: skip
    db.flush()

    p = _go(db, c, "grace", reason=None, dry_run=True)

    assert p.active_users_by_role == {"collaborator": 2, "company_admin": 1}
    assert p.active_users_total == 3
    assert p.pending_invitations == 1
    assert p.admins == 1
    assert p.grace_ends_at is not None
    assert (p.from_status, p.to_status) == ("active", "grace")
    db.refresh(c)
    assert c.status == "active"
    assert c.grace_ends_at is None
    assert _events(db, c) == []


def test_dry_run_still_validates(db: Session) -> None:
    c = _company(db, status="active")
    with pytest.raises(HTTPException) as e:
        _go(db, c, "terminated", dry_run=True)
    assert e.value.status_code == 409


def test_transition_does_not_touch_users(db: Session) -> None:
    c = _company(db)
    u = _user(db, c)
    _go(db, c, "suspended")
    db.refresh(u)
    assert u.is_active is True


def test_last_superadmin_company_cannot_be_suspended(db: Session) -> None:
    home = _company(db)
    su = _user(db, home, role=UserRole.superadmin)
    # Aislar de superadmins sembrados en la DB (se revierte con el rollback del test).
    db.execute(
        text("UPDATE users SET is_active = false WHERE role = 'superadmin' AND id <> :i"), {"i": su.id}
    )
    for dst in ("suspended",):
        with pytest.raises(HTTPException) as e:
            _go(db, home, dst)
        assert e.value.status_code == 409
        assert e.value.detail["code"] == "last_superadmin"
    db.refresh(home)
    assert home.status == "active"
    assert _events(db, home) == []


def test_suspend_allowed_when_another_superadmin_exists(db: Session) -> None:
    home = _company(db)
    _user(db, home, role=UserRole.superadmin)
    _user(db, _company(db), role=UserRole.superadmin)
    _go(db, home, "suspended")
    db.refresh(home)
    assert home.status == "suspended"


def test_inactive_superadmin_does_not_block(db: Session) -> None:
    c = _company(db)
    _user(db, c, role=UserRole.superadmin, active=False)
    db.execute(text("UPDATE users SET is_active = false WHERE role = 'superadmin'"))
    _go(db, c, "suspended")
    db.refresh(c)
    assert c.status == "suspended"
