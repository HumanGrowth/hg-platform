"""CE-12 Elimina manager_weight — el feedback del manager pasa de ponderación a gate

El manager ya NO pondera el ``completion_pct`` (FASE 1.1's 3er componente se
revierte). En su lugar, la evaluación de comportamientos que YA existe
(``behavior_evaluations``) se usa como gate binario: el badge de nivel solo se
otorga si, además de aprendizaje+assessment, el manager calificó "Demostrando"
TODOS los comportamientos activos de la dimensión (ver
``badges/progression._manager_approved``). ``manager_pct`` en
``dimension_level_progress`` se conserva (informativo, ya no pesa).

``manager_weight`` estaba en 0.0 en todas las filas (nunca se configuró un
peso real en producción — FASE 1.4 quedó sin usar), así que este drop no
mueve ningún score existente.

Revision ID: ce12nomgrwgt1
Revises: ce11custompath1
Create Date: 2026-09-16 00:00:00.000000
"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "ce12nomgrwgt1"
down_revision: str | None = "ce11custompath1"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_column("dimension_scoring_config", "manager_weight")


def downgrade() -> None:
    op.add_column(
        "dimension_scoring_config",
        sa.Column("manager_weight", sa.Float(), nullable=False, server_default="0.0"),
    )
