"""CE-06 Simplificar organizations: billing/contrato/licencias viven en Company

Decisión Andy (14-ago): la Empresa (Company) es la entidad comercial/contractual
y dueña del pool de licencias; la Organization es solo la unidad operativa. Se
dropean de ``organizations`` las columnas que duplicaban a ``companies`` (copias
muertas, sin lógica que las lea) y el modelo de licencias por-org (el límite es
solo el pool de la Empresa, computado por users activos).

Columnas eliminadas: tier, billing_status, billing_cycle, contract_start,
contract_end, licenses_total, licenses_used.

Revision ID: ce06simporg001
Revises: ce05consentg001
Create Date: 2026-08-14 00:00:00.000000
"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "ce06simporg001"
down_revision: str | None = "ce05consentg001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_DROPPED = [
    "tier", "billing_status", "billing_cycle",
    "contract_start", "contract_end", "licenses_total", "licenses_used",
]


def upgrade() -> None:
    for col in _DROPPED:
        op.drop_column("organizations", col)


def downgrade() -> None:
    # Re-crea las columnas (nullable, sin restaurar datos: eran copias redundantes
    # de Company). El enum ``org_tier`` ya existe — no se re-declara.
    op.add_column(
        "organizations",
        sa.Column("tier", sa.Enum(name="org_tier", create_type=False), nullable=True),
    )
    op.add_column("organizations", sa.Column("billing_status", sa.String(50), nullable=True))
    op.add_column("organizations", sa.Column("billing_cycle", sa.String(20), nullable=True))
    op.add_column("organizations", sa.Column("contract_start", sa.Date(), nullable=True))
    op.add_column("organizations", sa.Column("contract_end", sa.Date(), nullable=True))
    op.add_column("organizations", sa.Column("licenses_total", sa.Integer(), nullable=True))
    op.add_column(
        "organizations",
        sa.Column("licenses_used", sa.Integer(), nullable=True, server_default="0"),
    )
