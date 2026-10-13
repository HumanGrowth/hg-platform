"""BP-01 Pre-provisioning: usuarios invitados

- ``users.is_invited`` (bool, default false): la cuenta ya está configurada pero la
  persona aún no aceptó la invitación. Permite definir organizaciones, managers y
  módulos antes de la aceptación (``accept_invite`` activa la fila existente).
- Check ``ck_users_invited_inactive``: un invitado nunca está activo.

Solo aditiva: las filas existentes quedan ``is_invited = false``.

Revision ID: bp01userinvited
Revises: pr01passwordreset
Create Date: 2026-10-13 00:00:00.000000
"""
from __future__ import annotations

from collections.abc import Sequence

from alembic import op

revision: str = "bp01userinvited"
down_revision: str | None = "pr01passwordreset"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_invited boolean NOT NULL DEFAULT false")
    op.execute(
        "ALTER TABLE users ADD CONSTRAINT ck_users_invited_inactive "
        "CHECK (NOT (is_invited AND is_active))"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS ck_users_invited_inactive")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS is_invited")
