# Prompt para Claude Code · DEV-03 + DEV-04 (cerrar brechas Capa 1 + RLS)

Copiar todo lo que está debajo de la línea y pegar en Claude Code parado en la raíz del repo (`hg-platform/`).

---

# Contexto

Estás trabajando en el monorepo `hg-platform/` (FastAPI + Next.js + Postgres + Redis). El stack ya corre con `docker compose up`. Hay modelos SQLAlchemy en `apps/backend/src/hg/modules/{identity,people,learning,ai,analytics}/models.py` pero el modelo **identity** está incompleto contra el documento maestro (`HG/Artifacts/HG_Technical_Planning_v1.docx`, sección 3) y **no existe ninguna migración Alembic** ni RLS multi-tenancy.

Tu trabajo es cerrar dos tareas del Kanban: **DEV-03 (esquema Capa 1)** y **DEV-04 (Row Level Security)**. No toques las otras capas (learning, assessments, ai, analytics) más allá de dejarlas marcadas como borrador.

# Reglas del proyecto (no negociables)

1. Multi-tenancy: toda tabla con datos de usuario lleva `org_id NOT NULL` + RLS.
2. Append-only para eventos (no aplica hoy).
3. Una migración Alembic por entregable; nunca editar revisiones ya generadas.
4. Tests con `pytest-asyncio`; cada cambio de schema debe tener un test.
5. Stack: SQLAlchemy 2.0 declarativo, Pydantic v2, `psycopg3`, Postgres 16.
6. Convenciones de commits: Conventional Commits, prefijo con ID de Kanban (ej. `feat(B1-03): ...`).

# Tareas

## TASK 1 · Corregir y completar `identity/models.py`

Archivo: `apps/backend/src/hg/modules/identity/models.py`.

Cambios requeridos:

1. **Enum `UserRole`** — reemplazar valores actuales por exactamente estos cuatro (en este orden y con estos strings):
   - `super_admin = "super_admin"` → quitar y reemplazar por:
     ```python
     class UserRole(str, enum.Enum):
         superadmin = "superadmin"
         admin = "admin"
         manager = "manager"
         collaborator = "collaborator"
     ```

2. **Agregar enum `OrgTier`** con valores `A`, `B`, `C`.

3. **Agregar enum `CareerLevel`** con valores `L1`, `L2`, `L3`, `L4a`, `L4b`.

4. **`Organization`** — agregar columnas faltantes:
   - `tier: Mapped[OrgTier]` (NOT NULL, default `OrgTier.C`)
   - `country: Mapped[str | None]` (String(2), ISO 3166-1 alpha-2)
   - `billing_status: Mapped[str]` (String(50), default `"trial"`)
   - `billing_cycle: Mapped[str | None]` (String(20), valores típicos: `monthly`, `annual`)
   - `contract_start: Mapped[date | None]`
   - `contract_end: Mapped[date | None]`
   - `licenses_total: Mapped[int]` (Integer, default 0, NOT NULL)
   - `licenses_used: Mapped[int]` (Integer, default 0, NOT NULL)
   - `settings: Mapped[dict]` (JSONB, default `dict`, NOT NULL)
   - Mantener `logo_url` y `primary_color` (ya existen).

5. **`User`** — modificar:
   - Agregar `career_level: Mapped[CareerLevel | None]` (puede ser NULL hasta onboarding).
   - Agregar `job_title: Mapped[str | None]` (String(255)).
   - Agregar `department: Mapped[str | None]` (String(255)).
   - Agregar `hire_date: Mapped[date | None]`.
   - Agregar `last_active_at: Mapped[datetime | None]` (separado de `last_login_at` que ya existe).
   - **Cambiar `email`**: quitar `unique=True` global y agregar `UniqueConstraint("org_id", "email", name="uq_users_org_email")` en `__table_args__`. El mismo email puede existir en orgs distintas.
   - Mantener `hashed_password`, `manager_id`, `is_active`, timestamps.

6. **Nueva tabla `UserSession`** en el mismo archivo:
   ```python
   class UserSession(Base):
       __tablename__ = "user_sessions"

       id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
       user_id: Mapped[uuid.UUID] = mapped_column(
           UUID(as_uuid=True),
           ForeignKey("users.id", ondelete="CASCADE"),
           nullable=False,
           index=True,
       )
       org_id: Mapped[uuid.UUID] = mapped_column(
           UUID(as_uuid=True),
           ForeignKey("organizations.id", ondelete="CASCADE"),
           nullable=False,
           index=True,
       )
       refresh_token_hash: Mapped[str] = mapped_column(String(255), nullable=False, index=True, unique=True)
       device_info: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
       ip_address: Mapped[str | None] = mapped_column(String(45))  # IPv6 max
       expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
       revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
       created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
   ```

