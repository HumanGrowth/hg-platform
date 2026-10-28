"""LU-20 Bloque ``text_reflection`` ("Tu práctica") del contenido oficial Wave 2

El contenido oficial trae un tipo de bloque nuevo, opcional, que va entre la
solución y la reflexión escrita: un checklist de práctica semanal + pregunta de
cierre (131 unidades). Se modela como una variante más de los bloques de texto:

- ``unit_block_type`` += ``text_reflection``
- ``text_block_variant`` += ``reflection``

Aditiva: no toca filas existentes. ``ADD VALUE`` no corre dentro de una
transacción, de ahí el ``autocommit_block``.

Downgrade: Postgres no permite quitar valores de un enum. Se borran los bloques
``text_reflection`` (con su progreso en cascada) y los valores quedan sin uso en
el tipo; es inocuo.

Revision ID: lu20textreflection
Revises: bp01userinvited
Create Date: 2026-10-28 00:00:00.000000
"""
from __future__ import annotations

from collections.abc import Sequence

from alembic import op

revision: str = "lu20textreflection"
down_revision: str | None = "bp01userinvited"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE unit_block_type ADD VALUE IF NOT EXISTS 'text_reflection'")
        op.execute("ALTER TYPE text_block_variant ADD VALUE IF NOT EXISTS 'reflection'")


def downgrade() -> None:
    op.execute(
        "DELETE FROM text_blocks WHERE id IN "
        "(SELECT block_id FROM unit_blocks WHERE block_type = 'text_reflection')"
    )
    op.execute("DELETE FROM unit_blocks WHERE block_type = 'text_reflection'")
