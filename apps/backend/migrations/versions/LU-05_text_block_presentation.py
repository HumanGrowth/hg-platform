"""learning units: tags de presentación por bloque (plantillas sociales).

Aditiva y backward compat 100%: una columna JSONB **nullable, sin default ni
backfill**. Las units existentes quedan con NULL y el frontend las renderiza
exactamente igual que antes (auto-detect de plantilla = look actual).

- ``text_blocks.presentation`` (JSONB): {template, tone, accent, motif, format,
  emphasis_level, pull_quote, cta}. eyebrow/hero_stat/checklist_items/keywords
  siguen en sus columnas.

Downgrade dropea la columna, limpio.
"""
from __future__ import annotations

from typing import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "lu05presentat01"
down_revision: str | None = "ce12nomgrwgt1"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("text_blocks", sa.Column("presentation", postgresql.JSONB(), nullable=True))


def downgrade() -> None:
    op.drop_column("text_blocks", "presentation")
