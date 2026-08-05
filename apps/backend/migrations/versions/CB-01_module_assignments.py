"""CB-01 module_assignments (cierre-beta TASK 3)

Asignación de learning units a colaboradores por su manager/admin. Aditiva
(no restringe el acceso). RLS por org (tenant_isolation), igual que enrollments.

Revision ID: cb01modassign1
Revises: b4c5d6e7f8a9
Create Date: 2026-08-05 12:00:00.000000

"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "cb01modassign1"
down_revision: str | None = "b4c5d6e7f8a9"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "module_assignments",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("org_id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("learning_unit_id", sa.UUID(), nullable=False),
        sa.Column("assigned_by_user_id", sa.UUID(), nullable=True),
        sa.Column("status", sa.String(length=20), server_default=sa.text("'assigned'"), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("due_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("assigned_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["assigned_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["learning_unit_id"], ["learning_units.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "learning_unit_id", name="uq_module_assignment_user_unit"),
    )
    op.create_index(op.f("ix_module_assignments_org_id"), "module_assignments", ["org_id"])
    op.create_index(op.f("ix_module_assignments_user_id"), "module_assignments", ["user_id"])
    op.create_index(
        op.f("ix_module_assignments_learning_unit_id"), "module_assignments", ["learning_unit_id"]
    )

    op.execute("ALTER TABLE module_assignments ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE module_assignments FORCE ROW LEVEL SECURITY")
    op.execute(
        "CREATE POLICY tenant_isolation ON module_assignments "
        "USING (org_id = current_setting('app.current_org_id', true)::uuid) "
        "WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid)"
    )
    op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON module_assignments TO hg_app, hg_superadmin")


def downgrade() -> None:
    op.execute("DROP POLICY IF EXISTS tenant_isolation ON module_assignments")
    op.drop_index(op.f("ix_module_assignments_learning_unit_id"), table_name="module_assignments")
    op.drop_index(op.f("ix_module_assignments_user_id"), table_name="module_assignments")
    op.drop_index(op.f("ix_module_assignments_org_id"), table_name="module_assignments")
    op.drop_table("module_assignments")
