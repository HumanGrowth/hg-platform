"""SP-03 support_ticket_attachments (ADR-0015, addendum)

Adjuntos de tickets de soporte, guardados en la base (bytea) para no exponer screenshots en un
bucket público. RLS + FORCE con la misma política ``tenant_isolation`` que los tickets; ``org_id``
NULL = ticket público (solo ``hg_superadmin``). Append-only para ambos roles.

Revision ID: sp03supportattach
Revises: sp01supporttickets
Create Date: 2026-11-12 00:00:00.000000

"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "sp03supportattach"
down_revision: str | None = "sp01supporttickets"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_TENANT_POLICY = (
    "CREATE POLICY tenant_isolation ON {table} "
    "USING (org_id = current_setting('app.current_org_id', true)::uuid) "
    "WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid)"
)


def upgrade() -> None:
    op.create_table(
        "support_ticket_attachments",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("ticket_id", sa.UUID(), nullable=False),
        sa.Column("org_id", sa.UUID(), nullable=True),
        sa.Column("filename", sa.String(length=120), nullable=False),
        sa.Column("content_type", sa.String(length=64), nullable=False),
        sa.Column("size_bytes", sa.Integer(), nullable=False),
        sa.Column("data", sa.LargeBinary(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["ticket_id"], ["support_tickets.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_support_ticket_attachments_ticket_id"), "support_ticket_attachments", ["ticket_id"]
    )
    op.create_index(
        op.f("ix_support_ticket_attachments_org_id"), "support_ticket_attachments", ["org_id"]
    )
    op.execute("ALTER TABLE support_ticket_attachments ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE support_ticket_attachments FORCE ROW LEVEL SECURITY")
    op.execute(_TENANT_POLICY.format(table="support_ticket_attachments"))
    op.execute("GRANT SELECT, INSERT ON support_ticket_attachments TO hg_app, hg_superadmin")
    # ALTER DEFAULT PRIVILEGES (B1-04) otorga ALL: se revoca explícito (append-only).
    op.execute(
        "REVOKE UPDATE, DELETE, TRUNCATE ON support_ticket_attachments FROM hg_app, hg_superadmin"
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS support_ticket_attachments CASCADE")
