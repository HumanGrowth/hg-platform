"""CE-09 engagement_reminders — log de recordatorios por email (inactividad + due dates)

Nueva tabla para el motor de recordatorios (colaborador · rediseño): guarda cada
email de "seguí aprendiendo" que se manda, para no reenviar el mismo aviso todos
los días. RLS por org (tenant_isolation), igual que el resto de las tablas de
progreso por usuario.

Revision ID: ce09engagerem1
Revises: ce08badgeart01
Create Date: 2026-09-08 00:00:00.000000
"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "ce09engagerem1"
down_revision: str | None = "ce08badgeart01"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "engagement_reminders",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("org_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("kind", sa.String(30), nullable=False),
        sa.Column("reference_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("sent_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_engagement_reminders_org_id", "engagement_reminders", ["org_id"])
    op.create_index("ix_engagement_reminders_user_id", "engagement_reminders", ["user_id"])
    # Acelera la query de dedupe: "¿ya avisé a este user de este kind?"
    op.create_index(
        "ix_engagement_reminders_user_kind", "engagement_reminders", ["user_id", "kind", "sent_at"]
    )

    op.execute("ALTER TABLE engagement_reminders ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE engagement_reminders FORCE ROW LEVEL SECURITY")
    op.execute(
        "CREATE POLICY tenant_isolation ON engagement_reminders "
        "USING (org_id = current_setting('app.current_org_id', true)::uuid) "
        "WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid)"
    )
    # El task de Celery corre como hg_superadmin (recorre TODAS las orgs, no una
    # request con contexto de org) — necesita bypassear RLS a propósito, igual
    # que otros jobs batch. hg_app conserva el grant por si algún endpoint futuro
    # necesita leer/escribir esta tabla scoped a la org del request.
    op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON engagement_reminders TO hg_app, hg_superadmin")


def downgrade() -> None:
    op.drop_table("engagement_reminders")
