"""CE-11 Rutas de cursos customizables por Empresa/Organización (FASE 2.2)

- ``custom_paths`` / ``custom_path_items``: catálogo de la Capa Empresa SIN RLS
  (mismo criterio que ``company_area_access`` / ``areas``) — ``scope=company``
  tiene ``org_id`` NULL (no puede vivir bajo una policy `tenant_isolation`
  keyed por org). La frontera de Empresa la impone la app
  (`get_db_as_superadmin` + filtro `company_id`, ver `paths/router.py`).
- ``custom_path_assignments``: SÍ por-usuario/por-org, RLS `tenant_isolation`
  (mismo patrón que `module_assignments`) — el 3er mecanismo de targeting
  ("miembros puntuales").

Revision ID: ce11custompath1
Revises: ce10mgrfdbk01
Create Date: 2026-09-11 00:00:00.000000
"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "ce11custompath1"
down_revision: str | None = "ce10mgrfdbk01"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "custom_paths",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("description", sa.String(2000), nullable=True),
        sa.Column("scope", sa.Enum("company", "org", name="custom_path_scope"), nullable=False),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("org_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True),
            server_default=sa.func.now(), onupdate=sa.func.now(),
        ),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.CheckConstraint(
            "(scope = 'company' AND org_id IS NULL) OR (scope = 'org' AND org_id IS NOT NULL)",
            name="ck_custom_path_scope_org",
        ),
    )
    op.create_index("ix_custom_paths_company_id", "custom_paths", ["company_id"])
    op.create_index("ix_custom_paths_org_id", "custom_paths", ["org_id"])

    op.create_table(
        "custom_path_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("custom_path_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("learning_unit_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("order_index", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_required", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.ForeignKeyConstraint(["custom_path_id"], ["custom_paths.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["learning_unit_id"], ["learning_units.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("custom_path_id", "learning_unit_id", name="uq_custom_path_item"),
    )
    op.create_index("ix_custom_path_items_custom_path_id", "custom_path_items", ["custom_path_id"])
    op.create_index("ix_custom_path_items_learning_unit_id", "custom_path_items", ["learning_unit_id"])

    op.create_table(
        "custom_path_assignments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("org_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("custom_path_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("assigned_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("assigned_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["custom_path_id"], ["custom_paths.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["assigned_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.UniqueConstraint("custom_path_id", "user_id", name="uq_custom_path_assignment"),
    )
    op.create_index("ix_custom_path_assignments_org_id", "custom_path_assignments", ["org_id"])
    op.create_index(
        "ix_custom_path_assignments_custom_path_id", "custom_path_assignments", ["custom_path_id"]
    )
    op.create_index("ix_custom_path_assignments_user_id", "custom_path_assignments", ["user_id"])
    op.execute("ALTER TABLE custom_path_assignments ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE custom_path_assignments FORCE ROW LEVEL SECURITY")
    op.execute(
        "CREATE POLICY tenant_isolation ON custom_path_assignments "
        "USING (org_id = current_setting('app.current_org_id', true)::uuid) "
        "WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid)"
    )

    op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON custom_paths TO hg_superadmin")
    op.execute("GRANT SELECT ON custom_paths TO hg_app")
    op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON custom_path_items TO hg_superadmin")
    op.execute("GRANT SELECT ON custom_path_items TO hg_app")
    op.execute(
        "GRANT SELECT, INSERT, UPDATE, DELETE ON custom_path_assignments TO hg_app, hg_superadmin"
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS custom_path_assignments CASCADE")
    op.execute("DROP TABLE IF EXISTS custom_path_items CASCADE")
    op.execute("DROP TABLE IF EXISTS custom_paths CASCADE")
    op.execute("DROP TYPE IF EXISTS custom_path_scope")
