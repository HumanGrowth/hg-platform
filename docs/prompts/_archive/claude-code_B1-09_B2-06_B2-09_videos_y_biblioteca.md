# Prompt Claude Code · B1-09 + B2-06 + B2-09 · Videos a R2 + Catálogo + Biblioteca conectada

> **Modo recomendado:** `/effort high` con **Claude Opus 4.8**.
> Refactor de modelo + migración productiva + script Drive→R2 + endpoints + conexión frontend. ~6-8h secuencial. 11 TASKs.

---

## ⚙️ Resume protocol

Si la sesión se compacta o reinicia:

1. Releé este prompt entero (`docs/prompts/claude-code_B1-09_B2-06_B2-09_videos_y_biblioteca.md`).
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

- **Un commit por TASK** con prefijo Kanban: `feat(B1-09): ...`, `feat(B2-06): ...`, `feat(B2-09): ...`. Sub-commits intermedios `wip(BX-XX): ...` cada >25 min.
- **Editá ESTE archivo al avanzar** (status + `[x]`).
- **No avances** si la TASK actual no está `✅ DONE`.
- **No tocar lógica de assessment / scoring** — fuera de scope. El motor B2-02/B2-03 se hace aparte cuando los coaches firmen las preguntas. (El concepto "assessment cinematográfico AI" queda descartado del MVP — no introducir referencias.)
- **No alterar la paleta ni los componentes UI** del FE-v2 — solo conectar datos.
- **Catálogo público a usuarios autenticados** — sin RLS sobre `courses`/`career_paths`. Son globales al producto, no por org.

## 📌 Estado al iniciar

