"""Regression test for a prod incident: assessment service functions used to
call ``db.commit()`` mid-request (e.g. ``start_session``'s
``db.commit(); db.refresh(session)``). ``SET LOCAL ROLE hg_app`` and
``app.current_org_id`` (set once by ``get_current_user``) are transaction-
scoped and get wiped by any commit — so any RLS-scoped query run *after*
that commit within the same request (e.g. the router's ``_session_out``,
which reads ``assessment_responses``) broke.

Locally this didn't raise, because dev's ``app.current_org_id`` GUC has no
configured default (unset -> NULL -> RLS predicate is just false, zero
rows). In prod the GUC defaults to ``''``, so ``current_setting(...)::uuid``
raised ``psycopg.errors.InvalidTextRepresentation: invalid input syntax for
type uuid: ""`` — an unhandled 500 on every ``POST /assessment/sessions``.

These tests don't rely on that prod-specific GUC default to catch the bug:
they assert directly that the SET LOCAL context set before calling a
service function is *still active* immediately after it returns, which is
false under the old code (a mid-function commit resets it) regardless of
what the GUC's default happens to be in this environment.

Deliberately NOT using the ``db`` fixture: it wraps each test in an outer
transaction with ``join_transaction_mode="create_savepoint"``, so a
``Session.commit()`` performed by application code only releases a
SAVEPOINT rather than ending the real DBAPI transaction — which would
silently mask exactly the bug this test exists to catch (SET LOCAL survives
a savepoint release). A raw ``SessionLocal()`` — same pattern as the
``factory`` fixture — is required for ``commit()`` to have its real effect.
"""
from __future__ import annotations

from collections.abc import Generator

import pytest
from sqlalchemy import delete, text
from sqlalchemy.orm import Session

from hg.db import SessionLocal
from hg.modules.assessment import service
from hg.modules.assessment.enums import SessionKind
from hg.modules.identity.models import Organization, User


@pytest.fixture
def raw_db() -> Generator[Session, None, None]:
    """Un-wrapped session (real commits) bootstrapped/torn down as superuser."""
    s = SessionLocal()
    yield s
    s.rollback()
    s.close()


def _bootstrap_org_user(db: Session) -> tuple[Organization, User]:
    org = Organization(name="RLS Tx Org", slug=f"rls-tx-org-{id(db)}")
    db.add(org)
    db.commit()
    user = User(org_id=org.id, email=f"rlstx-{id(db)}@a.com", hashed_password="h" * 10, full_name="U")
    db.add(user)
    db.commit()
    return org, user


def _cleanup(db: Session, org: Organization) -> None:
    # Reset to the session's real login role (hg, superuser) regardless of
    # whichever transaction/role state the test body left us in.
    db.rollback()
    db.execute(delete(Organization).where(Organization.id == org.id))
    db.commit()


def _set_tenant_context(db: Session, org_id) -> None:
    db.begin()
    db.execute(text("SET LOCAL ROLE hg_app"))
    db.execute(text("SELECT set_config('app.current_org_id', :v, true)"), {"v": str(org_id)})


def _context_still_active(db: Session, org_id) -> bool:
    """True iff we're still inside the same tenant-scoped transaction."""
    role = db.execute(text("SELECT current_user")).scalar_one()
    ctx = db.execute(text("SELECT current_setting('app.current_org_id', true)")).scalar_one()
    return role == "hg_app" and ctx == str(org_id)


def test_start_session_does_not_commit_mid_request(raw_db: Session) -> None:
    org, user = _bootstrap_org_user(raw_db)
    try:
        _set_tenant_context(raw_db, org.id)

        session = service.start_session(raw_db, user, SessionKind.onboarding_short, None)

        assert _context_still_active(raw_db, org.id), (
            "tenant context was reset — start_session committed mid-request"
        )
        # The exact follow-up queries the router's _session_out performs; these
        # are RLS-scoped and would raise/misbehave if the context above is gone.
        items = service.ordered_items(raw_db, session.kind, session.target_pillar)
        assert len(items) > 0
        assert service.get_next_item(raw_db, session) is not None
        assert session.started_at is not None  # server_default populated via flush's RETURNING
    finally:
        _cleanup(raw_db, org)


def test_record_response_does_not_commit_mid_request(raw_db: Session) -> None:
    org, user = _bootstrap_org_user(raw_db)
    try:
        _set_tenant_context(raw_db, org.id)
        session = service.start_session(raw_db, user, SessionKind.onboarding_short, None)
        item = service.get_next_item(raw_db, session)
        assert item is not None

        options = service._options_for(raw_db, item)
        value = options[0].value if options else (item.scale_min or 0)
        resp = service.record_response(raw_db, session, item.id, value)

        assert _context_still_active(raw_db, org.id), (
            "tenant context was reset — record_response committed mid-request"
        )
        assert resp.id is not None
        # Same follow-up shape as the router's _session_out after a respond call.
        assert service.get_next_item(raw_db, session) is not None
    finally:
        _cleanup(raw_db, org)


def test_finalize_session_does_not_commit_mid_request(raw_db: Session) -> None:
    org, user = _bootstrap_org_user(raw_db)
    try:
        _set_tenant_context(raw_db, org.id)
        session = service.start_session(raw_db, user, SessionKind.onboarding_short, None)

        item = service.get_next_item(raw_db, session)
        guard = 0
        while item is not None:
            guard += 1
            assert guard < 100
            options = service._options_for(raw_db, item)
            value = options[0].value if options else (item.scale_min or 0)
            service.record_response(raw_db, session, item.id, value)
            item = service.get_next_item(raw_db, session)

        results = service.finalize_session(raw_db, session)

        assert _context_still_active(raw_db, org.id), (
            "tenant context was reset — finalize_session committed mid-request"
        )
        assert len(results) > 0
        for r in results:
            assert r.derived_at is not None  # server_default populated via flush's RETURNING
    finally:
        _cleanup(raw_db, org)
