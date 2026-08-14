"""CE-03 Consentimiento + auditoría de acceso (Capa Empresa · TASK 5)

Fase 1 de seguridad (bloqueante prod). Tablas por-org con RLS (``tenant_isolation``
sobre ``app.current_org_id``), igual que el resto del modelo multi-tenant:

- ``user_consents``: aceptación de una versión del consentimiento por colaborador.
- ``data_access_log``: append-only; acceso de RRHH/manager al estado de un
  colaborador.

Revision ID: ce03consent0001
Revises: ce02areas000001
Create Date: 2026-08-13 00:00:00.000000
"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "ce03consent0001"
down_revision: str | None = "ce02areas000001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_TABLES = ("user_consents", "data_access_log")


def upgrade() -> None:
    op.create_table(
        "user_consents",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("org_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("consent_version", sa.String(40), nullable=False),
        sa.Column(
            "accepted_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("user_id", "consent_version", name="uq_user_consent_version"),
    )
    op.create_index("ix_user_consents_org_id", "user_consents", ["org_id"])
    op.create_index("ix_user_consents_user_id", "user_consents", ["user_id"])

    op.create_table(
        "data_access_log",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("org_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("actor_user_id", postgresql.UUID(as_uuid=True)),
        sa.Column("target_user_id", postgresql.UUID(as_uuid=True)),
        sa.Column("resource", sa.String(32), nullable=False),
        sa.Column(
            "accessed_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["actor_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["target_user_id"], ["users.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_data_access_log_org_id", "data_access_log", ["org_id"])
    op.create_index("ix_data_access_log_actor_user_id", "data_access_log", ["actor_user_id"])
    op.create_index("ix_data_access_log_target_user_id", "data_access_log", ["target_user_id"])

    # RLS por-org (mismo patrón que assessment/enrollments/…).
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
