# Prompt Claude Code · B2-07 · Player de video HLS + tracking de progreso

> **Modo recomendado:** `/effort high` con **Claude Opus 4.8**.
> Player HLS.js + page `/library/[slug]` + CourseProgress productivo + endpoint upsert con tracking. ~4-6h secuencial. 8 TASKs.

---

## ⚙️ Resume protocol

Si la sesión se compacta o reinicia:

1. Releé este prompt entero (`docs/prompts/claude-code_B2-07_video_player_hls.md`).
2. Verificá estado:
   ```bash
   git status && git log --oneline -10
   make test-backend 2>&1 | tail -10
   cd apps/frontend && pnpm typecheck 2>&1 | tail -10
   docker compose exec backend uv run alembic current
   ```
3. Releé "## 📌 Estado al iniciar".
4. Buscá TASKs `🟧 IN PROGRESS` y reanudá desde el último criterio sin tildar.

## 🧱 Reglas duras

- **Un commit por TASK** con prefijo `feat(B2-07): ...`. Sub-commits intermedios `wip(B2-07): ...` cada >25 min.
- **Editá ESTE archivo al avanzar** (status + `[x]`).
- **No avances** si la TASK actual no está `✅ DONE`.
- **NO tocar lógica de assessment / scoring** — fuera de scope. Sigue esperando firma de coaches.
- **NO modificar el catálogo** (`career_paths`, `courses`) — solo agregar la tabla `course_progress` y consumir el catálogo.
- **Enrollment queda DRAFT** — el MVP no necesita enrollment formal; arranca el progreso al primer play.
- **HLS.js** (NO Video.js, NO Plyr.io). Player custom con controles propios que combinen con el DS (botones primitives + iconos lucide).
- **Catálogo público a usuarios autenticados** — endpoint detalle es GET con auth pero sin RLS (cursos globales). `course_progress` SÍ es por usuario × org → RLS estándar.

## 📌 Estado al iniciar

- `main` con PR #4 mergeado. Backend prod en `api.humangrowth.io` (B1-13 + B2-01 aplicadas en Neon + catálogo seedeado vía FU-06).
- Frontend prod en `app.humangrowth.io` con `/library` y `/path` consumiendo `/api/v1/paths` y `/api/v1/courses`.
- R2 + CDN: 3 cursos L1 con HLS reproducible (`https://cdn.humangrowth.io/videos/L1/C1/.../master.m3u8`).
- Modelos `Enrollment`, `CourseProgress`, `UserLearningProfile` siguen en draft. Este prompt **sólo productiviza `CourseProgress`**.
- Tests: backend 48/48 · frontend 16/16.
- Catálogo en DB: 6 `career_paths` (P1..P6) · 3 `courses` (L1 × C1=2, C2=1) con `hls_master_url` real.

---

# TASKS

## TASK B2-07-01 · Productivizar `CourseProgress` + agregar endpoint detalle de curso · `[ ]`

### 1.1 · Sacar `CourseProgress` de draft

En `apps/backend/src/hg/modules/learning/models.py`, dejar `Enrollment` y `UserLearningProfile` como están (`⚠️ DRAFT — B2-08`) pero **productivizar `CourseProgress`**:

```python
class CourseProgress(Base):
    """Progreso de visualización de un usuario en un curso.

    Un row por (user_id, course_id). Se inserta al primer play y se actualiza
    en cada heartbeat. `is_completed=True` cuando `watch_pct >= 80` (umbral fijo
    del MVP — revisable cuando los coaches firmen criterios pedagógicos).
    """

    __tablename__ = "course_progress"
    __table_args__ = (
        UniqueConstraint("user_id", "course_id", name="uq_progress_user_course"),
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
    course_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("courses.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    last_position_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    watch_pct: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    is_completed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    first_played_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False,
    )
    last_played_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(),
        onupdate=func.now(), nullable=False,
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
```

### 1.2 · Schemas Pydantic

En `apps/backend/src/hg/modules/learning/schemas.py`:

```python
class CourseProgressOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    last_position_seconds: int
    watch_pct: float
    is_completed: bool
    completed_at: datetime | None

class CourseDetailOut(CourseOut):
    """Curso + progreso del usuario actual (None si nunca lo abrió)."""
    progress: CourseProgressOut | None = None

class CourseProgressIn(BaseModel):
    position_seconds: int = Field(ge=0)
    watch_pct: float = Field(ge=0.0, le=100.0)
```

