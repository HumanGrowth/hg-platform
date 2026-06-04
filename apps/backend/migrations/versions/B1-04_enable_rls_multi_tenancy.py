"""B1-04 enable rls multi-tenancy

Revision ID: 47a23555889a
Revises: f336fec67864
Create Date: 2026-06-04 15:57:25.957831

Habilita Row Level Security (RLS) sobre las tablas con ``org_id`` de la
Capa 1 (``users``, ``user_sessions``). Cada conexión de aplicación debe
fijar ``app.current_org_id`` (vía ``SET LOCAL`` / ``set_config``) dentro
de la transacción; las políticas ``tenant_isolation`` filtran por ese
valor. El rol ``hg_superadmin`` (BYPASSRLS) queda disponible para
workers / operaciones internas que necesiten cruzar tenants.

``organizations`` no lleva RLS: es la tabla raíz de tenant (no tiene
``org_id``) y se gobierna a nivel de aplicación / rol superadmin.

Importante — rol de aplicación (``hg_app``):
    En PostgreSQL, los superusuarios (y los roles BYPASSRLS) IGNORAN las
    políticas RLS incluso con FORCE. El rol por defecto del contenedor
    (``hg``) es superusuario, por lo que la app NO quedaría protegida si
    conectara como ``hg``. Por eso se crea ``hg_app`` (NOSUPERUSER,
    NOBYPASSRLS): es el rol bajo el cual la aplicación debe operar para
    que el aislamiento por tenant tenga efecto. Ver ADR-0001.
"""
from __future__ import annotations

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = '47a23555889a'
down_revision: str | None = 'f336fec67864'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# Tablas de Capa 1 con datos de usuario (llevan org_id) -> requieren RLS.
RLS_TABLES = ["users", "user_sessions"]


def upgrade() -> None:
    # 1. Rol bypass para operaciones HG internas (workers, admin, migraciones).
    op.execute(
        "DO $$ BEGIN "
        "IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'hg_superadmin') "
        "THEN CREATE ROLE hg_superadmin BYPASSRLS; END IF; END $$;"
    )

    # 2. Rol de aplicación sujeto a RLS (NOSUPERUSER, NOBYPASSRLS).
    #    La app / los workers que sí deben respetar el tenant operan como
    #    este rol (SET ROLE hg_app) para que las políticas se apliquen.
    op.execute(
        "DO $$ BEGIN "
        "IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'hg_app') "
        "THEN CREATE ROLE hg_app NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE; END IF; "
        "END $$;"
    )
    op.execute("GRANT USAGE ON SCHEMA public TO hg_app;")
    op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO hg_app;")
    op.execute(
        "ALTER DEFAULT PRIVILEGES IN SCHEMA public "
        "GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO hg_app;"
    )

    # 3. Habilitar + forzar RLS y crear la política de aislamiento por tenant.
    for table in RLS_TABLES:
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;")
        op.execute(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY;")
        # NULLIF(..., '') hace la política robusta cuando el contexto está
        # ausente o vacío: current_setting(...) devuelve '' (no NULL) una vez
        # que el GUC fue tocado/reseteado en la sesión, y ''::uuid lanzaría
        # error. Con NULLIF, '' -> NULL -> la comparación es NULL (falsa) ->
        # 0 filas SIN error. Un uuid válido pasa intacto.
        op.execute(
            f"""
            CREATE POLICY tenant_isolation ON {table}
            USING (
                org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
            )
            WITH CHECK (
                org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
            );
            """
        )


def downgrade() -> None:
    for table in RLS_TABLES:
        op.execute(f"DROP POLICY IF EXISTS tenant_isolation ON {table};")
        op.execute(f"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY;")
    op.execute(
        "ALTER DEFAULT PRIVILEGES IN SCHEMA public "
        "REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLES FROM hg_app;"
    )
    op.execute("REVOKE ALL ON ALL TABLES IN SCHEMA public FROM hg_app;")
    op.execute("REVOKE USAGE ON SCHEMA public FROM hg_app;")
    op.execute("DROP ROLE IF EXISTS hg_app;")
    op.execute("DROP ROLE IF EXISTS hg_superadmin;")
