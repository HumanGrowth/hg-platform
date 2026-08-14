"""CE-02 Áreas de contenido + acceso por Empresa (Capa Empresa · TASK 8)

- Tabla ``areas`` (catálogo global sin RLS, gobernado por superadmin) + seed
  inicial: MFG (Manufactura), IT (Tecnología), CC (Cost center).
- ``learning_units.area_code`` (nullable FK → areas.code). NULL = contenido
  general (visible a todas las empresas). Las units existentes quedan NULL
  (Carrera/CP y todo lo actual = general — decisión Andy 13-ago).
- Tabla ``company_area_access`` (entitlements Empresa↔Área, sin RLS).

Revision ID: ce02areas000001
Revises: ce01companylay1
Create Date: 2026-08-13 00:00:00.000000
"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "ce02areas000001"
down_revision: str | None = "ce01companylay1"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_SEED_AREAS = [
    ("MFG", "Manufactura"),
    ("IT", "Tecnología"),
    ("CC", "Cost center"),
]


def upgrade() -> None:
    # 1. areas
    op.create_table(
        "areas",
        sa.Column("code", sa.String(10), primary_key=True),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON areas TO hg_app, hg_superadmin")
    areas_tbl = sa.table("areas", sa.column("code", sa.String), sa.column("name", sa.String))
    op.bulk_insert(areas_tbl, [{"code": c, "name": n} for c, n in _SEED_AREAS])

    # 2. learning_units.area_code (nullable → units existentes quedan NULL/general)
    op.add_column("learning_units", sa.Column("area_code", sa.String(10), nullable=True))
    op.create_index("ix_learning_units_area_code", "learning_units", ["area_code"])
    op.create_foreign_key(
        "learning_units_area_code_fkey", "learning_units", "areas",
        ["area_code"], ["code"], ondelete="SET NULL",
    )

    # 3. company_area_access
    op.create_table(
        "company_area_access",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("area_code", sa.String(10), nullable=False),
        sa.Column("granted_by_user_id", postgresql.UUID(as_uuid=True)),
        sa.Column("granted_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["area_code"], ["areas.code"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["granted_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.UniqueConstraint("company_id", "area_code", name="uq_company_area"),
    )
    op.create_index(
        "ix_company_area_access_company_id", "company_area_access", ["company_id"]
    )
    op.execute(
        "GRANT SELECT, INSERT, UPDATE, DELETE ON company_area_access TO hg_app, hg_superadmin"
    )


def downgrade() -> None:
    op.drop_table("company_area_access")
    op.drop_constraint("learning_units_area_code_fkey", "learning_units", type_="foreignkey")
    op.drop_index("ix_learning_units_area_code", table_name="learning_units")
    op.drop_column("learning_units", "area_code")
    op.drop_table("areas")