### 1.3 · Endpoints en `learning/router.py`

```python
@router.get("/courses/{slug}", response_model=CourseDetailOut)
def get_course_detail(slug: str, db, current_user) -> CourseDetailOut: ...

@router.post("/courses/{slug}/progress", status_code=200, response_model=CourseProgressOut)
def upsert_progress(slug: str, payload: CourseProgressIn, db, current_user) -> CourseProgressOut: ...
```

Lógica del `POST`:

- Si no existe row para `(user_id, course_id)`, crear.
- Actualizar `last_position_seconds`, `watch_pct`, `last_played_at=now()`.
- Si `watch_pct >= 80` y `is_completed=False` → set `is_completed=True`, `completed_at=now()`.
- Si ya estaba `is_completed=True`, NO tocar `completed_at` (preservar primera completion).
- 404 si el slug no existe o `is_active=False`.

### 1.4 · Criterios

- [ ] `CourseProgress` sin docstring draft, productivo
- [ ] Schemas `CourseDetailOut`, `CourseProgressOut`, `CourseProgressIn`
- [ ] 2 endpoints nuevos en `/api/v1/courses/{slug}` y `/api/v1/courses/{slug}/progress`
- [ ] `mypy` + `ruff` verdes en `learning/`
- [ ] Commit: `feat(B2-07): productivize CourseProgress + course detail and upsert endpoints`

---

## TASK B2-07-02 · Migración `B2-02_create_course_progress` · `[ ]`

### 2.1 · Generar y editar

```bash
docker compose exec backend uv run alembic revision -m "B2-02_create_course_progress"
```

Editar a mano:

1. Crear tabla `course_progress` con todos los campos del modelo + índices.
2. Unique constraint `(user_id, course_id)`.
3. **Habilitar RLS** sobre `course_progress` con la política `tenant_isolation` (igual que `users` y `user_sessions`):
   ```sql
   ALTER TABLE course_progress ENABLE ROW LEVEL SECURITY;
   ALTER TABLE course_progress FORCE ROW LEVEL SECURITY;
   CREATE POLICY tenant_isolation ON course_progress
     USING (org_id = current_setting('app.current_org_id', true)::uuid)
     WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);
   ```
4. `GRANT SELECT, INSERT, UPDATE, DELETE ON course_progress TO hg_app, hg_superadmin;`
5. **NO crear** `enrollments` ni `user_learning_profiles` — siguen draft.

### 2.2 · Aplicar local

```bash
docker compose exec backend uv run alembic upgrade head
# Validar
\d course_progress
\dT+ ...
SELECT current_setting('app.current_org_id', true);
```

### 2.3 · Criterios

- [ ] Migración `B2-02_create_course_progress.py` aplicada local
- [ ] RLS + política funcionando (verificar con un test simple cross-org)
- [ ] `make test-backend` sigue verde sobre 48 tests previos
- [ ] Commit: `feat(B2-07): migration B2-02 — course_progress table with RLS`

---

## TASK B2-07-03 · Tests backend · `[ ]`

En `apps/backend/tests/test_course_progress.py`:

- `test_get_course_detail_unauth` → 401/403.
- `test_get_course_detail_ok_with_no_progress` → 200 con `progress=None`.
- `test_get_course_detail_includes_progress_after_play` → 200 con `progress` populado.
- `test_get_course_detail_404_inactive` → curso inactivo da 404.
- `test_post_progress_creates_row_first_time` → crea CourseProgress.
- `test_post_progress_updates_existing` → segunda llamada actualiza last_position y watch_pct.
- `test_post_progress_marks_completed_at_80` → `watch_pct=80` → `is_completed=True`, `completed_at` poblado.
- `test_post_progress_completed_at_immutable` → tercera llamada con `watch_pct=90` no cambia `completed_at`.
- `test_progress_cross_org_isolation` → user de Org A NO ve progress de user de Org B (RLS).
- `test_post_progress_validation` → `watch_pct=120` → 422.

Total: **10 tests nuevos**.

### Criterios

- [ ] 10 tests, todos verdes
- [ ] `make test-backend` → 58/58
- [ ] Commit: `test(B2-07): course progress + detail endpoint coverage`

---

## TASK B2-07-04 · Frontend types + cliente API · `[ ]`

