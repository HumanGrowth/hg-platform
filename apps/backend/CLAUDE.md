# CLAUDE.md — apps/backend

Complementa el `CLAUDE.md` raíz (invariantes, dirección V2 y reglas de AI viven allá).

## Stack

Python 3.12 · FastAPI · SQLAlchemy 2 (sync, psycopg3) · Pydantic v2 + pydantic-settings · Alembic ·
Celery + Redis · structlog · Sentry. Dependencias con `uv` (`uv sync`, `uv run …`).

## Estructura de un módulo

`src/hg/modules/<módulo>/` con `models.py`, `schemas.py`, `router.py` (o `*_router.py` por
audiencia: `admin_router`, `tips_router`…), `service.py` (lógica; los routers quedan finos) y
`tasks.py` si tiene trabajo en Celery. Todo router se registra en `src/hg/api/v1/__init__.py`.
Un módulo no importa internals de otro módulo sin necesidad: preferir su `service`.

## Sesiones, roles y tenancy

- Endpoint autenticado del tenant: `Depends(get_current_user)` (en `core/auth_middleware.py`). Baja
  a `hg_app` y fija `app.current_org_id` antes del primer SELECT → RLS activo.
- Endpoint sin sesión o cross-tenant: `Depends(get_db_as_superadmin)` + `require_role(...)` +
  chequeo explícito de org. Un admin nunca puede operar sobre otra org por pasar `?org_id=`.
- Roles de aplicación (`UserRole`): `superadmin`, `company_admin` (RRHH de toda la Empresa),
  `admin`, `manager`, `collaborator`.
- **`db.flush()`, nunca `db.commit()` dentro del handler** (ver invariante 2 del raíz).
- Contexto con `hg.core.tenancy.set_org_context`; no escribir `SET LOCAL` a mano.

## Tablas nuevas — checklist

1. ¿Tiene datos de un usuario u org? ⇒ columna `org_id NOT NULL` (FK `organizations`), índice,
   `ENABLE` + `FORCE ROW LEVEL SECURITY`, política `tenant_isolation` (USING + WITH CHECK) y grants a
   `hg_app` / `hg_superadmin`, **en la misma migración**.
2. Catálogo global (contenido, instrumentos): sin RLS, documentarlo en el docstring del modelo.
3. Enums: `class X(str, enum.Enum)` (no `StrEnum`, ignore `UP042` deliberado en `pyproject.toml`).
4. PK UUID (`uuid.uuid4`), `created_at`/`updated_at` con `server_default=func.now()`.

## Migraciones

- Archivo en `migrations/versions/` con prefijo del bloque (`CE-12_…`, `LU-05_…`, `PF-03_…`).
- `make makemigration m="…"` genera; **revisar siempre el autogenerate** (no detecta políticas RLS,
  grants ni cambios de enum correctamente).
- `upgrade` y `downgrade` completos. Nunca editar una migración ya mergeada.
- Cambios destructivos (drop/rename de columnas con datos): proponer primero, con plan de backfill y
  snapshot previo.

## Configuración y flags

Todo en `src/hg/config.py` (`Settings`, `get_settings()`); nunca `os.environ` suelto. Flags booleanos
con default `False` para features no validadas (`emails_enabled`, `ai_recommendations_enabled`).
Features de AI: `ai_<feature>_enabled` y el cliente de LLM único en `modules/ai/` (ver raíz §7).

## Servicios existentes — reusar, no reinventar

- Archivos a R2: `core/storage.py` (`upload_file`, `upload_bytes`, `r2_configured`).
- Email: `modules/notifications/email_service.py` + `templates/`. `invitation.html` es copia fiel de
  `HG/Design/Invitacion Beta.html`: cambiar ambos o ninguno.
- Agregaciones de manager/RRHH: on-demand en `modules/people/service.py` (ADR-0009). Si una consulta
  escala mal, proponer snapshot materializado, no cache en memoria.
- Scoring de assessment: `modules/assessment/scorers/` con registry por pilar (ADR-0012). Umbrales
  vienen del documento firmado por coaches: no se ajustan sin aprobación.
- Logging: `structlog` con eventos nombrados (`email.sent`, `email.failed`); sin PII en logs.

## Tests

- `pytest` contra Postgres + Redis reales (docker compose o servicios del CI). Fixtures en
  `tests/conftest.py`: `db` (rollback por test), `factory`, `auth_headers`, `manager_with_reports`.
- El fixture `db` conecta como superuser y **bypassa RLS**. Todo endpoint o query nueva sobre una
  tabla con RLS necesita al menos un test con `SET LOCAL ROLE hg_app` (patrón en `tests/test_rls.py`)
  que pruebe aislamiento entre orgs.
- Tests de AI: cliente de LLM mockeado; nada de llamadas de red en tests.

## Lint y tipos

`uv run ruff check src tests` y `uv run mypy src` (plugin pydantic). Los ignores de ruff están
comentados con su razón en `pyproject.toml`; no agregar ignores nuevos sin explicar por qué.
