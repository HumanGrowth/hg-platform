"""Rename 'pillar' → 'dimension' en el motor de assessment (y usos derivados).

El código llamaba ``pillar`` a lo que en producto es la **dimensión** (las 6
áreas; el assessment devuelve P1..P5/P6A/P6B). Esto chocaba con el ``pillar``
real de producto = ``LearningUnit.pillar_number`` (sub-categoría dentro de una
dimensión). Este rename unifica: en código/DB, ``dimension`` = la dimensión;
``pillar_number`` queda intacto = el pilar (sub-categoría).

Rename puramente estructural (nombres de enum/tabla/columnas/índices), sin
cambio de datos ni de valores. ``pillar_number`` y sus objetos NO se tocan.

Revision ID: ce00renamedim1
Revises: cb03perspectiv1
"""
from __future__ import annotations

from alembic import op

revision: str = "ce00renamedim1"
down_revision: str | None = "cb03perspectiv1"
branch_labels = None
depends_on = None


# (tabla, columna_vieja, columna_nueva) — columnas con "pillar" que son dimensión.
_COLUMNS = [
    ("assessment_instruments", "pillar_code", "dimension_code"),
    ("assessment_items", "pillar_code", "dimension_code"),
    ("assessment_sessions", "target_pillar", "target_dimension"),
    ("perspective_posts", "pillar_code", "dimension_code"),
    ("pillar_results", "pillar_code", "dimension_code"),
    ("org_assessment_aggregates", "avg_scores_by_pillar", "avg_scores_by_dimension"),
    ("org_assessment_aggregates", "completion_rate_by_pillar", "completion_rate_by_dimension"),
    ("user_learning_profiles", "pillar_states", "dimension_states"),
]

# (índice_viejo, índice_nuevo)
_INDEXES = [
    ("ix_assessment_items_pillar_code", "ix_assessment_items_dimension_code"),
    ("ix_assessment_sessions_target_pillar", "ix_assessment_sessions_target_dimension"),
    ("ix_perspective_posts_pillar_code", "ix_perspective_posts_dimension_code"),
    ("ix_pillar_results_org_id", "ix_dimension_results_org_id"),
    ("ix_pillar_results_pillar_code", "ix_dimension_results_dimension_code"),
    ("ix_pillar_results_user_id", "ix_dimension_results_user_id"),
]

# (constraint_viejo, constraint_nuevo) — sobre la tabla (ya) dimension_results.
_CONSTRAINTS = [
    ("pillar_results_pkey", "dimension_results_pkey"),
    ("pillar_results_org_id_fkey", "dimension_results_org_id_fkey"),
    ("pillar_results_user_id_fkey", "dimension_results_user_id_fkey"),
    ("pillar_results_derived_from_session_id_fkey", "dimension_results_derived_from_session_id_fkey"),
]


def upgrade() -> None:
    # 0. valor del enum session_kind: 'pillar_detail' = detalle de una dimensión.
    op.execute("ALTER TYPE session_kind RENAME VALUE 'pillar_detail' TO 'dimension_detail'")
    # 1. enum type (el array _pillar_code sigue automáticamente).
    op.execute("ALTER TYPE pillar_code RENAME TO dimension_code")
    # 2. columnas (mientras pillar_results aún se llama así).
    for table, old, new in _COLUMNS:
        op.alter_column(table, old, new_column_name=new)
    # 3. tabla (renombra también su tipo compuesto pillar_results).
    op.rename_table("pillar_results", "dimension_results")
    # 4. índices.
    for old, new in _INDEXES:
        op.execute(f"ALTER INDEX IF EXISTS {old} RENAME TO {new}")
    # 5. constraints (cosmético, ya sobre dimension_results).
    for old, new in _CONSTRAINTS:
        op.execute(f"ALTER TABLE dimension_results RENAME CONSTRAINT {old} TO {new}")


def downgrade() -> None:
    for old, new in _CONSTRAINTS:
        op.execute(f"ALTER TABLE dimension_results RENAME CONSTRAINT {new} TO {old}")
    for old, new in _INDEXES:
        op.execute(f"ALTER INDEX IF EXISTS {new} RENAME TO {old}")
    op.rename_table("dimension_results", "pillar_results")
    for table, old, new in _COLUMNS:
        target = "pillar_results" if table == "pillar_results" else table
        op.alter_column(target, new, new_column_name=old)
    op.execute("ALTER TYPE dimension_code RENAME TO pillar_code")
    op.execute("ALTER TYPE session_kind RENAME VALUE 'dimension_detail' TO 'pillar_detail'")
