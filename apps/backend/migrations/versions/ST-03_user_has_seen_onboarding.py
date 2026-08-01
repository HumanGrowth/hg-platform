"""ST-03 users.has_seen_onboarding (Release TASK 6)

Flag para el tour de onboarding post-primer-login. Backward-compat: default false
(los usuarios existentes verán el tour la próxima vez — aceptable, o Andy puede
marcarlos como vistos con un UPDATE puntual si prefiere).

Revision ID: a3b4c5d6e7f8
Revises: f2a3b4c5d6e7
Create Date: 2026-07-31 00:00:00.000000

"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "a3b4c5d6e7f8"
down_revision: str | None = "f2a3b4c5d6e7"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "has_seen_onboarding",
            sa.Boolean(),
            server_default=sa.text("false"),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_column("users", "has_seen_onboarding")
