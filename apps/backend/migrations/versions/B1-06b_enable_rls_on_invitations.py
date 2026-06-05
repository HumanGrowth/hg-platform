"""B1-06b enable rls on invitations

Revision ID: 675a9148a27d
Revises: 2d69913d0dee
Create Date: 2026-06-05 12:10:08.042924

Habilita RLS sobre ``invitations`` (lleva ``org_id``), con la misma
política ``tenant_isolation`` que el resto de la Capa 1: filtra por
``app.current_org_id`` y usa ``NULLIF(..., '')`` para que un contexto
ausente/vacío devuelva 0 filas sin error de casteo de uuid.

También otorga DML explícito al rol de aplicación ``hg_app`` (las
políticas se aplican bajo ese rol; ver ADR-0001 / B1-04).
"""
from __future__ import annotations

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = '675a9148a27d'
down_revision: str | None = '2d69913d0dee'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # hg_superadmin tiene BYPASSRLS pero NO tenía privilegios de tabla (B1-04
    # sólo concedió a hg_app). BYPASSRLS salta las políticas, no concede DML.
    # Los flujos sin sesión/cross-tenant corren bajo este rol (SET LOCAL ROLE
    # hg_superadmin), así que necesita DML sobre todo el schema (tablas
    # actuales + futuras).
    op.execute("GRANT USAGE ON SCHEMA public TO hg_superadmin;")
    op.execute(
        "GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO hg_superadmin;"
    )
    op.execute(
        "ALTER DEFAULT PRIVILEGES IN SCHEMA public "
        "GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO hg_superadmin;"
    )

    op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON invitations TO hg_app;")
    op.execute("ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;")
    op.execute("ALTER TABLE invitations FORCE ROW LEVEL SECURITY;")
    op.execute(
        """
        CREATE POLICY tenant_isolation ON invitations
        USING (
            org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
        )
        WITH CHECK (
            org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
        );
        """
    )


def downgrade() -> None:
    op.execute("DROP POLICY IF EXISTS tenant_isolation ON invitations;")
    op.execute("ALTER TABLE invitations DISABLE ROW LEVEL SECURITY;")
    op.execute("REVOKE ALL ON invitations FROM hg_app;")
    op.execute(
        "ALTER DEFAULT PRIVILEGES IN SCHEMA public "
        "REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLES FROM hg_superadmin;"
    )
    op.execute("REVOKE ALL ON ALL TABLES IN SCHEMA public FROM hg_superadmin;")
    op.execute("REVOKE USAGE ON SCHEMA public FROM hg_superadmin;")
