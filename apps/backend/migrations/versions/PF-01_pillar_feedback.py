"""PF-01 Feedback del manager por pilar (texto libre, visible para el colaborador)

- ``pillar_feedback``: un feedback vigente por ``(colaborador, dimensión, pilar)``
  (por-org, RLS ``tenant_isolation``, mismo patrón que ``behavior_evaluations``).
  Separado de ``behavior_evaluations.note`` (privada del manager): este texto lo
  lee el colaborador en Mi Ruta.

Revision ID: pf01pillarfdbk1
Revises: h901dropcp01
Create Date: 2026-09-25 00:00:00.000000
"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "pf01pillarfdbk1"
down_revision: str | None = "h901dropcp01"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "pillar_feedback",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("org_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("dimension_code", sa.String(4), nullable=False),
        sa.Column("pillar_code", sa.String(8), nullable=False),
        sa.Column("manager_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True),
            server_default=sa.func.now(), onupdate=sa.func.now(),
        ),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["manager_id"], ["users.id"], ondelete="SET NULL"),
        sa.UniqueConstraint("user_id", "dimension_code", "pillar_code", name="uq_pillar_feedback"),
    )
    op.create_index("ix_pillar_feedback_org_id", "pillar_feedback", ["org_id"])
    op.create_index("ix_pillar_feedback_user_id", "pillar_feedback", ["user_id"])
    op.execute("ALTER TABLE pillar_feedback ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE pillar_feedback FORCE ROW LEVEL SECURITY")
    op.execute(
        "CREATE POLICY tenant_isolation ON pillar_feedback "
        "USING (org_id = current_setting('app.current_org_id', true)::uuid) "
        "WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid)"
    )
    op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON pillar_feedback TO hg_app, hg_superadmin")


def downgrade() -> None:
    op.drop_table("pillar_feedback")
