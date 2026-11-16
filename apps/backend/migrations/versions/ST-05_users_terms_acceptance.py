"""ST-05 users.terms_accepted_at / terms_version

Registro de aceptación de Términos + Privacidad al crear la cuenta.
NULL para usuarios existentes (no se les pide retroactivamente).

Revision ID: st05termsaccept
Revises: sp03supportattach
Create Date: 2026-11-13 00:00:00.000000

"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "st05termsaccept"
down_revision: str | None = "sp03supportattach"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("users", sa.Column("terms_accepted_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("users", sa.Column("terms_version", sa.String(length=20), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "terms_version")
    op.drop_column("users", "terms_accepted_at")
