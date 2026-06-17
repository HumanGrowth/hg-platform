"""B2-02 productivize course_progress (drop draft, create + RLS)

B1-03 creó un `course_progress` draft (sin RLS, esquema viejo). Esta migración
lo reemplaza por el productivo (B2-07): nuevos campos + RLS por org
(tenant_isolation, igual que users/user_sessions). La tabla draft está vacía, así
que el reemplazo es seguro. `DROP TABLE IF EXISTS` cubre la divergencia local/CI.

Revision ID: c2020d5e1a40
Revises: b2010c4a7f31
Create Date: 2026-06-17 10:00:00.000000

"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "c2020d5e1a40"
down_revision: str | None = "b2010c4a7f31"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Reemplazar la tabla draft de B1-03 (vacía) por la productiva.
    op.execute("DROP TABLE IF EXISTS course_progress CASCADE")

    op.create_table(
        "course_progress",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("org_id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("course_id", sa.UUID(), nullable=False),
        sa.Column("last_position_seconds", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("watch_pct", sa.Float(), server_default=sa.text("0"), nullable=False),
        sa.Column("is_completed", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("first_played_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("last_played_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["course_id"], ["courses.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "course_id", name="uq_progress_user_course"),
    )
    op.create_index(op.f("ix_course_progress_org_id"), "course_progress", ["org_id"])
    op.create_index(op.f("ix_course_progress_user_id"), "course_progress", ["user_id"])
    op.create_index(op.f("ix_course_progress_course_id"), "course_progress", ["course_id"])

    # RLS por org (tenant_isolation), idéntico a users / user_sessions.
    op.execute("ALTER TABLE course_progress ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE course_progress FORCE ROW LEVEL SECURITY")
    op.execute(
        "CREATE POLICY tenant_isolation ON course_progress "
        "USING (org_id = current_setting('app.current_org_id', true)::uuid) "
        "WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid)"
    )
    op.execute(
        "GRANT SELECT, INSERT, UPDATE, DELETE ON course_progress TO hg_app, hg_superadmin"
    )


def downgrade() -> None:
    # Restaurar el course_progress draft de B1-03 (sin RLS) para reversibilidad.
    op.execute("DROP TABLE IF EXISTS course_progress CASCADE")
    op.create_table(
        "course_progress",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("org_id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("course_id", sa.UUID(), nullable=False),
        sa.Column("watch_pct", sa.Float(), nullable=False),
        sa.Column("last_position_sec", sa.Integer(), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["course_id"], ["courses.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "course_id", name="uq_progress_user_course"),
    )
    op.create_index(op.f("ix_course_progress_org_id"), "course_progress", ["org_id"])
    op.create_index(op.f("ix_course_progress_user_id"), "course_progress", ["user_id"])
