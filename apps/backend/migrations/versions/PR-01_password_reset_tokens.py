"""PR-01 password_reset_tokens: recuperación de contraseña

Tabla de tokens opacos de un solo uso (hash sha256) para el flujo
"Olvidé mi contraseña". Lleva ``org_id`` + RLS ``tenant_isolation``; los
endpoints públicos que la usan corren como ``hg_superadmin`` (BYPASSRLS).

Revision ID: pr01passwordreset
Revises: pf03pillarcontent1
Create Date: 2026-10-12 00:00:00.000000
"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "pr01passwordreset"
down_revision: str | None = "pf03pillarcontent1"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "password_reset_tokens",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("org_id", sa.UUID(), nullable=False),
        sa.Column("token_hash", sa.String(length=255), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_password_reset_tokens_user_id"), "password_reset_tokens", ["user_id"]
    )
    op.create_index(op.f("ix_password_reset_tokens_org_id"), "password_reset_tokens", ["org_id"])
    op.create_index(
        op.f("ix_password_reset_tokens_token_hash"),
        "password_reset_tokens",
        ["token_hash"],
        unique=True,
    )
    op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON password_reset_tokens TO hg_app;")
    op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON password_reset_tokens TO hg_superadmin;")
    op.execute("ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;")
    op.execute("ALTER TABLE password_reset_tokens FORCE ROW LEVEL SECURITY;")
    op.execute(
        """
        CREATE POLICY tenant_isolation ON password_reset_tokens
        USING (org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid)
        WITH CHECK (org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid);
        """
    )


def downgrade() -> None:
    op.execute("DROP POLICY IF EXISTS tenant_isolation ON password_reset_tokens;")
    op.drop_index(op.f("ix_password_reset_tokens_org_id"), table_name="password_reset_tokens")
    op.drop_index(op.f("ix_password_reset_tokens_token_hash"), table_name="password_reset_tokens")
    op.drop_index(op.f("ix_password_reset_tokens_user_id"), table_name="password_reset_tokens")
    op.drop_table("password_reset_tokens")
