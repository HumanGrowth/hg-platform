"""SP-01 support_tickets + support_ticket_events (ADR-0015)

Tickets de soporte con RLS por org. ``org_id`` es nullable solo para tickets del formulario
público: con ``org_id NULL`` la política ``tenant_isolation`` nunca coincide, así que esas filas
las ve únicamente ``hg_superadmin`` (BYPASSRLS). Los eventos son append-only para ``hg_app``
(SELECT + INSERT). El código legible (SP-0001) sale de una secuencia.

Revision ID: sp01supporttickets
Revises: rh02dashprefs
Create Date: 2026-11-11 00:00:00.000000

"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "sp01supporttickets"
down_revision: str | None = "rh02dashprefs"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_TENANT_POLICY = (
    "CREATE POLICY tenant_isolation ON {table} "
    "USING (org_id = current_setting('app.current_org_id', true)::uuid) "
    "WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid)"
)


def upgrade() -> None:
    op.execute("CREATE SEQUENCE support_ticket_code_seq START 1")
    op.execute("GRANT USAGE, SELECT ON SEQUENCE support_ticket_code_seq TO hg_app, hg_superadmin")

    op.create_table(
        "support_tickets",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("code", sa.String(length=16), nullable=False),
        sa.Column("org_id", sa.UUID(), nullable=True),
        sa.Column("user_id", sa.UUID(), nullable=True),
        sa.Column("reporter_email", sa.String(length=254), nullable=False),
        sa.Column("reporter_name", sa.String(length=255), nullable=True),
        sa.Column("subject", sa.String(length=200), nullable=False),
        sa.Column("body", sa.String(length=5000), nullable=False),
        sa.Column("category", sa.String(length=24), server_default="other", nullable=False),
        sa.Column("severity", sa.String(length=16), server_default="medium", nullable=False),
        sa.Column("status", sa.String(length=24), server_default="new", nullable=False),
        sa.Column("source", sa.String(length=16), nullable=False),
        sa.Column("page_url", sa.String(length=500), nullable=True),
        sa.Column("user_agent", sa.String(length=300), nullable=True),
        sa.Column("app_version", sa.String(length=40), nullable=True),
        sa.Column("reporter_role", sa.String(length=32), nullable=True),
        sa.Column("locale", sa.String(length=8), nullable=True),
        sa.Column("first_response_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code", name="uq_support_ticket_code"),
    )
    op.create_index(op.f("ix_support_tickets_org_id"), "support_tickets", ["org_id"])
    op.create_index(op.f("ix_support_tickets_user_id"), "support_tickets", ["user_id"])
    op.create_index(op.f("ix_support_tickets_reporter_email"), "support_tickets", ["reporter_email"])
    op.create_index(op.f("ix_support_tickets_status"), "support_tickets", ["status"])

    op.execute("ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE support_tickets FORCE ROW LEVEL SECURITY")
    op.execute(_TENANT_POLICY.format(table="support_tickets"))
    op.execute("GRANT SELECT, INSERT, UPDATE ON support_tickets TO hg_app")
    op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON support_tickets TO hg_superadmin")
    # ALTER DEFAULT PRIVILEGES (B1-04) ya otorga ALL a ambos roles sobre tablas nuevas: un GRANT
    # más angosto no quita nada, hay que REVOCAR de forma explícita. La app no borra tickets.
    op.execute("REVOKE DELETE ON support_tickets FROM hg_app")

    op.create_table(
        "support_ticket_events",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("ticket_id", sa.UUID(), nullable=False),
        sa.Column("org_id", sa.UUID(), nullable=True),
        sa.Column("event_type", sa.String(length=24), nullable=False),
        sa.Column("actor_kind", sa.String(length=16), nullable=False),
        sa.Column("actor_user_id", sa.UUID(), nullable=True),
        sa.Column("body", sa.Text(), nullable=True),
        sa.Column("data", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("is_internal", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["ticket_id"], ["support_tickets.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["actor_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_support_ticket_events_ticket_id"), "support_ticket_events", ["ticket_id"])
    op.create_index(op.f("ix_support_ticket_events_org_id"), "support_ticket_events", ["org_id"])

    op.execute("ALTER TABLE support_ticket_events ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE support_ticket_events FORCE ROW LEVEL SECURITY")
    op.execute(_TENANT_POLICY.format(table="support_ticket_events"))
    # Append-only: solo SELECT + INSERT. Se REVOCA explícito porque ALTER DEFAULT PRIVILEGES
    # (B1-04) otorga ALL por defecto y un GRANT angosto no lo restringe.
    op.execute("GRANT SELECT, INSERT ON support_ticket_events TO hg_app, hg_superadmin")
    op.execute("REVOKE UPDATE, DELETE, TRUNCATE ON support_ticket_events FROM hg_app, hg_superadmin")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS support_ticket_events CASCADE")
    op.execute("DROP TABLE IF EXISTS support_tickets CASCADE")
    op.execute("DROP SEQUENCE IF EXISTS support_ticket_code_seq")