Imports necesarios: `date` de `datetime`, `JSONB` de `sqlalchemy.dialects.postgresql`, `UniqueConstraint` de `sqlalchemy`.

## TASK 2 · Generar y aplicar la primera migración

1. Verificar que `apps/backend/migrations/env.py` importa `hg.modules.identity.models` (ya lo hace).
2. Generar migración:
   ```bash
   docker compose exec backend uv run alembic revision --autogenerate -m "B1-03 layer1 identity"
   ```
3. **Revisar** el archivo generado en `apps/backend/migrations/versions/`. Verificar:
   - Crea los 3 enums (`user_role`, `org_tier`, `career_level`)
   - Crea las 3 tablas en orden correcto (`organizations` → `users` → `user_sessions`)
   - Tiene la unique constraint `uq_users_org_email`
   - Tiene los índices listados (en `users.org_id`, `user_sessions.user_id`, etc.)
4. Aplicar: `make migrate` (o `docker compose exec backend uv run alembic upgrade head`).
5. Verificar tablas en DB: `make db-shell` → `\dt` debe mostrar `organizations`, `users`, `user_sessions`, `alembic_version` y las tablas de las otras capas (porque env.py las importa todas — eso es esperado y está bien).

⚠️ **Si autogenerate intenta dropear o renombrar enums/columnas existentes** (porque `UserRole` cambió), revisa el diff manualmente y edita la migración para que sea aditiva-segura: en este punto la DB está vacía, así que un drop está bien, pero documéntalo en el docstring de la migración.

## TASK 3 · RLS multi-tenancy (DEV-04)

1. **Migración nueva**:
   ```bash
   docker compose exec backend uv run alembic revision -m "B1-04 enable rls multi-tenancy"
   ```
   Editar el `upgrade()` para que ejecute SQL crudo:
   ```python
   def upgrade() -> None:
       # 1. Crear rol bypass para operaciones HG internas (workers, admin)
       op.execute("DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'hg_superadmin') THEN CREATE ROLE hg_superadmin BYPASSRLS; END IF; END $$;")

       # 2. Habilitar RLS en tablas con org_id
       for table in ["users", "user_sessions"]:
           op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;")
           op.execute(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY;")
           op.execute(
               f"""
               CREATE POLICY tenant_isolation ON {table}
               USING (org_id = current_setting('app.current_org_id', true)::uuid)
               WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);
               """
           )

   def downgrade() -> None:
       for table in ["users", "user_sessions"]:
           op.execute(f"DROP POLICY IF EXISTS tenant_isolation ON {table};")
           op.execute(f"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY;")
       op.execute("DROP ROLE IF EXISTS hg_superadmin;")
   ```

2. **Crear middleware** `apps/backend/src/hg/core/tenancy.py`:
   ```python
   """Tenancy context: sets app.current_org_id per request for RLS."""
   from __future__ import annotations

   from contextvars import ContextVar
   from uuid import UUID

   from sqlalchemy import text
   from sqlalchemy.orm import Session

   current_org_id: ContextVar[UUID | None] = ContextVar("current_org_id", default=None)


   def set_org_context(db: Session, org_id: UUID) -> None:
       """Set the Postgres session variable that RLS policies read.

       Use SET LOCAL inside a transaction so it auto-clears at commit/rollback.
       """
       db.execute(text("SELECT set_config('app.current_org_id', :v, true)"), {"v": str(org_id)})
       current_org_id.set(org_id)


   def clear_org_context(db: Session) -> None:
       db.execute(text("SELECT set_config('app.current_org_id', '', true)"))
       current_org_id.set(None)
   ```

3. **Modificar `get_db`** en `apps/backend/src/hg/db.py` para que sea async-friendly y emita un BEGIN explícito (las políticas RLS y `SET LOCAL` requieren estar dentro de una transacción). Mínimo:
   ```python
   def get_db():
       db = SessionLocal()
       try:
           db.begin()  # asegura transacción abierta para SET LOCAL
           yield db
           db.commit()
       except Exception:
           db.rollback()
           raise
       finally:
           db.close()
   ```

4. **(Opcional para hoy, mañana se completa con auth)** Stub de dependency `apps/backend/src/hg/core/deps.py`:
   ```python
   from fastapi import Header, HTTPException, status
   from uuid import UUID

   def require_org_id(x_org_id: str | None = Header(default=None)) -> UUID:
       """Provisional: lee X-Org-Id del header. Mañana viene del JWT."""
       if not x_org_id:
           raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="X-Org-Id required")
       try:
           return UUID(x_org_id)
       except ValueError:
           raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid org id")
   ```

## TASK 4 · Tests

Crear `apps/backend/tests/test_identity_models.py`:

