"""learning units: split dimensión/pilar en el código (TASK 1 · fixes módulos).

El Drive codifica ``<DIM>-L<n>-P<n>-<seq>`` (ej. ``CP-L1-P2-001``), pero la app
guardaba el **pilar** (``P<n>``) dentro de ``pillar_code`` y perdía la
**dimensión** (``CP``). Esta revisión:

- Renombra ``pillar_code`` → ``dimension_code`` (VARCHAR 20) y **dropea el FK a
  career_paths** (los códigos Drive no viven en esa tabla; el mapeo
  dimensión→career_path se resuelve en la app, ver ``dimensions.py``).
- Agrega ``pillar_number`` y ``unit_number`` (INT, nullable).
- **Backfill** de los datos actuales (todos CP): ``pillar_number`` ← el ``P<n>``
  que estaba mal puesto en ``pillar_code``; ``unit_number`` ← el seq del slug;
  ``dimension_code`` ← ``'CP'``.

Downgrade reconstruye ``pillar_code`` desde ``pillar_number`` y restaura el FK.
"""
from __future__ import annotations

from typing import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "d2b3c4e5f6a7"
down_revision: str | None = "c1a2b3d4e5f6"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None

_FK = "learning_units_pillar_code_fkey"


def upgrade() -> None:
    op.drop_constraint(_FK, "learning_units", type_="foreignkey")
    op.add_column("learning_units", sa.Column("pillar_number", sa.Integer(), nullable=True))
    op.add_column("learning_units", sa.Column("unit_number", sa.Integer(), nullable=True))

    # Backfill ANTES del rename, mientras la columna todavía se llama pillar_code
    # y guarda el P<n> del Drive.
    op.execute(
        "UPDATE learning_units SET pillar_number = CAST(substring(pillar_code from '[0-9]+') AS INTEGER) "
        "WHERE pillar_code ~ '^P[0-9]+$'"
    )
    op.execute(
        "UPDATE learning_units SET unit_number = CAST(substring(slug from '[0-9]{3,4}') AS INTEGER) "
        "WHERE slug ~ '[0-9]{3,4}'"
    )

    op.alter_column(
        "learning_units",
        "pillar_code",
        new_column_name="dimension_code",
        type_=sa.String(length=20),
        existing_type=sa.String(length=10),
        existing_nullable=False,
    )
    op.execute("ALTER INDEX IF EXISTS ix_learning_units_pillar_code RENAME TO ix_learning_units_dimension_code")

    # Remap: los valores mislabel (P<n>) → la dimensión real. Hoy todo es CP.
    op.execute("UPDATE learning_units SET dimension_code = 'CP' WHERE dimension_code ~ '^P[0-9]+$'")


def downgrade() -> None:
    # Reconstruye pillar_code (P<n>) desde pillar_number.
    op.execute(
        "UPDATE learning_units SET dimension_code = 'P' || pillar_number::text WHERE pillar_number IS NOT NULL"
    )
    op.execute("ALTER INDEX IF EXISTS ix_learning_units_dimension_code RENAME TO ix_learning_units_pillar_code")
    op.alter_column(
        "learning_units",
        "dimension_code",
        new_column_name="pillar_code",
        type_=sa.String(length=10),
        existing_type=sa.String(length=20),
        existing_nullable=False,
    )
    op.drop_column("learning_units", "unit_number")
    op.drop_column("learning_units", "pillar_number")
    op.create_foreign_key(_FK, "learning_units", "career_paths", ["pillar_code"], ["code"])
