# Prompt Claude Code · B4-A · Backend Manager + RRHH (enrollments + agregaciones on-demand)

> **Modo recomendado:** `/effort high` con **Claude Opus 4.8**.
> Backend: Enrollment productivo + endpoints manager/team/detail + asignación de path + agregaciones RRHH on-demand. ~4-5h secuencial. 8 TASKs. **Sin Celery beat** — todo on-demand por ahora.

---

## ⚙️ Resume protocol

Si la sesión se compacta o reinicia:

1. Releé este prompt entero (`docs/prompts/claude-code_B4-A_backend_manager_rrhh.md`).
2. Verificá estado:
   ```bash
   git status && git log --oneline -10
   make test-backend 2>&1 | tail -10
   docker compose exec backend uv run alembic current
   ```
3. Releé "## 📌 Estado al iniciar".
4. Buscá TASKs `🟧 IN PROGRESS` y reanudá desde el último criterio sin tildar.

## 🧱 Reglas duras

- **Un commit por TASK** con prefijo `feat(B4-A): ...`. Sub-commits intermedios `wip(B4-A): ...` cada >25 min.
- **Editá ESTE archivo al avanzar** (status + `[x]`).
- **No avances** si la TASK actual no está `✅ DONE`.
- **NO tocar lógica de assessment / scoring** — fuera de scope. Esperamos firma de coaches.
- **NO Celery beat** — todo on-demand en este sprint. Las alertas las calcula el endpoint en cada page load. La task de scheduling se hace junto con Resend en B3-05.
- **`UserLearningProfile.pillar_scores` se queda en draft** — todavía no hay scores. Manager/RRHH muestran *completion rate por pilar*, no *score por pilar*. Cuando llegue el motor B2-02/03 se agrega sin tocar el dashboard.
- **Sin frontend** — este prompt es 100% backend. Frontend lo hace el sprint **B4-B** después.

## 📌 Estado al iniciar

