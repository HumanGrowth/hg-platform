"""CE-05 Consentimiento granular v2: jefe directo + RRHH independientes (TASK 5)

Del docx HG_Consentimiento_Datos_Copy_v1: dos autorizaciones independientes
(None=pendiente/True=autorizado/False=declinado) + log append-only de cambios
(auditoria Ley 8968). Tablas por-org con RLS tenant_isolation.

Revision ID: ce05consentg001
Revises: ce04dimprog0001
Create Date: 2026-08-14 00:00:00.000000
"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "ce05consentg001"
down_revision: str | None = "ce04dimprog0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_TABLES = ("user_privacy_consent", "consent_change_log")


def upgrade() -> None:
    op.create_table(
        "user_privacy_consent",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("org_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("consent_manager", sa.Boolean()),
        sa.Column("consent_hr", sa.Boolean()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("user_id", name="uq_user_privacy_consent_user"),
    )
    op.create_index("ix_user_privacy_consent_org_id", "user_privacy_consent", ["org_id"])
    op.create_index("ix_user_privacy_consent_user_id", "user_privacy_consent", ["user_id"])

    op.create_table(
        "consent_change_log",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("org_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("scope", sa.String(16), nullable=False),
        sa.Column("value", sa.Boolean(), nullable=False),
        sa.Column("changed_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_consent_change_log_org_id", "consent_change_log", ["org_id"])
    op.create_index("ix_consent_change_log_user_id", "consent_change_log", ["user_id"])

    for t in _TABLES:
        op.execute(f"ALTER TABLE {t} ENABLE ROW LEVEL SECURITY")
        op.execute(f"ALTER TABLE {t} FORCE ROW LEVEL SECURITY")
        op.execute(
            f"CREATE POLICY tenant_isolation ON {t} "
            "USING (org_id = current_setting('app.current_org_id', true)::uuid) "
            "WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid)"
        )
        op.execute(f"GRANT SELECT, INSERT, UPDATE, DELETE ON {t} TO hg_app, hg_superadmin")


def downgrade() -> None:
    for t in _TABLES:
        op.execute(f"DROP TABLE IF EXISTS {t} CASCADE")