### 4.1 · Extender `apps/frontend/src/lib/types.ts`

```ts
export interface CourseProgress {
  last_position_seconds: number;
  watch_pct: number;
  is_completed: boolean;
  completed_at: string | null;
}

export interface CourseDetail extends Course {
  progress: CourseProgress | null;
}

export interface CourseProgressPayload {
  position_seconds: number;
  watch_pct: number;
}
```

### 4.2 · Funciones en `apps/frontend/src/lib/api.ts`

```ts
export const apiGetCourse = async (slug: string): Promise<CourseDetail> => {
  const res = await backend.get<CourseDetail>(`/api/v1/courses/${slug}`);
  return res.data;
};

export const apiSaveProgress = async (
  slug: string,
  payload: CourseProgressPayload,
): Promise<CourseProgress> => {
  const res = await backend.post<CourseProgress>(`/api/v1/courses/${slug}/progress`, payload);
  return res.data;
};
```

### 4.3 · Criterios

- [ ] Tipos + 2 funciones
- [ ] `pnpm typecheck` verde
- [ ] Commit: `feat(B2-07): frontend types + API client for course detail and progress`

---

## TASK B2-07-05 · Componente `VideoPlayer` (HLS.js + controles custom) · `[ ]`

### 5.1 · Instalar HLS.js

```bash
cd apps/frontend
pnpm add hls.js@^1.5
pnpm add -D @types/hls.js
```

### 5.2 · Crear `apps/frontend/src/components/video/VideoPlayer.tsx`

Componente client. Props:

```ts
interface VideoPlayerProps {
  src: string;                              // HLS master.m3u8
  poster?: string | null;                   // thumbnail
  startAt?: number;                         // last_position_seconds para reanudar
  onProgress?: (data: {                     // disparado cada 5s
    position_seconds: number;
    watch_pct: number;
    duration_seconds: number;
  }) => void;
  onComplete?: () => void;                  // disparado una vez al cruzar 80%
}
```

Comportamiento:

- Detectar soporte nativo HLS (Safari/iOS) → setear `video.src = src` directo. Caso contrario, instanciar `new Hls()` y attach.
- Si `startAt > 5`, hacer `video.currentTime = startAt` en `loadedmetadata`.
- Controles custom (sin `controls` nativo):
  - **Play/pause** botón centrado al inicio + overlay clickable.
  - **Barra de progreso** clickeable + draggable.
  - **Tiempo** `currentTime / duration` (`mm:ss / mm:ss`).
  - **Volumen** slider + botón mute.
  - **Fullscreen** botón con `requestFullscreen()`.
  - **Quality switcher** (auto / 480p / 720p / 1080p) leyendo `hls.levels`.
  - **Velocidad** menú (0.75/1/1.25/1.5).
- Disparar `onProgress` cada **5 segundos** de reproducción (no en cada `timeupdate`).
- Disparar `onComplete()` **una sola vez** cuando `watch_pct >= 80`.
- Limpiar `hls.destroy()` en unmount.
- Pausar al perder visibilidad (`document.visibilityState === 'hidden'`).

### 5.3 · Estilos

Usar tokens del DS: `bg-ink-900`, `text-cream-50`, controles con `text-cream-200 hover:text-orange`. Aspect ratio 16:9. Border-radius `rounded-lg`. Player responde a teclado: espacio = play/pause, ← → = ±5s, ↑ ↓ = ±10% volumen, F = fullscreen, M = mute.

### 5.4 · Tests del componente

`apps/frontend/src/components/video/__tests__/VideoPlayer.test.tsx`:

- Render básico con `src`. Verifica que el `<video>` está en el DOM.
- `startAt` aplicado en `loadedmetadata` simulado.
- `onProgress` disparado tras avanzar `currentTime` (mock `setInterval`).
- `onComplete` disparado al cruzar 80% una sola vez.

### 5.5 · Criterios

- [ ] `hls.js` + types instalados
- [ ] `VideoPlayer.tsx` con todas las props + comportamiento descrito
- [ ] Soporte teclado
- [ ] 4 tests verdes
- [ ] `pnpm typecheck` verde
- [ ] Commit: `feat(B2-07): VideoPlayer component (HLS.js + custom controls)`

---

## TASK B2-07-06 · Página `/library/[slug]` · `[ ]`

### 6.1 · Crear `apps/frontend/src/app/(app)/library/[slug]/page.tsx`

