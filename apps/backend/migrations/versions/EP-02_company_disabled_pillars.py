"""EP-02 companies.disabled_pillars (pilares deshabilitados dentro de una dimensión)

EP-01 guardó en ``companies.enabled_pillars`` los códigos de DIMENSIÓN (CP, PR, …)
— mal nombrado: un pilar es una sub-categoría dentro de una dimensión. La columna
conserva su nombre en DB (renombrarla rompería el código ya desplegado); el modelo
la expone como ``enabled_dimensions``. Esta migración agrega los PILARES
deshabilitados, como claves ``"<DIM>:<PILAR>"`` (p. ej. ``"CP:P3"``). Lista vacía =
todos habilitados, así un pilar nuevo del catálogo nace habilitado.

Revision ID: e7f8a9b0c1d2
Revises: d6e7f8a9b0c1
Create Date: 2026-10-08 00:00:00.000000

"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "e7f8a9b0c1d2"
down_revision: str | None = "d6e7f8a9b0c1"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "companies",
        sa.Column(
            "disabled_pillars",
            postgresql.ARRAY(sa.String(length=20)),
            nullable=False,
            server_default=sa.text("ARRAY[]::varchar[]"),
        ),
    )


def downgrade() -> None:
    op.drop_column("companies", "disabled_pillars")
