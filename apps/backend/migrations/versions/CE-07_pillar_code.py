"""CE-07 learning_units.pillar_number (int) → pillar_code (str)

El pilar pasó de número a **código** para soportar pilares nombrados (AI/IA,
ETH…), además de los numerados (P1…P5). Se deriva de la jerarquía del Drive
(segmento antes del número de unidad). Los datos existentes (pillar_number 1..5)
se backfillean a "P1".."P5".

Revision ID: ce07pillarcode1
Revises: ce06simporg001
Create Date: 2026-08-17 00:00:00.000000
"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "ce07pillarcode1"
down_revision: str | None = "ce06simporg001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("learning_units", sa.Column("pillar_code", sa.String(12), nullable=True))
    # Backfill: pillar_number N → "PN" (los existentes son pilares numerados).
    op.execute(
        "UPDATE learning_units SET pillar_code = 'P' || pillar_number::text "
        "WHERE pillar_number IS NOT NULL"
    )
    op.drop_column("learning_units", "pillar_number")


def downgrade() -> None:
    op.add_column("learning_units", sa.Column("pillar_number", sa.Integer(), nullable=True))
    # Revertir: "P<n>" → n (los códigos nombrados como "AI" quedan en NULL).
    op.execute(
        "UPDATE learning_units SET pillar_number = "
        "NULLIF(regexp_replace(pillar_code, '^P', ''), '')::int "
        "WHERE pillar_code ~ '^P[0-9]+$'"
    )
    op.drop_column("learning_units", "pillar_code")
