"""CB-02 saved_tips (cierre-beta TASK 5 · Plan de Acción)

Tips guardados por el usuario. RLS por org (tenant_isolation), igual que
enrollments/module_assignments.

Revision ID: cb02savedtips1
Revises: cb01modassign1
Create Date: 2026-08-05 14:00:00.000000

"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "cb02savedtips1"
down_revision: str | None = "cb01modassign1"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "saved_tips",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("org_id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("learning_unit_id", sa.UUID(), nullable=True),
        sa.Column("block_id", sa.UUID(), nullable=True),
        sa.Column("tip_text", sa.Text(), nullable=False),
        sa.Column("source", sa.String(length=20), server_default=sa.text("'custom'"), nullable=False),
        sa.Column("dimension_code", sa.String(length=10), nullable=True),
        sa.Column("is_completed", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("order_index", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("saved_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["learning_unit_id"], ["learning_units.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_saved_tips_org_id"), "saved_tips", ["org_id"])
    op.create_index(op.f("ix_saved_tips_user_id"), "saved_tips", ["user_id"])
    op.create_index(op.f("ix_saved_tips_learning_unit_id"), "saved_tips", ["learning_unit_id"])
    op.create_index(op.f("ix_saved_tips_dimension_code"), "saved_tips", ["dimension_code"])

    op.execute("ALTER TABLE saved_tips ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE saved_tips FORCE ROW LEVEL SECURITY")
    op.execute(
        "CREATE POLICY tenant_isolation ON saved_tips "
        "USING (org_id = current_setting('app.current_org_id', true)::uuid) "
        "WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid)"
    )
    op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON saved_tips TO hg_app, hg_superadmin")


def downgrade() -> None:
    op.execute("DROP POLICY IF EXISTS tenant_isolation ON saved_tips")
    op.drop_index(op.f("ix_saved_tips_dimension_code"), table_name="saved_tips")
    op.drop_index(op.f("ix_saved_tips_learning_unit_id"), table_name="saved_tips")
    op.drop_index(op.f("ix_saved_tips_user_id"), table_name="saved_tips")
    op.drop_index(op.f("ix_saved_tips_org_id"), table_name="saved_tips")
    op.drop_table("saved_tips")
