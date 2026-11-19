"""NT-01 preferencias de notificación (ADR-0018)

Tabla ``notification_preferences``: una fila por usuario con sus decisiones sobre
recordatorios de aprendizaje y resumen semanal del líder (``NULL`` = nunca decidió).
Por-org con RLS ``tenant_isolation`` y grants a ``hg_app`` / ``hg_superadmin``
(el job de Celery corre como ``hg_superadmin``). No toca ``engagement_reminders``.

Revision ID: nt01notifprefs
Revises: lc01companylifecycle
Create Date: 2026-11-19 00:00:00.000000
"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "nt01notifprefs"
down_revision: str | None = "lc01companylifecycle"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_TABLE = "notification_preferences"


def upgrade() -> None:
    op.create_table(
        _TABLE,
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("org_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("learning_reminders", sa.Boolean(), nullable=True),
        sa.Column("leader_digest", sa.Boolean(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("user_id", name="uq_notification_preferences_user"),
    )
    op.create_index("ix_notification_preferences_org_id", _TABLE, ["org_id"])
    op.create_index("ix_notification_preferences_user_id", _TABLE, ["user_id"])

    op.execute(f"ALTER TABLE {_TABLE} ENABLE ROW LEVEL SECURITY")
    op.execute(f"ALTER TABLE {_TABLE} FORCE ROW LEVEL SECURITY")
    op.execute(
        f"CREATE POLICY tenant_isolation ON {_TABLE} "
        "USING (org_id = current_setting('app.current_org_id', true)::uuid) "
        "WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid)"
    )
    op.execute(f"GRANT SELECT, INSERT, UPDATE, DELETE ON {_TABLE} TO hg_app, hg_superadmin")


def downgrade() -> None:
    op.execute(f"DROP TABLE IF EXISTS {_TABLE} CASCADE")