- `main` en `357033a` (merge PR #5 · B2-07 player cerrado).
- Backend prod en `api.humangrowth.io` con migraciones aplicadas: B1-13, B2-01, B2-02. `course_progress` con RLS funcionando en prod.
- Tests: backend **58/58** · frontend 25/25.
- Modelos disponibles:
  - `User` (con `manager_id` FK self-reference + `role` enum + `career_level`)
  - `Organization`
  - `CareerPath` (P1..P6)
  - `Course` (career_path_id + competency_code + career_level + track)
  - `CourseProgress` (productivo, RLS) — fuente de verdad de actividad de usuarios
  - `Enrollment` — **DRAFT, NO existe la tabla aún** → la creamos en este sprint
  - `UserLearningProfile` — sigue DRAFT (espera assessment)
  - `OrgAssessmentAggregate` — en metadata pero NO la tabla. No la crea este sprint tampoco; RRHH on-demand.

## 🧠 Modelo de dominio para B4

```
User (manager) ←── manager_id ── User (reporte)
                                      ↓
                                  Enrollment (user → CareerPath asignado)
                                      ↓
                                  CourseProgress (por curso, RLS por org)
```

- **Enrollment**: 1 usuario puede tener múltiples paths activos (P1, P2, etc.). Asignado manualmente por manager/admin/superadmin.
- **CourseProgress**: fuente de verdad de actividad. Si `last_played_at > now - 30d` → activo. Si `< now - 7d` → inactivo.
- **Completion rate por pilar**: (courses completados del path / total courses activos del path) por user.

---

# TASKS

## TASK B4-A-01 · Productivizar `Enrollment` + extender modelo · `[ ]`

### 1.1 · Sacar `Enrollment` de draft

En `apps/backend/src/hg/modules/learning/models.py`, productivizar `Enrollment` (sacar el `# ⚠️ DRAFT`):

```python
class Enrollment(Base):
    """Usuario inscrito (o asignado) a un CareerPath.

    Permite múltiples enrollments activos por usuario (un usuario puede estar
    siguiendo P1 y P2 simultáneamente). Asignación manual por manager / admin /
    superadmin. Cuando llegue B2-05 (recomendación automática), se inserta
    también con `assigned_by_user_id=NULL` y `source='auto'`.
    """

    __tablename__ = "enrollments"
    __table_args__ = (
        UniqueConstraint("user_id", "career_path_id", name="uq_enrollment_user_path"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    career_path_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("career_paths.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    assigned_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"),
    )
    source: Mapped[str] = mapped_column(String(20), nullable=False, default="manual")
    # 'manual' | 'auto' (futuro: 'recommended')
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    enrolled_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False,
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
```

### 1.2 · Mantener `UserLearningProfile` como draft

Sigue marcado `# ⚠️ DRAFT — depende de assessment B2-02/03`. No se materializa todavía.

### 1.3 · Criterios

- [ ] `Enrollment` sin marca de draft, productivo
- [ ] `UserLearningProfile` sigue draft
- [ ] `mypy` + `ruff` verdes en `learning/`
- [ ] Commit: `feat(B4-A): productivize Enrollment model + active flag + source enum`

---

## TASK B4-A-02 · Migración `B2-03_create_enrollments` · `[ ]`

### 2.1 · Generar y editar

```bash
docker compose exec backend uv run alembic revision -m "B2-03_create_enrollments"
```

Editar a mano:

1. Crear tabla `enrollments` con todos los campos + índices (org_id, user_id, career_path_id, source, is_active, enrolled_at).
2. Unique constraint `(user_id, career_path_id)`.
3. **Habilitar RLS** con política `tenant_isolation` (misma que `course_progress`):
   ```sql
   ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
   ALTER TABLE enrollments FORCE ROW LEVEL SECURITY;
   CREATE POLICY tenant_isolation ON enrollments
     USING (org_id = current_setting('app.current_org_id', true)::uuid)
     WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);
   ```
4. `GRANT SELECT, INSERT, UPDATE, DELETE ON enrollments TO hg_app, hg_superadmin;`
5. **NO crear** `user_learning_profiles` ni `org_assessment_aggregates` — siguen draft / a futuro.

### 2.2 · Aplicar local

```bash
docker compose exec backend uv run alembic upgrade head
# Validar
docker compose exec postgres psql -U hg -d hg_dev -c "\d enrollments"
# Cross-tenant test rápido (cross-org rejection)
```

### 2.3 · Criterios

- [ ] Migración `B2-03_create_enrollments.py` aplicada local
- [ ] RLS + política funcionando
- [ ] `make test-backend` sigue verde sobre 58 tests previos
- [ ] Commit: `feat(B4-A): migration B2-03 — enrollments table with RLS`

---

## TASK B4-A-03 · Schemas Pydantic + servicio de enrollments · `[ ]`

### 3.1 · `apps/backend/src/hg/modules/learning/schemas.py`

Agregar:

```python
class EnrollmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    user_id: UUID
    career_path_id: UUID
    career_path_code: str           # P1..P6 (denormalizado para conveniencia)
    career_path_name: str
    assigned_by_user_id: UUID | None
    assigned_by_name: str | None    # nombre del asignador, NULL si auto
    source: str
    is_active: bool
    enrolled_at: datetime
    completed_at: datetime | None

class EnrollmentIn(BaseModel):
    career_path_code: str           # P1..P6 — más usable que pasar UUID
```

### 3.2 · Crear `apps/backend/src/hg/modules/learning/enrollments_service.py`

Funciones puras (testables sin FastAPI):

```python
def enroll_user_in_path(
    db: Session, *, org_id: UUID, target_user_id: UUID,
    career_path_code: str, assigned_by_user_id: UUID,
) -> Enrollment:
    """Upsert enrollment. Si ya existía inactivo, lo reactiva."""
    ...

def list_user_enrollments(
    db: Session, *, user_id: UUID, active_only: bool = True,
) -> list[Enrollment]: ...

def unenroll_user_from_path(
    db: Session, *, org_id: UUID, target_user_id: UUID, career_path_code: str,
) -> None:
    """Soft delete — set is_active=False."""
    ...
```

### 3.3 · Criterios

- [ ] `EnrollmentOut`, `EnrollmentIn` con `from_attributes`
- [ ] Servicio con 3 funciones puras
- [ ] `mypy` + `ruff` verdes
- [ ] Commit: `feat(B4-A): enrollment schemas + service layer (pure functions)`

---

## TASK B4-A-04 · Endpoint Manager · `GET /manager/me/team` · `[ ]`

### 4.1 · Crear `apps/backend/src/hg/modules/people/router.py`

Router nuevo. Wirearlo en `api/v1/__init__.py` con prefix `/manager` y tag `manager`.

### 4.2 · Endpoint principal

```python
@router.get("/me/team", response_model=TeamResponse)
def list_my_team(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    sort: str = Query("name", regex="^(name|last_active|completion)$"),
    inactive_only: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TeamResponse: ...
```

Devuelve la lista de **reportes directos** del usuario actual (todos los `User` con `manager_id == current_user.id` en su misma org). Para cada uno calcula on-demand:

- `last_active_at`: máximo `course_progress.last_played_at` del reporte.
- `is_inactive`: `last_active_at < now() - 7d` (o NULL = nunca activo).
- `courses_in_progress`: count de `course_progress` con `is_completed=False AND watch_pct > 0`.
- `courses_completed`: count de `course_progress` con `is_completed=True`.
- `total_watch_minutes`: SUM(last_position_seconds) / 60 (aproximación; en B2-08 será preciso).
- `active_enrollments`: count de `enrollments` con `is_active=True`.

Si `inactive_only=true`, filtrar solo los inactivos. Si `sort=last_active`, ordenar por `last_active_at DESC NULLS LAST`. Si `sort=completion`, por `courses_completed DESC`.

**Permisos**: usuario debe tener al menos un reporte directo, o `role IN ('admin', 'superadmin')` (que ven todos los managers de la org).

### 4.3 · Schemas

```python
class TeamMemberOut(BaseModel):
    id: UUID
    full_name: str
    email: str
    role: str
    career_level: str | None
    job_title: str | None
    last_active_at: datetime | None
    is_inactive: bool
    courses_in_progress: int
    courses_completed: int
    total_watch_minutes: int
    active_enrollments: int

class TeamResponse(BaseModel):
    items: list[TeamMemberOut]
    total: int
    inactive_count: int    # útil para badge en la UI
```

### 4.4 · Criterios

- [ ] Endpoint con paginación + filtro `inactive_only` + 3 modos de sort
- [ ] Calcula on-demand desde `course_progress` + `enrollments`
- [ ] RBAC: manager ve solo sus reportes; admin/superadmin ve toda la org
- [ ] OpenAPI tag `manager` con docstring
- [ ] Commit: `feat(B4-A): GET /manager/me/team with on-demand activity aggregations`

---

## TASK B4-A-05 · Endpoints Manager detail + assign path · `[ ]`

### 5.1 · `GET /manager/users/{user_id}/detail`

Devuelve detalle completo de un subordinado del manager actual. Schema:

```python
class TeamMemberDetailOut(TeamMemberOut):
    enrollments: list[EnrollmentOut]
    courses_in_progress_list: list[CourseProgressDetailOut]    # top 10 más recientes
    courses_completed_list: list[CourseProgressDetailOut]      # top 10 más recientes
    pillar_completion_rate: dict[str, float]
    # {"P1": 0.25, "P2": 0.0, ...} — pct de cursos completados del path activo en ese pilar
    # Si no hay enrollment a ese pilar → 0.0
```

Calcular `pillar_completion_rate` así:
- Para cada `CareerPath.code` (P1..P6):
  - Si hay enrollment activo: contar `Course` activos del path + contar `CourseProgress` completados del user en esos courses.
  - Rate = completados / total. Si total=0 → 0.0.
  - Si NO hay enrollment activo a ese pilar → 0.0.

**Permisos**: `user_id` debe ser reporte directo del manager actual, O current_user es admin/superadmin de la misma org.

### 5.2 · `POST /manager/users/{user_id}/enroll`

```python
@router.post("/users/{user_id}/enroll", response_model=EnrollmentOut, status_code=201)
def assign_path_to_user(
    user_id: UUID,
    payload: EnrollmentIn,    # { career_path_code: "P1" }
    db, current_user,
): ...
```

Llama `enroll_user_in_path` del servicio. Mismos permisos que `detail`. 404 si user no encontrado en org. 422 si `career_path_code` no es válido.

### 5.3 · `DELETE /manager/users/{user_id}/enroll/{path_code}`

Soft-delete (set `is_active=False`). Mismos permisos. 204 No Content.

### 5.4 · Criterios

- [ ] 3 endpoints nuevos (detail + enroll + unenroll)
- [ ] `pillar_completion_rate` calculado correcto
- [ ] RBAC validado en cada uno
- [ ] Commit: `feat(B4-A): manager detail + enroll/unenroll endpoints`

---

## TASK B4-A-06 · Endpoints RRHH · agregaciones on-demand · `[ ]`

### 6.1 · `GET /admin/org/metrics`

**Permisos**: `role IN ('admin', 'superadmin')`. Admin ve solo su org (via RLS). Superadmin puede pasar `?org_id=...` para inspeccionar cualquier org.

Calcula on-demand (puede tardar 1-3s en orgs grandes — ok para MVP):

```python
class OrgMetricsOut(BaseModel):
    # Adopción
    total_licenses: int
    active_licenses: int        # users con last_active_at en últimos 30d
    adoption_rate: float        # active / total
    # Engagement
    avg_watch_minutes_per_user: float
    total_courses_completed: int
    completion_rate_global: float    # completados / iniciados
    # Por pilar
    by_pillar: dict[str, PillarMetric]
    # { "P1": {"completion_rate": 0.45, "active_users": 12, "total_courses_started": 30}, ... }
    # Distribución por nivel
    by_career_level: dict[str, int]  # {"L1": 5, "L2": 12, ...}
    # Top performers
    top_performers: list[TopPerformerOut]  # top 5 por courses_completed
    # Inactivos
    inactive_users_count: int    # >7d sin actividad
```

### 6.2 · `GET /admin/org/users/export.csv`

Endpoint que retorna `text/csv` con: email, full_name, role, manager_email, career_level, active_enrollments, courses_in_progress, courses_completed, last_active_at, total_watch_minutes. Para que RRHH pueda meterlo en Excel.

### 6.3 · Criterios

- [ ] 2 endpoints (`/metrics` JSON + `/users/export.csv` CSV)
- [ ] Agregaciones correctas verificadas con datos seed
- [ ] `?org_id=` opcional para superadmin
- [ ] Commit: `feat(B4-A): admin org metrics + CSV export endpoints`

---

## TASK B4-A-07 · Tests backend · `[ ]`

En `apps/backend/tests/`:

### `test_enrollments.py` (6 tests)
- `test_enroll_user_creates_row`
- `test_enroll_user_reactivates_inactive` (si ya existía con is_active=False, lo reactiva sin crear duplicado)
- `test_unenroll_user_soft_deletes`
- `test_enrollment_cross_org_isolation` (RLS)
- `test_enroll_invalid_path_code_422`
- `test_list_user_enrollments_active_only`

### `test_manager_router.py` (8 tests)
- `test_get_team_returns_direct_reports_only`
- `test_get_team_pagination`
- `test_get_team_sort_by_last_active`
- `test_get_team_filter_inactive_only`
- `test_get_team_admin_sees_all_managers_of_org`
- `test_get_team_user_with_no_reports_returns_empty`
- `test_get_user_detail_includes_enrollments_and_progress`
- `test_get_user_detail_not_my_report_404` (no es admin ni manager directo)

### `test_admin_org_metrics.py` (4 tests)
- `test_org_metrics_collaborator_403`
- `test_org_metrics_admin_sees_own_org`
- `test_org_metrics_superadmin_can_pass_org_id`
- `test_org_metrics_csv_export_has_headers`

**Fixtures**: necesitarás un manager con 3 reportes, cada uno con distinto patrón de progreso (1 activo con 5 cursos completados, 1 inactivo, 1 nunca activo). Considerá agregar a `conftest.py` un fixture `manager_with_reports`.

### Criterios

- [ ] 18 tests nuevos, todos verdes
- [ ] `make test-backend` → **76/76** (58 previos + 18 nuevos)
- [ ] Commit: `test(B4-A): enrollments + manager router + org metrics coverage`

---

## TASK B4-A-08 · ADR-0009 + docs + OpenAPI smoke · `[ ]`

### 8.1 · `docs/adrs/ADR-0009-manager-rrhh-on-demand-aggregations.md`

Contexto:
- Manager/RRHH dashboards necesitan métricas de actividad.
- No tenemos pillar_scores aún (assessment pendiente).
- Decidimos calcular **on-demand desde `course_progress`** en cada page load.
- Sin Celery beat por ahora — se suma en B3-05 junto con Resend.

Decisión:
- Métricas de **actividad y completion** vivenen `course_progress` (fuente de verdad).
- Métricas de **scores por pilar** quedan placeholder hasta motor B2-02/03.
- `Enrollment` productivizado: 1 user → N paths activos, asignación manual.
- Pillar completion rate = cursos completados del path / cursos activos del path (no requiere assessment).

Consecuencias:
- ✅ Manager y RRHH demoables HOY con datos reales (cursos), sin esperar assessment.
- ✅ Cuando llegue motor assessment, se suman scores al dashboard sin tocar el resto.
- ⚠️ Performance: agregaciones on-demand pueden tardar 1-3s en orgs >100 usuarios. Aceptable MVP; futuro: cache + Celery beat materializa daily snapshot en `org_assessment_aggregates` (B4-07 reservado para esa optimización).
- ⚠️ Sin beat, no hay alertas push. Manager debe entrar al dashboard a ver inactivos.

### 8.2 · `docs/ARCHITECTURE.md`

Sumar sección "## Manager & RRHH (B4-A)" cubriendo:
- Modelo Enrollment + RLS.
- Endpoints `/manager/me/team`, `/manager/users/{id}/detail`, `/manager/users/{id}/enroll`, `/admin/org/metrics`, `/admin/org/users/export.csv`.
- Cálculo on-demand de actividad / completion rate.
- Decisión "sin beat" + cuándo se agrega.

### 8.3 · OpenAPI smoke

```bash
docker compose exec backend curl http://localhost:8000/openapi.json | jq '.paths | keys[]' | grep -E "manager|admin/org"
```

Deberían aparecer los 5 endpoints nuevos.

### 8.4 · Criterios

- [ ] ADR-0009 creado y referenciado en ARCHITECTURE
- [ ] ARCHITECTURE.md actualizado con sección B4-A
- [ ] OpenAPI muestra los 5 endpoints
- [ ] Commit: `docs(B4-A): ADR-0009 + ARCHITECTURE update`

---

# 🎯 Criterios globales "hecho"

- [ ] 8 TASKs commiteadas individualmente.
- [ ] Migración `B2-03_create_enrollments` aplicada local + reproducible.
- [ ] 5 endpoints nuevos en OpenAPI con tag `manager` y `admin`.
- [ ] Tests: `make test-backend` 76/76.
- [ ] ADR-0009 + ARCHITECTURE actualizados.
- [ ] Backend deployable a Railway sin breaking change para frontend existente.

# 📤 Entrega

- SHA del último commit
- Output `alembic current`
- Output `curl http://localhost:8000/openapi.json | jq '.paths | keys[]' | grep -E "manager|admin/org"`
- Output de un ejemplo curl `GET /manager/me/team` con usuario seed
- URL del PR contra `main`
- Lista de desviaciones del plan (si las hubo)

# Status por TASK (editar al avanzar)

| ID | Subject | Status |
|---|---|---|
| B4-A-01 | Productivizar `Enrollment` | `[x] DONE` |
| B4-A-02 | Migración B2-03 enrollments + RLS | `[x] DONE` |
| B4-A-03 | Schemas + servicio enrollments | `[x] DONE` |
| B4-A-04 | GET /manager/me/team (agregaciones on-demand) | `[x] DONE` |
| B4-A-05 | Manager detail + enroll/unenroll | `[x] DONE` |
| B4-A-06 | RRHH /admin/org/metrics + CSV export | `[x] DONE` |
| B4-A-07 | Tests backend (18 nuevos) | `[x] DONE` |
| B4-A-08 | ADR-0009 + docs | `[x] DONE` |
