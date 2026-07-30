"""ST-02 eventos de comunidad sobre la tabla events (Sprint Tarde · TASK 5)

Reutiliza la tabla ``events`` para los eventos de comunidad (live/webinars/
material), según decisión de Andy. Los eventos de comunidad se distinguen del
contenido de aprendizaje por ``career_path_id IS NULL`` (el contenido siempre
lo lleva). Por eso:
- ``career_path_id`` y ``career_level`` pasan a NULLABLE.
- ``event_type`` suma el valor ``material``.
- Se agregan ``ends_at``, ``cta_url``, ``cta_label``, ``is_featured``.

Revision ID: f2a3b4c5d6e7
Revises: e1f2a3b4c5d6
Create Date: 2026-07-30 00:30:00.000000

"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "f2a3b4c5d6e7"
down_revision: str | None = "e1f2a3b4c5d6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # ALTER TYPE ADD VALUE no puede correr dentro de la transacción de la
    # migración → autocommit_block.
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'material'")

    op.alter_column("events", "career_path_id", existing_type=sa.UUID(), nullable=True)
    op.alter_column(
        "events",
        "career_level",
        existing_type=sa.Enum(name="career_level_pmm"),
        nullable=True,
    )

    op.add_column("events", sa.Column("ends_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("events", sa.Column("cta_url", sa.String(length=2048), nullable=True))
    op.add_column("events", sa.Column("cta_label", sa.String(length=120), nullable=True))
    op.add_column(
        "events",
        sa.Column("is_featured", sa.Boolean(), server_default=sa.text("false"), nullable=False),
    )
    op.create_index(op.f("ix_events_is_featured"), "events", ["is_featured"])


def downgrade() -> None:
    op.drop_index(op.f("ix_events_is_featured"), table_name="events")
    op.drop_column("events", "is_featured")
    op.drop_column("events", "cta_label")
    op.drop_column("events", "cta_url")
    op.drop_column("events", "ends_at")
    # Revertir a NOT NULL (falla si ya hay eventos de comunidad con NULL — sólo
    # relevante en dev). El valor de enum 'material' no se puede quitar en PG.
    op.alter_column(
        "events",
        "career_level",
        existing_type=sa.Enum(name="career_level_pmm"),
        nullable=False,
    )
    op.alter_column("events", "career_path_id", existing_type=sa.UUID(), nullable=False)