- `main` en `85dc988` (merge PR #3 · Frontend v2 cerrado).
- Backend prod en `api.humangrowth.io` (Railway, `hg_app` con RLS). Migración `B1-13 contact_inquiries` aplicada (verificar `alembic current`).
- Frontend prod en `app.humangrowth.io` (Vercel).
- Tests: backend 42/42 · frontend 10/10.
- `apps/backend/src/hg/modules/learning/models.py` tiene 5 clases en **draft** (CareerPath, Course, Enrollment, CourseProgress, UserLearningProfile). **No** existen aún router/schemas/migración productiva del catálogo.
- `apps/backend/src/hg/modules/people/models.py` tiene 4 clases assessment-related en draft — **NO TOCAR** en este prompt, son de B2-02/03.
- Frontend `apps/frontend/src/app/(app)/library/page.tsx` y `(app)/path/page.tsx` viven con datos hardcoded/mock.
- Drive folder raíz: `1F-_ImakSIBEEB4ovkMba-99QkZ-9GjfQ` — 6 subfolders. **L1/L2/L3 marcadas "Done" → migrar al alcance de este sprint**. L4/L5/L6 quedan para otra iteración.

## 🧠 Modelo de dominio confirmado por Andrés (Jun 16)

El catálogo del Drive es **PMM v3** y operativiza el pilar **P1 Carrera** del Marco Teórico. Los otros 5 pilares (P2 Propósito, P3 Relaciones, P4 Salud, P5 Paz Interior, P6 Estabilidad) **no tienen videos producidos hoy**.

```
CareerPath (6 pilares del Marco Teórico)
  ├─ P1 · Carrera e impacto           ← TODOS los videos del Drive viven acá
  ├─ P2 · Propósito y significado     ← sin contenido video aún
  ├─ P3 · Relaciones y conexión       ← sin contenido video aún
  ├─ P4 · Salud y bienestar           ← sin contenido video aún
  ├─ P5 · Paz interior y claridad     ← sin contenido video aún
  └─ P6 · Estabilidad emocional + material  ← sin contenido video aún

Course (dentro de P1 Carrera)
  ├─ competency_code  ∈ { C1, C2, C3, C4, C5 }
  │       C1 Adaptabilidad y Aprendizaje
  │       C2 Excelencia Operativa y Colaboración
  │       C3 Expertise y Pensamiento Estratégico
  │       C4 Comunicación e Influencia
  │       C5 Inteligencia Emocional y Social
  ├─ career_level     ∈ { L1, L2, L3, L4, L5, L6 }
  │       L1 Foundation (Junior)
  │       L2 Developing (Coordinator/Analyst)
  │       L3 Applying (Senior)
  │       L4 Enabling (Lead/Supervisor)
  │       L5 Advising (Manager/Sr.Manager)
  │       L6 Directing (Director)
  └─ track            ∈ { competency, foundation_ai, foundation_eth, foundation_specifics }
```

> ⚠️ **Importante**: NO renombrar `P1..P6` en el frontend. La nomenclatura `P1..P6` se queda para los pilares del Marco Teórico. Los códigos del catálogo PMM se llaman `C1..C5` para evitar colisión.

> ⚠️ **Niveles del frontend**: actualizar `LEVELS` en `library/page.tsx` de `["L1","L2","L3","L4a","L4b"]` → `["L1","L2","L3","L4","L5","L6"]`. El campo `users.career_level` (enum) tiene hoy `L1..L4b` — agregar `L5`, `L6` y deprecar `L4a/L4b` con migración. Mantener valores viejos en el enum por compat (no destruir).

---

# TASKS

## TASK B1-09-01 · Refactor del modelo `learning` · `[ ]`

### 1.1 · Sacar `⚠️ DRAFT` del docstring de `apps/backend/src/hg/modules/learning/models.py`

El modelo ahora es productivo. Reemplazar el docstring de cabecera:

```python
"""Learning models — catálogo de cursos PMM v3 + perfiles de aprendizaje.

Schema productivo. El catálogo es **global al producto** (no multi-tenant):
los cursos son contenido HG, no por organización. Por eso `CareerPath` y
`Course` no llevan `org_id` ni RLS. `Enrollment`, `CourseProgress` y
`UserLearningProfile` SÍ son por usuario/org y se mantienen draft hasta B2-08.
"""
```

### 1.2 · Agregar enums

En el mismo archivo, antes de las clases:

```python
import enum

class CareerLevel(str, enum.Enum):
    L1 = "L1"  # Foundation (Junior)
    L2 = "L2"  # Developing (Coordinator/Analyst)
    L3 = "L3"  # Applying (Senior)
    L4 = "L4"  # Enabling (Lead/Supervisor)
    L5 = "L5"  # Advising (Manager/Sr.Manager)
    L6 = "L6"  # Directing (Director)

class CompetencyCode(str, enum.Enum):
    C1 = "C1"  # Adaptabilidad y Aprendizaje
    C2 = "C2"  # Excelencia Operativa y Colaboración
    C3 = "C3"  # Expertise y Pensamiento Estratégico
    C4 = "C4"  # Comunicación e Influencia
    C5 = "C5"  # Inteligencia Emocional y Social

class CourseTrack(str, enum.Enum):
    competency = "competency"            # Course tipico (C1..C5 × L1..L6)
    foundation_ai = "foundation_ai"      # FND - AI literacy
    foundation_eth = "foundation_eth"    # FND - Ethics
    foundation_specifics = "foundation_specifics"  # FND - Specifics
```

### 1.3 · Extender `Course`

Agregar campos (con `nullable=False` salvo `competency_code` que es `nullable=True` para tracks foundation):

```python
career_level: Mapped[CareerLevel] = mapped_column(
    Enum(CareerLevel, name="career_level_pmm"), nullable=False, index=True
)
competency_code: Mapped[CompetencyCode | None] = mapped_column(
    Enum(CompetencyCode, name="competency_code"), nullable=True, index=True
)
track: Mapped[CourseTrack] = mapped_column(
    Enum(CourseTrack, name="course_track"), nullable=False,
    default=CourseTrack.competency, index=True
)
slug: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
# Override video_url para permitir null hasta que se migre el video real
video_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
hls_master_url: Mapped[str | None] = mapped_column(String(2048))   # .m3u8
```

⚠️ El enum `career_level` ya existe en `identity/models.py` (valores `L1, L2, L3, L4a, L4b`). NO reutilizar — el del catálogo PMM se llama `career_level_pmm` (distinto). El del usuario en `users` queda como está por ahora; **TASK B1-09-02 agrega L5/L6 al enum del usuario** para que coincidan.

### 1.4 · Mantener `UserLearningProfile`, `Enrollment`, `CourseProgress` con `⚠️ DRAFT — B2-08`

Sí conservar las clases pero el docstring de cada una empieza con `# ⚠️ DRAFT — depende de B2-08`. La migración B2-01 NO las crea — solo crea `career_paths` y `courses`.

### 1.5 · Criterios

- [ ] Docstring actualizado · sin "⚠️ DRAFT" general
- [ ] 3 enums nuevos (`CareerLevel`, `CompetencyCode`, `CourseTrack`)
- [ ] `Course` con `career_level`, `competency_code`, `track`, `slug`, `hls_master_url`, `video_url` nullable
- [ ] `Enrollment`/`CourseProgress`/`UserLearningProfile` marcadas individualmente como B2-08 draft
- [ ] `mypy` y `ruff` verdes en `apps/backend/src/hg/modules/learning/`
- [ ] Commit: `feat(B1-09): extend learning catalog model — PMM v3 levels + competencies + tracks`

---

## TASK B1-09-02 · Migración B2-01 · catálogo productivo + extender enum `career_level` de usuario · `[ ]`

### 2.1 · Generar migración

```bash
docker compose exec backend uv run alembic revision \
  -m "B2-01_create_catalog_career_paths_and_courses"
```

Editar el archivo generado a mano (no confiar en autogenerate por los enums). Debe:

1. Crear enums `career_level_pmm`, `competency_code`, `course_track`.
2. Crear tabla `career_paths` (id, code, name, description, order_index, created_at). UNIQUE en `code`. Seed implícito viene en TASK B1-09-08.
3. Crear tabla `courses` (id, career_path_id FK, title, slug UNIQUE, description, video_url NULL, thumbnail_url, hls_master_url, duration_seconds default 0, order_index, is_active default true, **career_level**, **competency_code NULL**, **track**, created_at). Índices en `career_path_id`, `career_level`, `competency_code`, `track`, `is_active`.
4. **Extender enum `career_level` en tabla `users`** (valores actuales `L1, L2, L3, L4a, L4b`): agregar `L5, L6`. Usar `op.execute("ALTER TYPE career_level ADD VALUE IF NOT EXISTS 'L5'")` y `L6`. **No** quitar `L4a/L4b` — quedan deprecados pero válidos.
5. **NO crear** `enrollments`, `course_progress`, `user_learning_profiles` — son B2-08.
6. **NO crear RLS** sobre `career_paths` ni `courses` — catálogo global.
7. `GRANT SELECT, INSERT, UPDATE ON career_paths, courses TO hg_app, hg_superadmin;`

### 2.2 · downgrade()

Drop tablas + drop enums + remove L5/L6 (ALTER TYPE no soporta remove value en PG <14; documentar y no romper si falla — un `op.execute` con comentario).

### 2.3 · Aplicar local

```bash
docker compose exec backend uv run alembic upgrade head
```

Verificar:
- `\d courses` muestra los campos nuevos
- `SELECT enum_range(NULL::career_level)` incluye L5, L6
- `SELECT enum_range(NULL::career_level_pmm)` muestra L1..L6

### 2.4 · Criterios

- [ ] Archivo `migrations/versions/B2-01_create_catalog_career_paths_and_courses.py` creado
- [ ] `alembic upgrade head` corre sin error · `alembic current` reporta `B2-01_...`
- [ ] `users.career_level` enum incluye L5/L6
- [ ] `courses` con 14 columnas + 5 índices + grants
- [ ] `make test-backend` 42/42 sigue verde (los tests viejos no deben romperse)
- [ ] Commit: `feat(B1-09): migration B2-01 — career_paths + courses + extended career_level enum`

---

## TASK B1-09-03 · Pydantic schemas + router público de catálogo · `[ ]`

### 3.1 · Crear `apps/backend/src/hg/modules/learning/schemas.py`

```python
from pydantic import BaseModel, ConfigDict
from uuid import UUID
from typing import Literal

class CareerPathOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    code: str           # "P1".."P6"
    name: str
    description: str | None
    order_index: int

class CourseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    career_path_id: UUID
    title: str
    slug: str
    description: str | None
    thumbnail_url: str | None
    hls_master_url: str | None
    duration_seconds: int
    career_level: str          # "L1".."L6"
    competency_code: str | None
    track: str
    is_active: bool

class CourseListResponse(BaseModel):
    items: list[CourseOut]
    total: int
```

### 3.2 · Crear `apps/backend/src/hg/modules/learning/router.py`

Endpoints (todos requieren auth):

- `GET /api/v1/paths` → lista los 6 CareerPath ordenados por `order_index`. Cacheable.
- `GET /api/v1/paths/{code}` → 1 CareerPath por `code` (P1..P6).
- `GET /api/v1/paths/{code}/courses?level=L1&competency=C1&limit=20&offset=0` → cursos del path, con filtros.
- `GET /api/v1/courses?level=&competency=&track=&q=&limit=20&offset=0` → catálogo completo con filtros opcionales y búsqueda libre `q` (ILIKE en title).

Todos:
- 401 si no hay token.
- `is_active=true` siempre filtrado.
- `Cache-Control: public, max-age=60` en GETs (los cursos cambian poco).

### 3.3 · Wirear en `apps/backend/src/hg/api/v1/__init__.py`

```python
from hg.modules.learning.router import router as learning_router
router.include_router(learning_router, tags=["catalog"])
```

### 3.4 · Criterios

- [ ] 4 endpoints documentados en OpenAPI con tag `catalog`
- [ ] Schemas con `from_attributes=True`
- [ ] Filtros funcionales (validar con curl manual + test en TASK B1-09-10)
- [ ] `mypy` + `ruff` verdes
- [ ] Commit: `feat(B2-06): catalog endpoints — paths + courses with filters`

---

## TASK B1-09-04 · Cliente R2 (boto3) + helper de upload · `[ ]`

### 4.1 · Agregar `boto3` a dependencias

```bash
docker compose exec backend uv add boto3
```

### 4.2 · Crear `apps/backend/src/hg/core/storage.py`

Cliente S3 apuntando al endpoint R2 (`https://{account_id}.r2.cloudflarestorage.com`). Wrapper:

```python
def get_r2_client() -> boto3.client: ...
def upload_file(local_path: Path, key: str, content_type: str) -> str:
    """Sube a R2; devuelve URL pública (r2_public_base_url + key)."""
def upload_bytes(data: bytes, key: str, content_type: str) -> str: ...
```

URLs públicas: `{r2_public_base_url}/{key}`. Usar `r2_public_base_url` del config (ej. `https://cdn.humangrowth.io/`).

### 4.3 · Validar credenciales R2 en `config.py`

Ya existen las 4 vars (`r2_account_id`, `r2_access_key_id`, `r2_secret_access_key`, `r2_bucket`, `r2_public_base_url`). Agregar validación: si están vacías y el script de migración corre, log warning + skip upload (modo dry-run).

### 4.4 · Criterios

- [ ] `boto3` en `pyproject.toml`
- [ ] `core/storage.py` con cliente + 2 helpers + tipos
- [ ] Dry-run mode si credenciales R2 ausentes
- [ ] Commit: `feat(B1-09): R2 storage client (boto3) + upload helpers`

---

## TASK B1-09-05 · Script de migración Drive → R2 + manifest · `[ ]`

### 5.1 · Crear `apps/backend/scripts/migrate_videos_to_r2.py`

Script CLI (typer o argparse). Argumentos:

```
--drive-folder TEXT     ID de la carpeta de nivel (L1/L2/L3)
--level TEXT            L1 | L2 | L3 (PMM)
--manifest-out PATH     archivo JSON de salida (apps/backend/scripts/manifest/<level>.json)
--dry-run               no sube a R2, solo escribe manifest
--skip-hls              copia MP4 tal cual a R2 (sin transcodear a HLS)
--limit INT             para pruebas
```

Flujo por video:

1. **Listar Drive folder** con la API de Drive (el agente tiene `mcp__ad2fb61f-d144-4eea-9966-d23b8490c672__*`). Iterar recursivo: nivel → competencia (P1..P5 del Drive = C1..C5) o foundation (FND - AI / FND - ETH / FND - Specifics) → MP4s.
2. **Descargar** con `download_file_content` a `/tmp/hg_videos/<level>/<competency>/<filename>`.
3. **Generar HLS + thumbnail** con ffmpeg local del backend container:
   ```bash
   ffmpeg -i input.mp4 \
     -filter_complex "[0:v]split=3[v1][v2][v3]; \
        [v1]scale=854:480[v1out]; [v2]scale=1280:720[v2out]; [v3]scale=1920:1080[v3out]" \
     -map "[v1out]" -c:v:0 libx264 -b:v:0 800k -maxrate:0 856k -bufsize:0 1200k \
     -map "[v2out]" -c:v:1 libx264 -b:v:1 1500k -maxrate:1 1605k -bufsize:1 2250k \
     -map "[v3out]" -c:v:2 libx264 -b:v:2 4000k -maxrate:2 4280k -bufsize:2 6000k \
     -map a:0 -map a:0 -map a:0 -c:a aac -b:a 128k \
     -var_stream_map "v:0,a:0 v:1,a:1 v:2,a:2" \
     -hls_time 6 -hls_playlist_type vod \
     -master_pl_name master.m3u8 \
     -f hls -hls_segment_filename "stream_%v/data%03d.ts" "stream_%v/playlist.m3u8"
   # thumbnail
   ffmpeg -i input.mp4 -ss 5 -vframes 1 -vf scale=640:360 thumbnail.jpg
   ```
4. **Subir** cada archivo a R2 bajo la key `videos/{level}/{competency}/{slug}/...`:
   - `master.m3u8`
   - `stream_0/playlist.m3u8`, `stream_0/data*.ts` (480p)
   - `stream_1/...` (720p), `stream_2/...` (1080p)
   - `thumbnail.jpg`
5. **Agregar entry al manifest**:
   ```json
   {
     "slug": "l1-c1-adaptabilidad-intro",
     "title": "Introducción a la adaptabilidad",
     "career_level": "L1",
     "competency_code": "C1",
     "track": "competency",
     "duration_seconds": 432,
     "hls_master_url": "https://cdn.humangrowth.io/videos/L1/C1/l1-c1-adaptabilidad-intro/master.m3u8",
     "thumbnail_url":  "https://cdn.humangrowth.io/videos/L1/C1/l1-c1-adaptabilidad-intro/thumbnail.jpg",
     "video_url": null,
     "order_index": 1,
     "is_active": true
   }
   ```
6. **Logs**: `processed/skipped/failed` counts. Re-ejecutable: si el manifest ya tiene un slug, skip.

**Mapeo de carpetas del Drive a `competency_code` / `track`**:

| Drive folder | competency_code | track |
|---|---|---|
| `P1 - Adaptabilidad y Aprendizaje` | C1 | competency |
| `P2 - Excelencia Operativa y Colaboración` | C2 | competency |
| `P3 - Expertise y Pensamiento Estratégico` | C3 | competency |
| `P4 - Comunicación e Influencia` | C4 | competency |
| `P5 - Inteligencia Emocional y Social` | C5 | competency |
| `FND - AI` | NULL | foundation_ai |
| `FND - ETH` | NULL | foundation_eth |
| `FND - Specifics` | NULL | foundation_specifics |

**`title` y `slug`**:
- `title` = nombre del archivo del Drive sin extensión, limpio (sin `_v3`, sin guiones bajos sueltos).
- `slug` = kebab-case de `{level}-{competency}-{titulo}`.

**`duration_seconds`**: usar `ffprobe` después de descargar.

### 5.2 · Correr para los 3 niveles Done

```bash
docker compose exec backend uv run python scripts/migrate_videos_to_r2.py \
  --drive-folder 131KYawT8lC8I2hqFrpHf3XeNqQBQX8HO \
  --level L1 \
  --manifest-out scripts/manifest/L1.json
# repetir L2 (1lD2rBWx8umDmo6T72RnXqTZ-uQdp40GV) y L3 (1rKAmuLRAbqewTcGzEXm6_FwaArAlxGI7)
```

⚠️ **Si no hay credenciales R2 cargadas en el env del container**, usar `--dry-run` para producir solo el manifest. Andrés cargará las credenciales por separado y re-correrá el script.

### 5.3 · Criterios

- [ ] Script `scripts/migrate_videos_to_r2.py` ejecuta sin errores
- [ ] Manifest para L1/L2/L3 generado (al menos en dry-run)
- [ ] Idempotente: re-ejecución no duplica
- [ ] Logs claros con `tqdm` o equivalente
- [ ] Documentar en `scripts/README.md` cómo correrlo en local + en prod
- [ ] Commit: `feat(B1-09): Drive→R2 video migration script + manifest generator`

---

## TASK B1-09-06 · Seed B1-11 cursos + 6 CareerPaths · `[ ]`

### 6.1 · Crear `apps/backend/src/hg/scripts/seed_catalog.py`

Inserta los 6 CareerPath del Marco Teórico (si no existen ya) y popula cursos desde los manifests:

```python
PATHS = [
    {"code": "P1", "name": "Carrera e impacto",       "order_index": 1, "description": "..."},
    {"code": "P2", "name": "Propósito y significado", "order_index": 2, "description": "..."},
    {"code": "P3", "name": "Relaciones y conexión",   "order_index": 3, "description": "..."},
    {"code": "P4", "name": "Salud y bienestar",       "order_index": 4, "description": "..."},
    {"code": "P5", "name": "Paz interior y claridad", "order_index": 5, "description": "..."},
    {"code": "P6", "name": "Estabilidad emocional y material", "order_index": 6, "description": "..."},
]
```

Para cada manifest (`scripts/manifest/L1.json`, `L2.json`, `L3.json`):
- Asignar `career_path_id` = id de P1 (todos los videos del catálogo viven bajo P1 Carrera).
- Upsert por `slug` (no duplicar).
- `order_index` por `(career_level, competency_code, order_index_dentro_de_grupo)`.

### 6.2 · Comando Makefile

```make
seed-catalog:
	docker compose exec backend uv run python -m hg.scripts.seed_catalog
```

### 6.3 · Criterios

- [ ] 6 CareerPath creados/upsertados
- [ ] Cursos de L1+L2+L3 cargados desde los manifests
- [ ] Re-ejecutable sin duplicar
- [ ] Verificar con `SELECT count(*) FROM courses GROUP BY career_level, competency_code` → contador por celda PMM
- [ ] Commit: `feat(B1-11): seed catalog — 6 paths + courses from L1/L2/L3 manifests`

---

## TASK B2-09-07 · Cliente frontend · `apiListPaths` + `apiListCourses` · `[ ]`

### 7.1 · Agregar tipos en `apps/frontend/src/lib/types.ts`

```ts
export interface CareerPath {
  id: string;
  code: "P1" | "P2" | "P3" | "P4" | "P5" | "P6";
  name: string;
  description: string | null;
  order_index: number;
}

export type CareerLevel = "L1" | "L2" | "L3" | "L4" | "L5" | "L6";
export type CompetencyCode = "C1" | "C2" | "C3" | "C4" | "C5";
export type CourseTrack = "competency" | "foundation_ai" | "foundation_eth" | "foundation_specifics";

export interface Course {
  id: string;
  career_path_id: string;
  title: string;
  slug: string;
  description: string | null;
  thumbnail_url: string | null;
  hls_master_url: string | null;
  duration_seconds: number;
  career_level: CareerLevel;
  competency_code: CompetencyCode | null;
  track: CourseTrack;
  is_active: boolean;
}

export interface CourseFilters {
  level?: CareerLevel;
  competency?: CompetencyCode;
  track?: CourseTrack;
  q?: string;
  limit?: number;
  offset?: number;
}
```

### 7.2 · Agregar funciones en `apps/frontend/src/lib/api.ts`

```ts
export const apiListPaths = async (): Promise<CareerPath[]> => {
  const res = await backend.get<CareerPath[]>("/api/v1/paths");
  return res.data;
};

export const apiListCourses = async (
  filters?: CourseFilters,
): Promise<{ items: Course[]; total: number }> => {
  const res = await backend.get("/api/v1/courses", { params: filters });
  return res.data;
};

export const apiListCoursesForPath = async (
  pathCode: string,
  filters?: Omit<CourseFilters, "track">,
): Promise<{ items: Course[]; total: number }> => {
  const res = await backend.get(`/api/v1/paths/${pathCode}/courses`, { params: filters });
  return res.data;
};
```

### 7.3 · Criterios

- [ ] Tipos en `types.ts`
- [ ] 3 funciones en `api.ts` con types correctos
- [ ] `pnpm typecheck` verde
- [ ] Commit: `feat(B2-09): frontend API client for catalog (paths + courses)`

---

## TASK B2-09-08 · Refactor `library/page.tsx` con datos reales · `[ ]`

### 8.1 · Reescribir `apps/frontend/src/app/(app)/library/page.tsx`

- Estados: `loading`, `error`, `data`. Usar `useEffect` + `useState` (sin libs nuevas; cualquier reescritura a SWR/React Query queda fuera de scope).
- Filtros:
  - **Nivel** chips: `["L1","L2","L3","L4","L5","L6"]` (single-select para empezar)
  - **Competencia** chips: `["C1","C2","C3","C4","C5"]` (single-select)
  - **Track**: switch `Competencias / Foundations` (foundations agrupa AI/ETH/Specifics)
- Llamar `apiListCourses(filters)` al montar y cuando cambien los filtros (debounce 200ms si hay `q` futuro).
- Grid de cards: thumbnail (`thumbnail_url`) + título + nivel (badge) + competencia (badge) + duración (`mm:ss`).
- Card vacía: cuando `items.length === 0` mostrar `EmptyRing` actual con copy adaptada.
- Loading: skeleton con 6 cards grises.
- Error: card de error con botón "Reintentar".

### 8.2 · Helper `formatDuration(seconds: number): string`

En `lib/utils.ts`. `432` → `"7:12"`.

### 8.3 · Card de curso reutilizable

`apps/frontend/src/components/library/CourseCard.tsx`. Props: `{ course: Course; onClick?: () => void }`. Por ahora `onClick` solo abre alert o navega a `/library/[slug]` (placeholder — el player es B2-07).

### 8.4 · Criterios

- [ ] `library/page.tsx` consume backend real (network tab muestra GET `/api/v1/courses`)
- [ ] Filtros nivel + competencia + track funcionan
- [ ] Loading skeleton + error state + empty state
- [ ] Card con thumbnail + metadata
- [ ] `pnpm typecheck` + `pnpm test` verdes
- [ ] Commit: `feat(B2-09): library page wired to /api/v1/courses with filters and states`

---

## TASK B2-09-09 · `/path` (Mi Ruta) con carriles reales · `[ ]`

### 9.1 · Refactor `apps/frontend/src/app/(app)/path/page.tsx`

- Llamar `apiListPaths()` para mostrar los 6 carriles con `name` y `code` reales.
- Por cada carril, llamar `apiListCoursesForPath(code, { limit: 3 })` y mostrar los 3 primeros como "vista rápida" del path.
- Si un path no tiene cursos (P2..P6 hoy) → mostrar empty state suave: "Próximamente · contenido en producción".
- Link "Explorar la biblioteca completa →" sigue a `/library`.

### 9.2 · Criterios

- [ ] 6 carriles renderizados desde backend
- [ ] Top 3 cursos por carril (donde haya)
- [ ] Empty state para paths sin contenido
- [ ] `pnpm typecheck` verde
- [ ] Commit: `feat(B2-09): /path carriles with top 3 courses per pillar from backend`

---

## TASK B1-09-10 · Tests backend + frontend · `[ ]`

### 10.1 · Backend (`apps/backend/tests/test_catalog.py`)

Tests con la fixture `client` ya disponible:

- `GET /api/v1/paths` devuelve 6 entries ordenados por `order_index`.
- `GET /api/v1/paths/P1` devuelve 1.
- `GET /api/v1/paths/P9` → 404.
- `GET /api/v1/courses?level=L1&competency=C1` devuelve solo los cursos que matchean.
- `GET /api/v1/courses?track=foundation_ai` filtra foundations.
- Sin token → 401.

### 10.2 · Frontend

- `apps/frontend/src/components/library/__tests__/CourseCard.test.tsx`: render básico + thumbnail + duración formateada.
- `apps/frontend/src/lib/__tests__/utils.test.ts`: `formatDuration(0)` → `"0:00"`, `formatDuration(432)` → `"7:12"`, `formatDuration(3725)` → `"1:02:05"`.

### 10.3 · Criterios

- [ ] Backend: al menos 6 tests catálogo, todos verdes. Total: 48/48.
- [ ] Frontend: al menos 4 tests nuevos, todos verdes. Total: 14/14.
- [ ] Commit: `test(B2-06,B2-09): backend catalog endpoints + frontend course card + utils`

---

## TASK B1-09-11 · ADR-0007 + docs · `[ ]`

### 11.1 · `docs/adrs/ADR-0007-catalog-model-pmm-as-p1-subset.md`

Cubrir:
- **Contexto**: el catálogo del Drive es PMM v3, cubre solo el pilar P1 Carrera del Marco Teórico. Los otros 5 pilares no tienen videos.
- **Decisión**: `Course` se modela bajo P1 con sub-clasificación `competency_code` (C1..C5) + `career_level` (L1..L6) + `track`. CareerPath sigue siendo los 6 pilares del Marco Teórico (P1..P6).
- **Consecuencias**:
  - ✅ El frontend muestra el dashboard con 6 dimensiones aunque solo P1 tenga contenido.
  - ✅ Cuando los fundadores produzcan videos para P2..P6, se cargan al mismo schema.
  - ⚠️ `track` foundations (AI/ETH/Specifics) son cross-competencia pero siguen bajo P1.
  - ⚠️ El enum `users.career_level` ahora incluye L1..L6 (deprecando L4a/L4b sin destruirlos).

### 11.2 · `docs/ARCHITECTURE.md`

Agregar sección "## Catálogo PMM (B1-09 + B2-06)" cubriendo el modelo + endpoints + estructura del Drive + flujo de migración.

### 11.3 · `apps/backend/scripts/README.md`

Documentar cómo correr `migrate_videos_to_r2.py` y `seed_catalog.py` (vars de entorno, modos dry-run, idempotencia).

### 11.4 · Frontend `README.md`

Mencionar la nueva sección catalog y los endpoints consumidos.

### 11.5 · Criterios

- [ ] ADR-0007 creado y referenciado en ARCHITECTURE
- [ ] ARCHITECTURE.md actualizado
- [ ] scripts/README + frontend README actualizados
- [ ] Commit: `docs(B1-09): ADR-0007 + ARCHITECTURE + script + frontend README updates`

---

# 🎯 Criterios globales "hecho"

- [ ] 11 TASKs commiteadas individualmente (1 commit cada una).
- [ ] Migración `B2-01_create_catalog_career_paths_and_courses` aplicada local y reproducible.
- [ ] Catálogo seedeado: 6 CareerPaths + cursos de L1/L2/L3 (sea con URLs R2 reales o stubs si no había credenciales R2 al correr el script).
- [ ] Endpoints `/api/v1/paths` y `/api/v1/courses` documentados en OpenAPI y respondiendo 200 con datos reales.
- [ ] `/library` y `/path` del frontend consumen backend real, no mock.
- [ ] `pnpm build` verde · `pnpm typecheck` verde · `pnpm test` 14/14.
- [ ] `make test-backend` 48/48.
- [ ] ADR-0007 + ARCHITECTURE.md + READMEs actualizados.

# 📤 Entrega

- SHA del último commit
- Output de `alembic current`
- Output de `SELECT career_level, competency_code, COUNT(*) FROM courses GROUP BY 1,2 ORDER BY 1,2;`
- Screenshot de `/library` con filtros aplicados y cards reales
- Screenshot de `/path` con carriles reales
- URL del PR contra `main`

# Status por TASK (editar al avanzar)

| ID | Subject | Status |
|---|---|---|
| B1-09-01 | Refactor modelo `learning` (enums + Course extendido) | `[x] DONE` |
| B1-09-02 | Migración B2-01 (catalog + extender career_level L5/L6) | `[x] DONE` |
| B1-09-03 | Schemas + router público de catálogo | `[x] DONE` |
| B1-09-04 | Cliente R2 (boto3) + helpers upload | `[x] DONE` |
| B1-09-05 | Script Drive→R2 + manifest JSON | `[x] DONE` |
| B1-09-06 | Seed B1-11: 6 paths + cursos de L1/L2/L3 | `[x] DONE` |
| B2-09-07 | Frontend API client (paths + courses) | `[x] DONE` |
| B2-09-08 | Library page con datos reales + filtros | `[x] DONE` |
| B2-09-09 | `/path` con 6 carriles + top 3 por path | `[x] DONE` |
| B1-09-10 | Tests backend (catalog) + frontend (CourseCard + utils) | `[x] DONE` |
| B1-09-11 | ADR-0007 + docs | `[x] DONE` |
