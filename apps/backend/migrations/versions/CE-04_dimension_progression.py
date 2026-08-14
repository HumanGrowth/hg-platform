"""CE-04 Progresión por dimensión: niveles config + completion + pesos (TASK 6)

- ``dimension_scoring_config``: pesos aprendizaje/assessment por dimensión
  (config global, sin RLS). Seed 6 dimensiones a 0.70/0.30.
- ``dimension_levels``: niveles configurables por dimensión (config global, sin
  RLS). Seed 3 niveles default por dimensión (En crecimiento → Sólido → Ejemplar,
  umbral 100).
- ``dimension_level_progress``: completion 0-100 por (user, dimensión, nivel)
  (por-org, RLS ``tenant_isolation``).

Revision ID: ce04dimprog0001
Revises: ce03consent0001
Create Date: 2026-08-14 00:00:00.000000
"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "ce04dimprog0001"
down_revision: str | None = "ce03consent0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_DIMENSIONS = ["CP", "PR", "RE", "SA", "PI", "ES"]
# Niveles default (Andy 13-ago): 3 por dimensión, umbral 100. Nombres provisorios.
_LEVELS = [("L1", 1, "En crecimiento"), ("L2", 2, "Sólido"), ("L3", 3, "Ejemplar")]


def upgrade() -> None:
    # 1. dimension_scoring_config (config global) + seed 0.70/0.30
    op.create_table(
        "dimension_scoring_config",
        sa.Column("dimension_code", sa.String(4), primary_key=True),
        sa.Column("learning_weight", sa.Float(), nullable=False, server_default="0.7"),
        sa.Column("assessment_weight", sa.Float(), nullable=False, server_default="0.3"),
    )
    op.bulk_insert(
        sa.table(
            "dimension_scoring_config",
            sa.column("dimension_code", sa.String),
            sa.column("learning_weight", sa.Float),
            sa.column("assessment_weight", sa.Float),
        ),
        [{"dimension_code": d, "learning_weight": 0.7, "assessment_weight": 0.3} for d in _DIMENSIONS],
    )

    # 2. dimension_levels (config global) + seed 3 niveles por dimensión
    op.create_table(
        "dimension_levels",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("dimension_code", sa.String(4), nullable=False),
        sa.Column("level_code", sa.String(8), nullable=False),
        sa.Column("order_index", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("name", sa.String(80), nullable=False),
        sa.Column("unlock_threshold", sa.Integer(), nullable=False, server_default="100"),
        sa.UniqueConstraint("dimension_code", "level_code", name="uq_dimension_level"),
    )
    op.create_index("ix_dimension_levels_dimension_code", "dimension_levels", ["dimension_code"])
    import uuid

    levels_rows = [
        {
            "id": uuid.uuid4(), "dimension_code": d, "level_code": lc,
            "order_index": oi, "name": nm, "unlock_threshold": 100,
        }
        for d in _DIMENSIONS
        for lc, oi, nm in _LEVELS
    ]
    op.bulk_insert(
        sa.table(
            "dimension_levels",
            sa.column("id", postgresql.UUID(as_uuid=True)),
            sa.column("dimension_code", sa.String),
            sa.column("level_code", sa.String),
            sa.column("order_index", sa.Integer),
            sa.column("name", sa.String),
            sa.column("unlock_threshold", sa.Integer),
        ),
        levels_rows,
    )

    # 3. dimension_level_progress (por-org, RLS)
    op.create_table(
        "dimension_level_progress",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("org_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("dimension_code", sa.String(4), nullable=False),
        sa.Column("level_code", sa.String(8), nullable=False),
        sa.Column("completion_pct", sa.Float(), nullable=False, server_default="0"),
        sa.Column("learning_pct", sa.Float(), nullable=False, server_default="0"),
        sa.Column("assessment_pct", sa.Float(), nullable=False, server_default="0"),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint(
            "user_id", "dimension_code", "level_code", name="uq_dimension_level_progress"
        ),
    )
    op.create_index("ix_dimension_level_progress_org_id", "dimension_level_progress", ["org_id"])
    op.create_index("ix_dimension_level_progress_user_id", "dimension_level_progress", ["user_id"])
    op.execute("ALTER TABLE dimension_level_progress ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE dimension_level_progress FORCE ROW LEVEL SECURITY")
    op.execute(
        "CREATE POLICY tenant_isolation ON dimension_level_progress "
        "USING (org_id = current_setting('app.current_org_id', true)::uuid) "
        "WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid)"
    )

    for t in ("dimension_scoring_config", "dimension_levels", "dimension_level_progress"):
        op.execute(f"GRANT SELECT, INSERT, UPDATE, DELETE ON {t} TO hg_app, hg_superadmin")

    # 4. Seed del catálogo `badges` con un badge de nivel por (dimensión, nivel).
    # hg_app solo tiene SELECT en badges → deben pre-existir para que el unlock
    # (INSERT en user_badges, que hg_app sí puede) encuentre el badge por code.
    badge_rows = [
        {
            "id": uuid.uuid4(),
            "code": f"level-{d}-{lc}".lower(),
            "name": f"{d} · {nm}",
            "description": f"Nivel {nm} de la dimensión {d}.",
            "icon_url": "",
            "unlock_hint": f"Alcanzá el 100% de completion del nivel {lc} en {d}.",
            "order_index": _DIMENSIONS.index(d) * 10 + oi,
            "is_active": True,
        }
        for d in _DIMENSIONS
        for lc, oi, nm in _LEVELS
    ]
    op.bulk_insert(
        sa.table(
            "badges",
            sa.column("id", postgresql.UUID(as_uuid=True)),
            sa.column("code", sa.String),
            sa.column("name", sa.String),
            sa.column("description", sa.String),
            sa.column("icon_url", sa.String),
            sa.column("unlock_hint", sa.String),
            sa.column("order_index", sa.Integer),
            sa.column("is_active", sa.Boolean),
        ),
        badge_rows,
    )


def downgrade() -> None:
    op.execute("DELETE FROM badges WHERE code LIKE 'level-%'")
    for t in ("dimension_level_progress", "dimension_levels", "dimension_scoring_config"):
        op.execute(f"DROP TABLE IF EXISTS {t} CASCADE")
