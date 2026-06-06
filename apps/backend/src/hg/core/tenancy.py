"""Tenancy context: sets app.current_org_id per request for RLS."""
from __future__ import annotations

from contextvars import ContextVar
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.orm import Session

current_org_id: ContextVar[UUID | None] = ContextVar("current_org_id", default=None)


def set_org_context(db: Session, org_id: UUID) -> None:
    """Set the Postgres session variable that RLS policies read.

    Use SET LOCAL semantics (``set_config(..., is_local=true)``) inside a
    transaction so it auto-clears at commit/rollback.
    """
    db.execute(text("SELECT set_config('app.current_org_id', :v, true)"), {"v": str(org_id)})
    current_org_id.set(org_id)


def clear_org_context(db: Session) -> None:
    db.execute(text("SELECT set_config('app.current_org_id', '', true)"))
    current_org_id.set(None)
