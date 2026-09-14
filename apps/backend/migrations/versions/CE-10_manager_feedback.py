"""CE-10 Feedback del manager: matriz de comportamientos + 3er componente de score (FASE 1.1)

- ``pillar_behaviors``: catálogo GLOBAL sin RLS (gobernado por superadmin, mismo
  criterio que ``badges``) — los comportamientos observables de un
  ``(dimension_code, pillar_code)``. Seed inicial (borrador) para CP P1-P5.
- ``behavior_evaluations``: última calificación 1..3 de un manager sobre un
  ``(colaborador, comportamiento)`` (por-org, RLS ``tenant_isolation``, mismo
  patrón que ``dimension_level_progress``).
- ``dimension_scoring_config.manager_weight`` (default 0.0 — INERTE, no altera
  scores existentes hasta que se configure en FASE 1.4).
- ``dimension_level_progress.manager_pct`` (default 0.0, backfill sin downtime).

Revision ID: ce10mgrfdbk01
Revises: ce09engagerem1
Create Date: 2026-09-11 00:00:00.000000
"""
from __future__ import annotations

import uuid
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "ce10mgrfdbk01"
down_revision: str | None = "ce09engagerem1"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# Borrador (Andy/Jorge redactan el texto real después) — 3-4 comportamientos
# observables por pilar de Carrera (CP). Data-driven: vive en la tabla, no en
# el motor de score.
_CP_BEHAVIORS: dict[str, list[str]] = {
    "P1": [
        "Busca activamente feedback sobre su desempeño y lo aplica en su siguiente entrega.",
        "Identifica sus brechas de habilidades y arma un plan concreto para cerrarlas.",
        "Prueba nuevas herramientas o métodos de trabajo sin esperar a que se los indiquen.",
    ],
    "P2": [
        "Cumple sus compromisos y plazos de forma consistente.",
        "Colabora proactivamente con otros equipos/áreas para destrabar el trabajo en común.",
        "Documenta y comparte su conocimiento para que el equipo no dependa de una sola persona.",
    ],
    "P3": [
        "Aporta una mirada estratégica al analizar un problema, no solo la solución inmediata.",
        "Se mantiene actualizado en su especialidad y lo demuestra en su trabajo diario.",
        "Anticipa riesgos o consecuencias de una decisión antes de que ocurran.",
    ],
    "P4": [
        "Comunica sus ideas de forma clara y adaptada a la audiencia (técnica o no técnica).",
        "Influye y genera acuerdo en el equipo sin necesidad de imponer su posición.",
        "Da feedback constructivo a pares de forma oportuna y respetuosa.",
    ],
    "P5": [
        "Regula sus reacciones emocionales incluso bajo presión o desacuerdo.",
        "Muestra empatía genuina ante las dificultades de sus compañeros.",
        "Construye relaciones de confianza dentro y fuera de su equipo directo.",
    ],
}


def upgrade() -> None:
    # 1. pillar_behaviors (catálogo global, sin RLS)
    op.create_table(
        "pillar_behaviors",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("dimension_code", sa.String(4), nullable=False),
        sa.Column("pillar_code", sa.String(8), nullable=False),
        sa.Column("text", sa.String(500), nullable=False),
        sa.Column("order_index", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint(
            "dimension_code", "pillar_code", "order_index", name="uq_pillar_behavior_order"
        ),
    )
    op.create_index("ix_pillar_behaviors_dimension_code", "pillar_behaviors", ["dimension_code"])
    op.create_index("ix_pillar_behaviors_pillar_code", "pillar_behaviors", ["pillar_code"])

    # 2. behavior_evaluations (por-org, RLS)
    op.create_table(
        "behavior_evaluations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("org_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("behavior_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("rating", sa.SmallInteger(), nullable=False),
        sa.Column("evaluated_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True),
            server_default=sa.func.now(), onupdate=sa.func.now(),
        ),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["behavior_id"], ["pillar_behaviors.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["evaluated_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.CheckConstraint("rating BETWEEN 1 AND 3", name="ck_behavior_evaluation_rating"),
        sa.UniqueConstraint("user_id", "behavior_id", name="uq_behavior_evaluation"),
    )
    op.create_index("ix_behavior_evaluations_org_id", "behavior_evaluations", ["org_id"])
    op.create_index("ix_behavior_evaluations_user_id", "behavior_evaluations", ["user_id"])
    op.create_index("ix_behavior_evaluations_behavior_id", "behavior_evaluations", ["behavior_id"])
    op.execute("ALTER TABLE behavior_evaluations ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE behavior_evaluations FORCE ROW LEVEL SECURITY")
    op.execute(
        "CREATE POLICY tenant_isolation ON behavior_evaluations "
        "USING (org_id = current_setting('app.current_org_id', true)::uuid) "
        "WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid)"
    )

    op.execute("GRANT SELECT ON pillar_behaviors TO hg_app, hg_superadmin")
    op.execute("GRANT INSERT, UPDATE, DELETE ON pillar_behaviors TO hg_superadmin")
    op.execute(
        "GRANT SELECT, INSERT, UPDATE, DELETE ON behavior_evaluations TO hg_app, hg_superadmin"
    )

    # 3. Config/progreso: manager_weight (default 0.0, inerte) + manager_pct.
    op.add_column(
        "dimension_scoring_config",
        sa.Column("manager_weight", sa.Float(), nullable=False, server_default="0.0"),
    )
    op.add_column(
        "dimension_level_progress",
        sa.Column("manager_pct", sa.Float(), nullable=False, server_default="0.0"),
    )

    # 4. Seed borrador de comportamientos de CP.
    rows = [
        {
            "id": uuid.uuid4(), "dimension_code": "CP", "pillar_code": pillar,
            "text": text, "order_index": idx, "is_active": True,
        }
        for pillar, texts in _CP_BEHAVIORS.items()
        for idx, text in enumerate(texts)
    ]
    op.bulk_insert(
        sa.table(
            "pillar_behaviors",
            sa.column("id", postgresql.UUID(as_uuid=True)),
            sa.column("dimension_code", sa.String),
            sa.column("pillar_code", sa.String),
            sa.column("text", sa.String),
            sa.column("order_index", sa.Integer),
            sa.column("is_active", sa.Boolean),
        ),
        rows,
    )


def downgrade() -> None:
    op.drop_column("dimension_level_progress", "manager_pct")
    op.drop_column("dimension_scoring_config", "manager_weight")
    op.execute("DROP TABLE IF EXISTS behavior_evaluations CASCADE")
    op.execute("DROP TABLE IF EXISTS pillar_behaviors CASCADE")
