"""PF-02 Tips de coaching por pilar para el manager

- ``pillar_coaching_tips``: catálogo GLOBAL sin RLS (mismo criterio que
  ``pillar_behaviors``): tips curados para que el manager acompañe un pilar.
  Contenido editorial — NO se genera con IA en runtime.
- Seed: PLACEHOLDERS para CP P1-P5 (prefijo ``[Placeholder]``). Contenido/product
  los reemplaza (UPDATE de ``text``) cuando valide los tips reales; no son
  consejos de coaching válidos.

Revision ID: pf02coachtips01
Revises: pf01pillarfdbk1
Create Date: 2026-09-25 00:00:00.000000
"""
from __future__ import annotations

import uuid
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "pf02coachtips01"
down_revision: str | None = "pf01pillarfdbk1"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_PLACEHOLDER_PILLARS = ("P1", "P2", "P3", "P4", "P5")
_TIPS_PER_PILLAR = 2


def upgrade() -> None:
    table = op.create_table(
        "pillar_coaching_tips",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("dimension_code", sa.String(4), nullable=False),
        sa.Column("pillar_code", sa.String(8), nullable=False),
        sa.Column("text", sa.String(500), nullable=False),
        sa.Column("order_index", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint(
            "dimension_code", "pillar_code", "order_index", name="uq_pillar_coaching_tip_order"
        ),
    )
    op.create_index("ix_pillar_coaching_tips_dimension_code", "pillar_coaching_tips", ["dimension_code"])
    op.create_index("ix_pillar_coaching_tips_pillar_code", "pillar_coaching_tips", ["pillar_code"])
    op.execute("GRANT SELECT ON pillar_coaching_tips TO hg_app, hg_superadmin")
    op.execute("GRANT INSERT, UPDATE, DELETE ON pillar_coaching_tips TO hg_superadmin")

    op.bulk_insert(
        table,
        [
            {
                "id": uuid.uuid4(),
                "dimension_code": "CP",
                "pillar_code": pillar,
                "text": f"[Placeholder] Tip de acompañamiento {i + 1} para {pillar} — contenido pendiente de validar.",
                "order_index": i,
                "is_active": True,
            }
            for pillar in _PLACEHOLDER_PILLARS
            for i in range(_TIPS_PER_PILLAR)
        ],
    )


def downgrade() -> None:
    op.drop_table("pillar_coaching_tips")
