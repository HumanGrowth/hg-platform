"""add organization license_quota (CE-07)

Cupo de licencias por organización: el admin reparte el pool de la Empresa
entre sus orgs (la suma de cupos <= pool). Solo agrega la columna
``organizations.license_quota`` (default 0); el resto del schema no se toca.

Revision ID: 2a3c52c9973a
Revises: ce07pillarcode1
Create Date: 2026-08-24 16:29:40.841457

"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = '2a3c52c9973a'
down_revision: str | None = 'ce07pillarcode1'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # server_default="0" para poblar las filas existentes; luego lo quitamos para
    # que el default lo maneje la app (no la DB).
    op.add_column(
        "organizations",
        sa.Column("license_quota", sa.Integer(), nullable=False, server_default="0"),
    )
    op.alter_column("organizations", "license_quota", server_default=None)


def downgrade() -> None:
    op.drop_column("organizations", "license_quota")
