"""learning units: campos visuales opcionales (Sprint UI Identidad · TASK 12).

Capa opcional para que el mentor destaque números, pasos, capítulos y tono
narrativo — todo nullable, **backward compat 100%**: las units en prod no se
tocan (quedan con NULL en las columnas nuevas y se renderizan igual que antes).

- ``video_blocks.chapters`` (JSONB): [{start_sec, label}] para videos largos.
- ``text_blocks.hero_stat`` (JSONB): {value, label, source} del data-point
  destacado de un ``text_evidence``.
- ``text_blocks.checklist_items`` (JSONB): [{title, detail?}] del checklist de
  un ``text_solution``.
- ``learning_units.narrative_tone`` (VARCHAR + check): escala transiciones.
- ``learning_units.keywords`` (JSONB): tags unit-level.

Downgrade dropea las 5 columnas + el check, limpio.
"""
from __future__ import annotations

from typing import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "c1a2b3d4e5f6"
down_revision: str | None = "b7f3a1c9d4e2"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None

_TONE_CK = "ck_learning_units_narrative_tone"


def upgrade() -> None:
    op.add_column("video_blocks", sa.Column("chapters", postgresql.JSONB(), nullable=True))
    op.add_column("text_blocks", sa.Column("hero_stat", postgresql.JSONB(), nullable=True))
    op.add_column("text_blocks", sa.Column("checklist_items", postgresql.JSONB(), nullable=True))
    op.add_column("learning_units", sa.Column("keywords", postgresql.JSONB(), nullable=True))
    op.add_column("learning_units", sa.Column("narrative_tone", sa.String(length=20), nullable=True))
    op.create_check_constraint(
        _TONE_CK,
        "learning_units",
        "narrative_tone IS NULL OR narrative_tone IN "
        "('active', 'contemplative', 'analytical', 'warm')",
    )


def downgrade() -> None:
    op.drop_constraint(_TONE_CK, "learning_units", type_="check")
    op.drop_column("learning_units", "narrative_tone")
    op.drop_column("learning_units", "keywords")
    op.drop_column("text_blocks", "checklist_items")
    op.drop_column("text_blocks", "hero_stat")
    op.drop_column("video_blocks", "chapters")