Server component que delega a un client component (`CourseDetailView`) para hooks. O todo client component si es más simple.

Estructura:

```
┌──────────────────────────────────────────────┐
│  ← Volver a biblioteca                       │
│                                              │
│  ┌────────────────────────┐  ┌────────────┐ │
│  │                        │  │ L3 · C1    │ │
│  │   VideoPlayer          │  │ 7:12       │ │
│  │                        │  │            │ │
│  │                        │  │ Título     │ │
│  └────────────────────────┘  │ del curso  │ │
│                              │            │ │
│  Descripción del curso...    │ Descripción│ │
│                              │ completa   │ │
│                              │            │ │
│                              │ ☑ Completo │ │
│                              └────────────┘ │
└──────────────────────────────────────────────┘
```

Flujo:

1. Cargar `apiGetCourse(slug)` en mount.
2. Si `progress?.last_position_seconds > 5` y `!is_completed`, mostrar diálogo "¿Reanudar desde X:XX o empezar de nuevo?" antes de renderizar el player.
3. Pasar `startAt={progress?.last_position_seconds}` al player.
4. Wirearle `onProgress` con **debounce throttle de 5 segundos** que llama `apiSaveProgress(slug, {position_seconds, watch_pct})`.
5. Wirearle `onComplete` con toast "¡Lo terminaste!" + recálculo state.
6. `useEffect` con cleanup en `beforeunload` / `pagehide` → flush final del último position si hubo cambios.

### 6.2 · Helper `useThrottledProgress(slug, intervalMs=5000)`

Hook que retorna `(data) => void`. Internamente lleva un buffer del último payload y lo dispara con `apiSaveProgress` cada 5s (o si cambió el dato significativamente: `Math.abs(new.pct - last.pct) > 10`).

### 6.3 · Estados

- Loading: skeleton de 16:9 + sidebar gris.
- Error: card de error con "Reintentar" y "Volver a biblioteca".
- Not found: redirect a `/library` con toast "Curso no encontrado".

### 6.4 · Link desde `CourseCard`

Actualizar `apps/frontend/src/components/library/CourseCard.tsx` para que el card sea un `<Link href={`/library/${course.slug}`}>` envolviendo todo. Borrar el `onClick` que era placeholder.

### 6.5 · Criterios

- [ ] Página `/library/[slug]` renderiza con datos reales del backend
- [ ] Player reproduce HLS desde R2 (probar con uno de los 3 cursos seedeados)
- [ ] Reanudación funciona (recargar la página después de 30s de reproducción debe ofrecer "Reanudar")
- [ ] Throttle real: en network tab debe verse 1 POST cada \~5s (no spam)
- [ ] Marca completo al cruzar 80% + toast
- [ ] Link `CourseCard → /library/[slug]` activo
- [ ] `pnpm typecheck` + `pnpm test` verdes
- [ ] Commit: `feat(B2-07): /library/[slug] page with VideoPlayer + throttled progress tracking`

---

## TASK B2-07-07 · Tests frontend · `[ ]`

En `apps/frontend/src/app/(app)/library/[slug]/__tests__/page.test.tsx`:

- Render con curso mock → player visible con `src=hls_master_url`.
- `progress.last_position_seconds > 5` → diálogo "Reanudar" visible.
- Click "Reanudar" → cierra diálogo.
- Click "Empezar de nuevo" → cierra diálogo.

En `apps/frontend/src/lib/__tests__/utils.test.ts` (si existe, sino crear):

- `useThrottledProgress` mock con timers fakeados (vitest `vi.useFakeTimers()`).

Total: **4-5 tests nuevos**.

### Criterios

- [ ] Tests frontend → 20/20+
- [ ] `pnpm test` verde
- [ ] Commit: `test(B2-07): page + throttle coverage`

---

## TASK B2-07-08 · ADR-0008 + docs + smoke prod · `[ ]`

### 8.1 · `docs/adrs/ADR-0008-video-player-hls-and-progress-tracking.md`

Contexto: catálogo en R2 servido vía CDN. MVP necesita reproducción + tracking simple.

Decisión:
- **HLS.js** (no Video.js) por peso/mantenimiento.
- **CourseProgress** productivo, RLS por org. Unique por (user, course).
- **80%** como umbral fijo de completion (revisable cuando coaches firmen criterios pedagógicos en B3-03).
- **5s** de throttling para reducir carga del backend (\~12 requests por minuto de reproducción × N usuarios).
- **NO enrollment**: el progreso arranca implícitamente al primer play. Enrollment formal queda B2-08 (cuando exista asignación manual de paths por manager / RRHH).

