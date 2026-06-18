"""B2-03 productivize enrollments (drop draft, create + RLS)

B1-03 creó un `enrollments` draft (sin RLS, sin source/is_active). Esta migración
lo reemplaza por el productivo (B4-A): + `source`, `is_active`, índices, y RLS
por org (tenant_isolation, igual que course_progress). Tabla draft vacía → el
reemplazo es seguro. `DROP TABLE IF EXISTS` cubre la divergencia local/CI.

Revision ID: d2030e6f2b51
Revises: c2020d5e1a40
Create Date: 2026-06-18 09:00:00.000000

"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "d2030e6f2b51"
down_revision: str | None = "c2020d5e1a40"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("DROP TABLE IF EXISTS enrollments CASCADE")

    op.create_table(
        "enrollments",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("org_id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("career_path_id", sa.UUID(), nullable=False),
        sa.Column("assigned_by_user_id", sa.UUID(), nullable=True),
        sa.Column("source", sa.String(length=20), server_default=sa.text("'manual'"), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("enrolled_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["assigned_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["career_path_id"], ["career_paths.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "career_path_id", name="uq_enrollment_user_path"),
    )
    op.create_index(op.f("ix_enrollments_org_id"), "enrollments", ["org_id"])
    op.create_index(op.f("ix_enrollments_user_id"), "enrollments", ["user_id"])
    op.create_index(op.f("ix_enrollments_career_path_id"), "enrollments", ["career_path_id"])
    op.create_index(op.f("ix_enrollments_source"), "enrollments", ["source"])
    op.create_index(op.f("ix_enrollments_is_active"), "enrollments", ["is_active"])

    op.execute("ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE enrollments FORCE ROW LEVEL SECURITY")
    op.execute(
        "CREATE POLICY tenant_isolation ON enrollments "
        "USING (org_id = current_setting('app.current_org_id', true)::uuid) "
        "WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid)"
    )
    op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON enrollments TO hg_app, hg_superadmin")


def downgrade() -> None:
    # Restaurar el enrollments draft de B1-03 (sin RLS) para reversibilidad.
    op.execute("DROP TABLE IF EXISTS enrollments CASCADE")
    op.create_table(
        "enrollments",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("org_id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("career_path_id", sa.UUID(), nullable=False),
        sa.Column("assigned_by_user_id", sa.UUID(), nullable=True),
        sa.Column("enrolled_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["assigned_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["career_path_id"], ["career_paths.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "career_path_id", name="uq_enrollment_user_path"),
    )
    op.create_index(op.f("ix_enrollments_org_id"), "enrollments", ["org_id"])
    op.create_index(op.f("ix_enrollments_user_id"), "enrollments", ["user_id"])
