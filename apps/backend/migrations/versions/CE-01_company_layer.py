"""CE-01 Capa Empresa: tabla companies + company_id en orgs/users + rol company_admin

Introduce la Empresa como raíz jerárquica por encima de Organization (TASK 1):
- Tabla ``companies`` (sin RLS, gobernada por superadmin — mismo criterio que
  ``organizations``).
- ``organizations.company_id`` y ``users.company_id`` (FK → companies, CASCADE).
- ``UserRole`` suma ``company_admin``.
- ``organizations.licenses_total/used`` pasan a nullable (cap opcional; el pool
  vive en la Company).

Data migration idempotente: envuelve cada Organization existente en una Company
1:1 (name/slug derivados), mueve el ``licenses_total`` de la org al pool de la
Company y deja el cap de la org en ``NULL`` (pool puro para las existentes).

Revision ID: ce01companylay1
Revises: ce00renamedim1
Create Date: 2026-08-13 00:00:00.000000
"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "ce01companylay1"
down_revision: str | None = "ce00renamedim1"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. Tabla companies (reusa el enum org_tier existente).
    op.create_table(
        "companies",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("slug", sa.String(100), nullable=False),
        sa.Column(
            "tier",
            postgresql.ENUM(name="org_tier", create_type=False),
            nullable=False,
            server_default="C",
        ),
        sa.Column("billing_status", sa.String(50), nullable=False, server_default="trial"),
        sa.Column("billing_cycle", sa.String(20)),
        sa.Column("contract_start", sa.Date()),
        sa.Column("contract_end", sa.Date()),
        sa.Column("licenses_total", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_unique_constraint("uq_companies_slug", "companies", ["slug"])
    op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON companies TO hg_app, hg_superadmin")

    # 2. user_role += company_admin (PG12+ permite ADD VALUE en transacción; no se
    #    usa el valor en esta misma migración).
    op.execute("ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'company_admin'")

    # 3. company_id (nullable primero, para poder poblarlo).
    op.add_column(
        "organizations", sa.Column("company_id", postgresql.UUID(as_uuid=True), nullable=True)
    )
    op.add_column("users", sa.Column("company_id", postgresql.UUID(as_uuid=True), nullable=True))

    # 4. licencias de org → nullable (cap opcional).
    op.alter_column("organizations", "licenses_total", existing_type=sa.Integer(), nullable=True)
    op.alter_column("organizations", "licenses_used", existing_type=sa.Integer(), nullable=True)

    # 5. Data migration: una Company envoltura por org (slug 1:1).
    op.execute(
        """
        INSERT INTO companies (id, name, slug, tier, billing_status, billing_cycle,
                               contract_start, contract_end, licenses_total, is_active,
                               created_at, updated_at)
        SELECT gen_random_uuid(), name, slug, tier, billing_status, billing_cycle,
               contract_start, contract_end, COALESCE(licenses_total, 0), is_active,
               now(), now()
        FROM organizations
        """
    )
    op.execute("UPDATE organizations o SET company_id = c.id FROM companies c WHERE c.slug = o.slug")
    op.execute("UPDATE users u SET company_id = o.company_id FROM organizations o WHERE u.org_id = o.id")
    # Mover el cap de la org al pool de la Company: dejar el cap de la org en NULL.
    op.execute("UPDATE organizations SET licenses_total = NULL")

    # 6. FKs + índices + NOT NULL.
    op.create_index("ix_organizations_company_id", "organizations", ["company_id"])
    op.create_index("ix_users_company_id", "users", ["company_id"])
    op.create_foreign_key(
        "organizations_company_id_fkey", "organizations", "companies",
        ["company_id"], ["id"], ondelete="CASCADE",
    )
    op.create_foreign_key(
        "users_company_id_fkey", "users", "companies",
        ["company_id"], ["id"], ondelete="CASCADE",
    )
    op.alter_column("organizations", "company_id", nullable=False)
    op.alter_column("users", "company_id", nullable=False)


def downgrade() -> None:
    # Restaurar el cap de la org desde el pool de su Company antes de soltar el link.
    op.execute(
        "UPDATE organizations o SET licenses_total = c.licenses_total "
        "FROM companies c WHERE o.company_id = c.id"
    )
    op.drop_constraint("users_company_id_fkey", "users", type_="foreignkey")
    op.drop_constraint("organizations_company_id_fkey", "organizations", type_="foreignkey")
    op.drop_index("ix_users_company_id", table_name="users")
    op.drop_index("ix_organizations_company_id", table_name="organizations")
    op.drop_column("users", "company_id")
    op.drop_column("organizations", "company_id")
    op.execute("UPDATE organizations SET licenses_total = 0 WHERE licenses_total IS NULL")
    op.execute("UPDATE organizations SET licenses_used = 0 WHERE licenses_used IS NULL")
    op.alter_column("organizations", "licenses_used", existing_type=sa.Integer(), nullable=False)
    op.alter_column("organizations", "licenses_total", existing_type=sa.Integer(), nullable=False)
    op.drop_table("companies")
    # Nota: el valor 'company_admin' del enum user_role no se remueve (PG no
    # soporta DROP VALUE; recrear el tipo es innecesario para el downgrade).