Consecuencias:
- ✅ Demo end-to-end completa: catálogo → click → reproducción HLS adaptativa → progreso persistido → marcado completo.
- ⚠️ Sin enrollment, no se puede asignar contenido obligatorio aún.
- ⚠️ Métricas de cohorte (B4-07) tendrán que reconstruirse desde `course_progress` (es la fuente de verdad ahora).

### 8.2 · `docs/ARCHITECTURE.md`

Agregar sección "## Catálogo - Reproducción y progreso (B2-07)":
- Modelo `course_progress` + RLS.
- Endpoints `/courses/{slug}` y `/courses/{slug}/progress`.
- VideoPlayer + HLS.js + throttle 5s.
- Threshold 80%.

### 8.3 · `apps/frontend/README.md`

Mencionar nueva ruta `/library/[slug]` + dependencia `hls.js`.

### 8.4 · Screenshots `docs/screenshots/player-b2-07/`

Tomar con Playwright + uno de los cursos seedeados (`l1-c1-...`):
- `01-course-detail-fresh.png` — primera carga del curso, player en pause con poster.
- `02-course-detail-playing.png` — reproduciendo a la mitad.
- `03-resume-dialog.png` — diálogo de reanudación.
- `04-course-completed-toast.png` — toast al cruzar 80%.
- `05-mobile-player.png` — vista mobile con controles compactos.

### 8.5 · Smoke en prod (opcional, post-merge)

Una vez mergeado el PR y aplicado a Neon:
```bash
# Reproducir en https://app.humangrowth.io/library/<slug>
# Verificar en Network tab: POSTs cada ~5s a /api/v1/courses/<slug>/progress
# Validar fila en DB:
SELECT slug, last_position_seconds, watch_pct, is_completed, completed_at
  FROM course_progress cp JOIN courses c ON c.id = cp.course_id
  WHERE cp.user_id = '<test-user-id>';
```

### 8.6 · Criterios

- [ ] ADR-0008 creado y referenciado en ARCHITECTURE
- [ ] ARCHITECTURE.md + frontend README actualizados
- [ ] 5 screenshots en `docs/screenshots/player-b2-07/` + CAPTURE.md
- [ ] Commit: `docs(B2-07): ADR-0008 + ARCHITECTURE + README + 5 screenshots`

---

# 🎯 Criterios globales "hecho"

- [ ] 8 TASKs commiteadas individualmente.
- [ ] Migración `B2-02_create_course_progress` aplicada local + reproducible.
- [ ] Endpoints `GET /api/v1/courses/{slug}` y `POST /api/v1/courses/{slug}/progress` en OpenAPI.
- [ ] Player HLS reproduce uno de los 3 cursos seedeados desde `cdn.humangrowth.io` en local.
- [ ] Reanudación + throttle 5s + marca completo al 80% funcionan e2e.
- [ ] `pnpm build` + `typecheck` verdes · `pnpm test` 20+/20+ verde.
- [ ] `make test-backend` 58/58.
- [ ] ADR-0008 + ARCHITECTURE + 5 screenshots.

# 📤 Entrega

- SHA del último commit
- Output `alembic current`
- Output `SELECT COUNT(*) FROM course_progress;` después de probar
- 5 screenshots
- URL del PR contra `main`
- Lista de desviaciones del plan (si las hubo)

# Status por TASK (editar al avanzar)

| ID | Subject | Status |
|---|---|---|
| B2-07-01 | Productivizar CourseProgress + endpoints detalle + progress | `[x] DONE` |
| B2-07-02 | Migración B2-02 course_progress + RLS | `[x] DONE` |
| B2-07-03 | Tests backend (10 nuevos) | `[x] DONE` |
| B2-07-04 | Frontend types + API client | `[x] DONE` |
| B2-07-05 | VideoPlayer (HLS.js + custom controls) | `[x] DONE` |
| B2-07-06 | Página /library/[slug] + throttle | `[x] DONE` |
| B2-07-07 | Tests frontend (4-5 nuevos) | `[x] DONE` |
| B2-07-08 | ADR-0008 + docs + screenshots | `[x] DONE` |
