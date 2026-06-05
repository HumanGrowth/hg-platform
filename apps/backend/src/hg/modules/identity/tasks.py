"""Identity Celery tasks."""
from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import text

from hg.celery_app import celery_app
from hg.db import SessionLocal


@celery_app.task(name="identity.update_last_active", ignore_result=True)
def update_last_active(user_id: str, org_id: str) -> None:
    """Actualiza ``users.last_active_at`` fuera del ciclo del request.

    Corre como ``hg_superadmin`` (BYPASSRLS): es una escritura puntual por
    user_id ya conocido, no necesita contexto de tenant.
    """
    db = SessionLocal()
    try:
        db.begin()
        db.execute(text("SET LOCAL ROLE hg_superadmin"))
        db.execute(
            text("UPDATE users SET last_active_at = :ts WHERE id = :uid AND org_id = :oid"),
            {"ts": datetime.now(UTC), "uid": UUID(user_id), "oid": UUID(org_id)},
        )
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
