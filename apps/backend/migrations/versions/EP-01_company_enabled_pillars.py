"""EP-01 companies.enabled_pillars (pilares habilitados por Empresa)

Los pilares (CP, PR, RE, SA, PI, ES) cuyo contenido puede ver/recibir una Empresa.
Default: los 6 (las empresas existentes no cambian). Lo gobierna el superadmin.

Revision ID: d6e7f8a9b0c1
Revises: c5d6e7f8a9b0
Create Date: 2026-10-08 00:00:00.000000

"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "d6e7f8a9b0c1"
down_revision: str | None = "c5d6e7f8a9b0"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "companies",
        sa.Column(
            "enabled_pillars",
            postgresql.ARRAY(sa.String(length=4)),
            nullable=False,
            server_default=sa.text("ARRAY['CP','PR','RE','SA','PI','ES']::varchar[]"),
        ),
    )


def downgrade() -> None:
    op.drop_column("companies", "enabled_pillars")
