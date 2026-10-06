"""OM-01 org_module_assignments (módulos por organización)

Módulos asignados a una ORGANIZACIÓN: todo miembro que entre a la org (invitación,
carga masiva o cambio de org) recibe automáticamente un ``module_assignment``
por cada fila. RLS por org, igual que ``module_assignments``.

Revision ID: c5d6e7f8a9b0
Revises: pf03dropdimbadg1
Create Date: 2026-10-07 00:00:00.000000

"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "c5d6e7f8a9b0"
down_revision: str | None = "pf03dropdimbadg1"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "org_module_assignments",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("org_id", sa.UUID(), nullable=False),
        sa.Column("learning_unit_id", sa.UUID(), nullable=False),
        sa.Column("assigned_by_user_id", sa.UUID(), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("due_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("assigned_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["learning_unit_id"], ["learning_units.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["assigned_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("org_id", "learning_unit_id", name="uq_org_module_assignment_org_unit"),
    )
    op.create_index(op.f("ix_org_module_assignments_org_id"), "org_module_assignments", ["org_id"])
    op.create_index(
        op.f("ix_org_module_assignments_learning_unit_id"), "org_module_assignments", ["learning_unit_id"]
    )

    op.execute("ALTER TABLE org_module_assignments ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE org_module_assignments FORCE ROW LEVEL SECURITY")
    op.execute(
        "CREATE POLICY tenant_isolation ON org_module_assignments "
        "USING (org_id = current_setting('app.current_org_id', true)::uuid) "
        "WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid)"
    )
    op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON org_module_assignments TO hg_app, hg_superadmin")

    # Backfill: lo ya asignado a TODA una org (mismo set de units a todos sus
    # miembros activos) no se infiere — las asignaciones previas siguen siendo
    # por usuario. Solo rige hacia adelante.


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS org_module_assignments CASCADE")
