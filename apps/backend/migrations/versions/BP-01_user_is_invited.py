"""BP-01 Pre-provisioning: usuarios invitados

- ``users.is_invited`` (bool, default false): la cuenta ya está configurada pero la
  persona aún no aceptó la invitación. Permite definir organizaciones, managers y
  módulos antes de la aceptación (``accept_invite`` activa la fila existente).
- Check ``ck_users_invited_inactive``: un invitado nunca está activo.
- Backfill: cada invitación VIGENTE sin aceptar (ni revocar, ni vencer) se convierte en
  una cuenta invitada (rol y org de la invitación), para poder configurarla antes de que
  se acepte. El token ya enviado sigue valiendo: ``accept_invite`` activa esa fila.
  Idempotente (omite correos que ya tienen usuario en la org). No envía correos.
  Las invitaciones vencidas no se tocan: se reenvían desde la UI.

Aditiva: las filas existentes quedan ``is_invited = false``.

Revision ID: bp01userinvited
Revises: pr01passwordreset
Create Date: 2026-10-13 00:00:00.000000
"""
from __future__ import annotations

import uuid
from collections.abc import Sequence

import bcrypt
import sqlalchemy as sa
from alembic import op

revision: str = "bp01userinvited"
down_revision: str | None = "pr01passwordreset"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _placeholder_name(email: str) -> str:
    # Espejo de identity.service._display_name_from_email (el invitado aún no tiene nombre).
    local = email.split("@", 1)[0]
    return local.split(".")[0].replace("_", " ").title() or "hola"


def upgrade() -> None:
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_invited boolean NOT NULL DEFAULT false")
    op.execute(
        "ALTER TABLE users ADD CONSTRAINT ck_users_invited_inactive "
        "CHECK (NOT (is_invited AND is_active))"
    )

    # Backfill de invitaciones vigentes → cuentas invitadas.
    bind = op.get_bind()
    pending = bind.execute(
        sa.text(
            "SELECT DISTINCT ON (i.org_id, lower(i.email)) "
            "i.org_id, o.company_id, i.email, i.role::text "
            "FROM invitations i JOIN organizations o ON o.id = i.org_id "
            "WHERE i.accepted_at IS NULL AND i.revoked_at IS NULL AND i.expires_at > now() "
            "AND NOT EXISTS (SELECT 1 FROM users u WHERE u.org_id = i.org_id "
            "                AND lower(u.email) = lower(i.email)) "
            "ORDER BY i.org_id, lower(i.email), i.created_at DESC"
        )
    ).all()
    if pending:
        # Hash centinela: contraseña aleatoria que nadie conoce (el login excluye invitados).
        sentinel = bcrypt.hashpw(uuid.uuid4().hex.encode(), bcrypt.gensalt()).decode()
        bind.execute(
            sa.text(
                "INSERT INTO users (id, org_id, company_id, email, hashed_password, full_name, "
                "role, is_active, is_invited, has_seen_onboarding) "
                "VALUES (:id, :org_id, :company_id, :email, :pw, :name, CAST(:role AS user_role), "
                "false, true, false)"
            ),
            [
                {
                    "id": uuid.uuid4(), "org_id": org_id, "company_id": company_id,
                    "email": email, "pw": sentinel, "name": _placeholder_name(email), "role": role,
                }
                for org_id, company_id, email, role in pending
            ],
        )


def downgrade() -> None:
    # Las cuentas invitadas creadas por el backfill no tienen datos propios: se eliminan.
    op.execute("DELETE FROM users WHERE is_invited")
    op.execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS ck_users_invited_inactive")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS is_invited")
