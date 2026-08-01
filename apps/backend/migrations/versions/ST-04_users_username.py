"""ST-04 users.username (Release TASK 3.4)

Username opcional, único por org. Backward-compat: NULL para users existentes.

Revision ID: b4c5d6e7f8a9
Revises: a3b4c5d6e7f8
Create Date: 2026-08-01 00:00:00.000000

"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "b4c5d6e7f8a9"
down_revision: str | None = "a3b4c5d6e7f8"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("users", sa.Column("username", sa.String(length=30), nullable=True))
    op.create_unique_constraint("uq_users_org_username", "users", ["org_id", "username"])


def downgrade() -> None:
    op.drop_constraint("uq_users_org_username", "users", type_="unique")
    op.drop_column("users", "username")
