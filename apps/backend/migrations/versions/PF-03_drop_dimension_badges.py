"""PF-03 Borra el catálogo viejo de badges `dimension-*`

Un badge genérico por dimensión (seed_badges.py) que quedó superado por los
badges de nivel (`level-*`) y de pilar (`pillar-*`). Se borran de la base —no
solo se desactivan— junto con los `user_badges` que los referencian.

Irreversible: el downgrade no restaura filas (el seed ya no las define). Hacer
backup de las filas afectadas antes de correr esto en producción.

Revision ID: pf03dropdimbadg1
Revises: pf02coachtips01
Create Date: 2026-09-25 00:00:00.000000
"""
from __future__ import annotations

from collections.abc import Sequence

from alembic import op

revision: str = "pf03dropdimbadg1"
down_revision: str | None = "pf02coachtips01"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        "DELETE FROM user_badges WHERE badge_id IN "
        "(SELECT id FROM badges WHERE code LIKE 'dimension-%')"
    )
    op.execute("DELETE FROM badges WHERE code LIKE 'dimension-%'")


def downgrade() -> None:
    # Irreversible a propósito: el catálogo `dimension-*` ya no existe en el seed.
    pass
