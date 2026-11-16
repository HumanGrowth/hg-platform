"""LC-01 ciclo de vida de licenciamiento por Empresa

- companies: status (CHECK), status_changed_at, status_reason, grace_days, grace_ends_at.
- Backfill: is_active=false -> suspended; billing_status='trial' -> trial; resto -> active.
- company_lifecycle_events: auditoría APPEND-ONLY (sin UPDATE/DELETE para ningún rol).

``companies.is_active`` queda en su lugar pero deprecado (ADR-0016).

Revision ID: lc01companylifecycle
Revises: st05termsaccept
Create Date: 2026-11-16 00:00:00.000000

"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "lc01companylifecycle"
down_revision: str | None = "st05termsaccept"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_STATUSES = "'trial','active','grace','suspended','terminated'"


def upgrade() -> None:
    # 1. companies ---------------------------------------------------------
    # server_default temporal solo para poder agregar la columna NOT NULL; se
    # quita tras el backfill (el valor lo maneja la app).
    op.add_column(
        "companies",
        sa.Column("status", sa.String(length=20), nullable=False, server_default="active"),
    )
    op.add_column(
        "companies",
        sa.Column(
            "status_changed_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.add_column("companies", sa.Column("status_reason", sa.Text(), nullable=True))
    op.add_column(
        "companies",
        sa.Column("grace_days", sa.Integer(), nullable=False, server_default="30"),
    )
    op.add_column("companies", sa.Column("grace_ends_at", sa.DateTime(timezone=True), nullable=True))

    # 2. Backfill ----------------------------------------------------------
    op.execute(
        """
        UPDATE companies SET status = CASE
            WHEN is_active = false THEN 'suspended'
            WHEN billing_status = 'trial' THEN 'trial'
            ELSE 'active'
        END
        """
    )
    op.alter_column("companies", "status", server_default=None)
    op.create_check_constraint("ck_companies_status", "companies", f"status IN ({_STATUSES})")
    op.create_check_constraint(
        "ck_companies_grace_days", "companies", "grace_days BETWEEN 0 AND 180"
    )

    # 3. company_lifecycle_events (append-only, sin RLS) ---------------------
    op.create_table(
        "company_lifecycle_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "company_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("companies.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("event_type", sa.String(length=40), nullable=False),
        sa.Column("from_status", sa.String(length=20), nullable=True),
        sa.Column("to_status", sa.String(length=20), nullable=True),
        sa.Column(
            "actor_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column(
            "metadata",
            postgresql.JSONB(),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index(
        "ix_company_lifecycle_events_company_created",
        "company_lifecycle_events",
        ["company_id", sa.text("created_at DESC")],
    )
    # B1-04 dejó ALTER DEFAULT PRIVILEGES ... GRANT ALL a hg_app: un GRANT
    # angosto no alcanza, hay que REVOCAR explícitamente.
    op.execute("REVOKE ALL ON company_lifecycle_events FROM PUBLIC, hg_app, hg_superadmin")
    op.execute("GRANT SELECT, INSERT ON company_lifecycle_events TO hg_superadmin")


def downgrade() -> None:
    op.drop_index("ix_company_lifecycle_events_company_created", table_name="company_lifecycle_events")
    op.drop_table("company_lifecycle_events")
    op.drop_constraint("ck_companies_grace_days", "companies", type_="check")
    op.drop_constraint("ck_companies_status", "companies", type_="check")
    op.drop_column("companies", "grace_ends_at")
    op.drop_column("companies", "grace_days")
    op.drop_column("companies", "status_reason")
    op.drop_column("companies", "status_changed_at")
    op.drop_column("companies", "status")
