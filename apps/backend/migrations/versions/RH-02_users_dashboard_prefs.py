"""RH-02 users.dashboard_prefs (personalización del dashboard por usuario)

Cada administrador ordena y oculta los widgets de su dashboard. Se guarda como
JSONB en la propia fila del usuario (``{"org": {"order": [...], "hidden": [...]}}``):
va por usuario, así que la RLS existente de ``users`` ya la aísla; no hay tabla
nueva ni grants nuevos.

Aditiva: ``NOT NULL DEFAULT '{}'`` no toca el resto de columnas.

Revision ID: rh02dashprefs
Revises: lu20textreflection
Create Date: 2026-11-03 00:00:00.000000
"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "rh02dashprefs"
down_revision: str | None = "lu20textreflection"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "dashboard_prefs",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_column("users", "dashboard_prefs")
