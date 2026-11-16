"""LC-02: esquema del ciclo de vida de Empresa + auditoría append-only (ADR-0016)."""
from __future__ import annotations

from uuid import uuid4

import pytest
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError, IntegrityError
from sqlalchemy.orm import Session

from hg.modules.identity.models import Company


def _company(db: Session) -> Company:
    c = Company(name="LC Co", slug=f"lc-{uuid4().hex[:10]}", licenses_total=10)
    db.add(c)
    db.flush()
    return c


def _insert_event(db: Session, company_id) -> None:
    db.execute(
        text(
            "INSERT INTO company_lifecycle_events (id, company_id, event_type, to_status) "
            "VALUES (:id, :cid, 'status_change', 'active')"
        ),
        {"id": uuid4(), "cid": company_id},
    )


def test_company_defaults(db: Session) -> None:
    c = _company(db)
    db.refresh(c)
    assert c.status == "active"
    assert c.grace_days == 30
    assert c.grace_ends_at is None
    assert c.status_changed_at is not None


def test_status_check_constraint(db: Session) -> None:
    c = _company(db)
    with pytest.raises(IntegrityError), db.begin_nested():
        db.execute(text("UPDATE companies SET status = 'bogus' WHERE id = :i"), {"i": c.id})


@pytest.mark.parametrize("days", [-1, 181])
def test_grace_days_check_constraint(db: Session, days: int) -> None:
    c = _company(db)
    with pytest.raises(IntegrityError), db.begin_nested():
        db.execute(text("UPDATE companies SET grace_days = :d WHERE id = :i"), {"d": days, "i": c.id})


@pytest.mark.parametrize("role", ["hg_superadmin", "hg_app"])
@pytest.mark.parametrize("stmt", ["UPDATE company_lifecycle_events SET reason = 'x'", "DELETE FROM company_lifecycle_events"])
def test_events_are_append_only(db: Session, role: str, stmt: str) -> None:
    c = _company(db)
    _insert_event(db, c.id)  # como superuser, solo para tener una fila
    with pytest.raises(DBAPIError, match="permission denied"), db.begin_nested():
        db.execute(text(f"SET LOCAL ROLE {role}"))
        db.execute(text(stmt))


def test_superadmin_can_insert_and_select_events(db: Session) -> None:
    c = _company(db)
    db.execute(text("SET LOCAL ROLE hg_superadmin"))
    _insert_event(db, c.id)
    n = db.execute(
        text("SELECT count(*) FROM company_lifecycle_events WHERE company_id = :c"), {"c": c.id}
    ).scalar_one()
    assert n == 1
    db.execute(text("RESET ROLE"))


def test_hg_app_cannot_touch_events(db: Session) -> None:
    c = _company(db)
    with pytest.raises(DBAPIError, match="permission denied"), db.begin_nested():
        db.execute(text("SET LOCAL ROLE hg_app"))
        _insert_event(db, c.id)