- Test que inserta una `Organization`, un `User` con `org_id` válido, y una `UserSession`, y los lee de vuelta.
- Test que verifica la unique constraint: insertar dos `User` con el mismo email pero distinto `org_id` funciona; con el mismo `org_id` falla.

Crear `apps/backend/tests/test_rls.py`:

- Crea dos orgs (A y B) con un user cada una (vía conexión `hg_superadmin` o con `SET LOCAL` por org).
- Con `SET LOCAL app.current_org_id = '<org A>'`, query `SELECT count(*) FROM users` debe retornar **solo 1** (el de A).
- Cambia a org B, debe retornar **solo 1** (el de B).
- Sin `current_org_id` seteado, debe retornar 0 (no error).

Estos tests requieren `conftest.py` con fixture de DB transaccional rollback-per-test. Usá la conexión normal de Postgres (no `hg_superadmin`) para los tests de tenancy; para el bootstrap de fixtures, usá un conexión con `BYPASSRLS` o ejecutá los inserts con `SET LOCAL` apropiado.

Correr: `make test-backend`. Todos los tests verdes.

## TASK 5 · Documentación

1. Crear `apps/backend/../../docs/adrs/ADR-0001-uuid-and-rls.md`:
   - Estado: aceptado · fecha de hoy
   - Decisión: UUID v4 generado en aplicación + RLS desde día 1
   - Alternativas consideradas: serial bigint (descartado por enumerable), pgcrypto `gen_random_uuid()` server-side (descartado por velocidad y debug)
   - Consecuencias: cada session FastAPI debe hacer `SET LOCAL app.current_org_id`; workers Celery deben usar `set_org_context()` explícitamente

2. Actualizar `docs/ARCHITECTURE.md` agregando una sección "Capa 1 — Identity (DEV-03/04)" con la lista de tablas, enums y políticas RLS implementadas.

## TASK 6 · Marcar borradores extras

En cada uno de `learning/models.py`, `people/models.py`, `ai/models.py`, `analytics/models.py`, agregar al inicio del archivo:

```python
"""[NOMBRE] models.

⚠️ DRAFT — generado adelantando trabajo. Depende de:
  - DEC-01 (algoritmo de scoring)
  - DEC-02 (reglas de recomendación de path)
  - DEC-05 (contenido de escenarios situacionales)
  - DEC-07 (criterio de pilar completado)

Revisar y firmar contra el doc final de decisiones antes de generar la
migración productiva. Hoy se incluyen en metadata para que Alembic los
detecte, pero NO deberían ejecutarse cambios destructivos hasta validar.
"""
```

# Criterios de "hecho" (verificá uno por uno antes de cerrar)

- [ ] `apps/backend/migrations/versions/` tiene exactamente 2 archivos nuevos: `B1-03_layer1_identity.py` y `B1-04_enable_rls_multi_tenancy.py`
- [ ] `make migrate` corre limpio sin warnings de drift
- [ ] `\dt` en `make db-shell` muestra `organizations`, `users`, `user_sessions`
- [ ] `\d users` muestra columnas `career_level`, `job_title`, `hire_date`, `last_active_at` y constraint `uq_users_org_email`
- [ ] `\d organizations` muestra `tier`, `billing_status`, `licenses_total`, `licenses_used`, `settings`
- [ ] `SELECT rolname, rolbypassrls FROM pg_roles WHERE rolname = 'hg_superadmin';` retorna fila con `rolbypassrls = t`
- [ ] `SELECT * FROM pg_policies WHERE tablename IN ('users','user_sessions');` retorna 2 filas
- [ ] `make test-backend` pasa todos los tests, incluyendo `test_rls.py`
- [ ] `make lint-backend` pasa sin errores
- [ ] Existen `docs/adrs/ADR-0001-uuid-and-rls.md` y la sección nueva en `ARCHITECTURE.md`
- [ ] Los 4 modelos extras (learning, people, ai, analytics) tienen el docstring de `DRAFT` con las DECs listadas

# Entrega

Cuando termines, hacé 2 commits separados (más limpio para review):

```bash
git add apps/backend/src/hg/modules/identity apps/backend/migrations/versions/*B1-03* apps/backend/tests/test_identity_models.py
git commit -m "feat(B1-03): complete identity schema layer 1 (Organization, User, UserSession)"

git add apps/backend/migrations/versions/*B1-04* apps/backend/src/hg/core/tenancy.py apps/backend/src/hg/core/deps.py apps/backend/src/hg/db.py apps/backend/tests/test_rls.py docs/
git commit -m "feat(B1-04): enable row-level security multi-tenancy + tenancy middleware"
```

Reportá al final:
- Archivos creados/modificados (con paths absolutos)
- Output de `make test-backend` (resumen)
- Output de `\dt` y `SELECT * FROM pg_policies WHERE tablename IN ('users','user_sessions');`
- Cualquier desviación del plan y por qué la tomaste
