"""ST-01 badges + user_badges (Sprint Tarde · TASK 4)

Catálogo global de badges (``badges``, sin RLS — igual que el catálogo de
assessment) + desbloqueos por usuario (``user_badges``, RLS por org como
enrollments/course_progress). Esquema genérico: el catálogo concreto se carga
después vía admin/seed.

Revision ID: e1f2a3b4c5d6
Revises: d2b3c4e5f6a7
Create Date: 2026-07-30 00:00:00.000000

"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "e1f2a3b4c5d6"
down_revision: str | None = "d2b3c4e5f6a7"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # ── Catálogo global (sin RLS) ──
    op.create_table(
        "badges",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("code", sa.String(length=50), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("description", sa.String(length=2000), server_default="", nullable=False),
        sa.Column("icon_url", sa.String(length=500), nullable=False),
        sa.Column("unlock_hint", sa.String(length=500), server_default="", nullable=False),
        sa.Column("order_index", sa.Integer(), server_default="0", nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code", name="uq_badge_code"),
    )
    # El catálogo global es de sólo-lectura para la app; escritura vía admin/superadmin.
    op.execute("GRANT SELECT ON badges TO hg_app, hg_superadmin")
    op.execute("GRANT INSERT, UPDATE, DELETE ON badges TO hg_superadmin")

    # ── Desbloqueos por usuario (RLS por org) ──
    op.create_table(
        "user_badges",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("org_id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("badge_id", sa.UUID(), nullable=False),
        sa.Column("unlocked_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["badge_id"], ["badges.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "badge_id", name="uq_user_badge"),
    )
    op.create_index(op.f("ix_user_badges_org_id"), "user_badges", ["org_id"])
    op.create_index(op.f("ix_user_badges_user_id"), "user_badges", ["user_id"])
    op.create_index(op.f("ix_user_badges_badge_id"), "user_badges", ["badge_id"])

    op.execute("ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE user_badges FORCE ROW LEVEL SECURITY")
    op.execute(
        "CREATE POLICY tenant_isolation ON user_badges "
        "USING (org_id = current_setting('app.current_org_id', true)::uuid) "
        "WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid)"
    )
    op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON user_badges TO hg_app, hg_superadmin")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS user_badges CASCADE")
    op.execute("DROP TABLE IF EXISTS badges CASCADE")
