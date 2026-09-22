"""H9-01 drop course_progress + org_assessment_aggregates (código huérfano)

Ambas tablas quedaron sin lectores ni escritores tras el rediseño de Learning
Units (v2): la actividad real se mide con ``learning_unit_attempts`` +
``block_progress``, no con ``course_progress`` (el endpoint que lo escribía,
``POST /events/{slug}/progress``, se retira en este mismo cambio — sin
frontend que lo llame desde que `/eventos/[slug]` redirige a `/modulos`).
``org_assessment_aggregates`` nunca tuvo escritor: el draft (B1-03) quedó
pendiente de las decisiones DEC-01/02/05/07, nunca implementadas.

Ver el mapa de conexiones (hallazgo H9) para el detalle completo.

**Antes de correr esto en Neon**: snapshot de la base, igual que cualquier
migración destructiva (ver docs/scoring.md, mismo guardrail que el recompute
masivo). Verificado localmente con `alembic upgrade head` + `alembic
downgrade -1` contra hg_dev — NO corrido contra Neon.

Revision ID: h901dropcp01
Revises: lu05presentat01
Create Date: 2026-09-22 00:00:00.000000

"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "h901dropcp01"
down_revision: str | None = "lu05presentat01"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # course_progress: RLS propio (tenant_isolation) + policy — DROP TABLE los
    # retira solos, no hace falta desmontarlos a mano.
    op.drop_table("course_progress")
    op.drop_table("org_assessment_aggregates")


def downgrade() -> None:
    op.create_table(
        "org_assessment_aggregates",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("org_id", sa.UUID(), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("total_users", sa.Integer(), nullable=False),
        sa.Column("active_users", sa.Integer(), nullable=False),
        sa.Column("completion_rate_by_dimension", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("avg_scores_by_dimension", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("org_id", "date", name="uq_org_agg_org_date"),
    )
    op.create_index(
        op.f("ix_org_assessment_aggregates_org_id"), "org_assessment_aggregates", ["org_id"]
    )

    op.create_table(
        "course_progress",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("org_id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("course_id", sa.UUID(), nullable=False),
        sa.Column("last_position_seconds", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("watch_pct", sa.Float(), server_default=sa.text("0"), nullable=False),
        sa.Column("is_completed", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column(
            "first_played_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
        ),
        sa.Column(
            "last_played_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
        ),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["course_id"], ["events.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "course_id", name="uq_progress_user_course"),
    )
    op.create_index(op.f("ix_course_progress_org_id"), "course_progress", ["org_id"])
    op.create_index(op.f("ix_course_progress_user_id"), "course_progress", ["user_id"])
    op.create_index(op.f("ix_course_progress_course_id"), "course_progress", ["course_id"])
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
