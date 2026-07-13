# Prompt Claude Code · Learning Units v2 · Fase 1 (backend + frontend)

> **Modo recomendado:** `/effort high` con **Claude Opus 4.8**.
> Implementación completa modular de Learning Units + rename courses→events. **20 TASKs · ~40-60h en 2 PRs secuenciales**.
> Base: `main` con motion v2 mergeado.

---

## ⚙️ Resume protocol

Si la sesión se compacta o reinicia:

1. Releé este prompt (`docs/prompts/claude-code_learning_units_v2_fase1.md`).
2. Releé:
   - `HG/Docs/HG_Propuesta_Learning_Units_v2.md` (arquitectura + decisiones)
   - `HG/Docs/HG_Guia_Diseno_Modulos_Templates.md` (reglas de contenido)
   - `HG/Docs/HG_Diseno_Cognitivo_Video_Interactivo.docx` (base científica)
3. Verificá estado:
   ```bash
   git status && git log --oneline -10
   cd apps/backend && uv run pytest 2>&1 | tail -10
   cd apps/frontend && pnpm typecheck 2>&1 | tail -10
   ```
4. Buscá TASKs `🟧 IN PROGRESS` y reanudá desde el último criterio sin tildar.

## 🧱 Reglas duras

- **Un commit por TASK** con prefijos:
  - Backend: `feat(learning-units): ...` / `chore(migration): ...`
  - Frontend: `feat(modulos): ...` / `refactor(eventos): ...`
- **Editá ESTE archivo al avanzar** (status + `[x]`)
- **NO tocar assessment / marketing / admin general**
- **NO instalar deps nuevas** salvo consulta explícita
- **YouTube como único host de video en units** — sin R2, sin HLS para LearningUnit. Los eventos legacy (courses migrados) mantienen su video_url existente
- **Copy de contenido en PLACEHOLDER** — Andrés provee 1-2 units reales post-merge · el prompt genera 3 units seed con `[COPY PENDIENTE · coach]` inline
- **RLS por org NO aplica a learning_units** (contenido global HG) · SÍ aplica a `learning_unit_attempts` (progreso privado por user × org)
- **CMS admin solo superadmin** (`SuperadminGate`)
- **Public feed y detail** (`/api/v1/modulos/*`) requieren auth de user (no anon) pero no RLS de contenido
- **2 PRs secuenciales:**
  - PR-A: `feat/learning-units-backend` (TASKs A-01 a A-10)
  - PR-B: `feat/learning-units-frontend` (TASKs B-01 a B-10)
  - PR-B arranca **después** de PR-A mergeado

## 🎯 Producto final Fase 1

Al terminar:
- Sidebar app con 5 tabs primary + drawer "Más" con Eventos
- Tab **Módulos** funcional con feed + player + retrieval + completion
- Tab **Eventos** = catálogo actual renombrado (sin features nuevas)
- 3 units seed publicadas con placeholder de copy real
- Superadmin puede crear/editar/publicar units vía API (UI CMS admin en Fase 2)
- YouTube embed para videos de units
- Migration idempotente que:
  - Renombra `courses` → `events`
  - Crea 12 nuevas tablas de Learning Units
  - No borra data existente

## 🧠 Decisiones firmadas Andrés (Jul 3-4)

| # | Decisión | Ref |
|---|---|---|
| A | **Alcance:** implementación completa modular desde arranque · sin fase MVP simplificada | Todas las TASKs |
| B | **Sidebar:** 5 tabs primary + drawer "Más" con Eventos · Módulos entre Mi Ruta y Perfil | B-01 |
| C | **Contenido seed:** placeholder con `[COPY PENDIENTE · coach]` · Andrés provee 1-2 units reales post-merge | A-09 |
| D | **Migración DB:** rename real `courses` → `events` en Alembic · preserva IDs y FKs | A-01 |
| E | **Video hosting:** YouTube embed · units guardan `youtube_video_id` (11 chars) | A-02, B-05 |
| F | **Eventos deprioriza:** solo rename semántico + player heredado · features live streaming defer | A-10 |
| G | **Retrieval modular:** ≥1 bloque `quiz_recall` o `reflection_write` con `required=true` · 6 tipos quiz disponibles | A-02, B-06 |
| H | **Replays libres:** attempts unique (user, unit) · primera completion cuenta métrica | A-04 |
| I | **UX:** mobile stories + web back-to-back según lo definido en propuesta v2.1 | B-04, B-05 |

---

# FASE A · Backend + rename events (10 TASKs · ~14-18h)

Rama: `feat/learning-units-backend`
PR-A base branch: `main`

## TASK A-01 · Migration Alembic · rename `courses` → `events` + nuevas tablas · `[x]`

### A.1.1 · Estructura de tablas nuevas

Sigue el schema definido en `HG_Propuesta_Learning_Units_v2.md` §5.2 con **6 tipos de quiz polimórficos**:

```
learning_units (cabecera)
unit_blocks (índice polimórfico)
video_blocks
text_blocks (variant: context|evidence|solution)
quiz_blocks
quiz_questions (con question_type)
├── quiz_options              (single_choice + multiple_choice)
├── quiz_true_false           (true_false)
├── quiz_ordering_items       (ordering)
├── quiz_matching_pairs       (matching)
└── quiz_fill_blank_answers   (fill_blank)
quiz_multiple_choice_config
reflection_blocks
learning_unit_attempts
block_progress
quiz_responses
reflection_texts

events (renamed from courses)
event_streams (para live futuro · schema listo, sin uso en Fase 1)
```

### A.1.2 · Migración segura

```python
# apps/backend/alembic/versions/XXXX_learning_units_and_events_rename.py

def upgrade() -> None:
    # 1. Rename courses → events
    op.rename_table("courses", "events")

    # 2. Agregar columnas nuevas a events
    op.add_column("events", sa.Column("event_type", sa.Text(), nullable=True))
    op.add_column("events", sa.Column("is_preview", sa.Boolean(), server_default="true"))
    op.execute("UPDATE events SET event_type = 'recorded_webinar' WHERE event_type IS NULL")
    op.alter_column("events", "event_type", nullable=False)

    # 3. Renombrar course_progress → event_progress si existe (mantener funcional)
    # NO tocar la referencia course_id → event_id en course_progress hoy · en Fase 2

    # 4. Crear tabla event_streams (vacía)
    # ... schema del §5.2

    # 5. Crear TODAS las tablas de learning_units
    # ... schema del §5.2 (12 tablas)

    # 6. Índices
    op.create_index("ix_learning_units_pillar_level", "learning_units", ["pillar_code", "level_code"],
                    postgresql_where=sa.text("published_at IS NOT NULL"))

def downgrade() -> None:
    # Reverso completo · drop tables + rename events back to courses
    # Documentar que downgrade PIERDE los learning_units creados
    pass
```

### A.1.3 · Validaciones migration

- Verificar `SELECT COUNT(*) FROM events` post-migration == `COUNT(*)` pre-migration de courses
- Todos los `enrollments.career_path_id` siguen apuntando OK
- `course_progress` sigue con FK intacto (no cambia · esa tabla se renombra en Fase 2)

### Criterios
- [x] Migration corre limpia local en Postgres (`alembic upgrade head`)
- [x] Migration downgrade + upgrade dos veces sin errores
- [x] Datos preservados (COUNT antes/después coincide) — 13 events antes/después de cada ciclo
- [x] Commit: `feat(learning-units): migration · rename courses→events + 12 tablas nuevas`

**Nota de implementación:** el doc §5.2 cuenta "12 tablas" pero el listado
itemizado (learning_units + 8 templates + 5 hijas de quiz + attempts +
block_progress + quiz_responses + reflection_texts) suma 17 + `event_streams`
= 18. Se implementaron las 18. Desviaciones documentadas en el docstring de
la migración: enums Postgres en vez de CHECK constraints (consistente con
`career_level_pmm`/`competency_code` ya existentes), `competency_code` reusa
el enum existente (no hay tabla `competencies`), y `quiz_responses` usa
`response_data JSONB` genérico en vez de `selected_option_id` (el doc original
solo modelaba single/multiple_choice; el schema real tiene 6 tipos).

---

## TASK A-02 · SQLAlchemy models · polimorfismo + 6 tipos quiz · `[ ]`

Archivo: `apps/backend/src/hg/modules/learning_units/models.py`

### Modelos base

```python
class LearningUnit(Base):
    __tablename__ = "learning_units"
    id: Mapped[uuid.UUID] = mapped_column(UUID, primary_key=True, default=uuid.uuid4)
    slug: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    pillar_code: Mapped[str] = mapped_column(String(10), ForeignKey("career_paths.code"))
    competency_code: Mapped[str | None] = mapped_column(String(10), ForeignKey("competencies.code"))
    level_code: Mapped[str] = mapped_column(String(10))  # L1..L6
    mentor_id: Mapped[uuid.UUID | None] = mapped_column(UUID, ForeignKey("users.id"))
    published_at: Mapped[datetime | None]
    superseded_by_unit_id: Mapped[uuid.UUID | None] = mapped_column(UUID, ForeignKey("learning_units.id"))
    estimated_duration_seconds: Mapped[int | None]
    created_at: Mapped[datetime] = mapped_column(default=func.now())
    updated_at: Mapped[datetime] = mapped_column(default=func.now(), onupdate=func.now())

    blocks: Mapped[list["UnitBlock"]] = relationship(order_by="UnitBlock.position", cascade="all, delete-orphan")

class UnitBlock(Base):
    __tablename__ = "unit_blocks"
    id: Mapped[uuid.UUID] = mapped_column(UUID, primary_key=True, default=uuid.uuid4)
    unit_id: Mapped[uuid.UUID] = mapped_column(UUID, ForeignKey("learning_units.id", ondelete="CASCADE"))
    position: Mapped[int]
    block_type: Mapped[str]  # 'video_intro', 'video_teaching', ...
    block_id: Mapped[uuid.UUID]  # FK polimórfico
    required: Mapped[bool] = mapped_column(default=True)
    __table_args__ = (UniqueConstraint("unit_id", "position"),)
```

### Templates (VideoBlock, TextBlock, etc.)

Ver `HG_Propuesta_Learning_Units_v2.md` §5.2 · **importante:**
- `text_blocks.variant` = context|evidence|solution
- `text_blocks.citation` como JSONB pydantic
- `text_blocks.applies_to` como ARRAY(String) para pillars
- `video_blocks.video_url` guarda **YouTube video ID solo** (11 chars) · nombrar `youtube_video_id`
- `video_blocks.duration_seconds` requerido

### Quiz polimórfico (los 6 tipos)

```python
class QuizQuestion(Base):
    __tablename__ = "quiz_questions"
    id: Mapped[uuid.UUID] = mapped_column(UUID, primary_key=True, default=uuid.uuid4)
    quiz_block_id: Mapped[uuid.UUID] = mapped_column(UUID, ForeignKey("quiz_blocks.id", ondelete="CASCADE"))
    position: Mapped[int]
    question_type: Mapped[str]  # CHECK constraint IN 6 tipos
    prompt: Mapped[str]

    # Relaciones polimórficas · cada tipo apunta a su tabla hija
    options: Mapped[list["QuizOption"]] = relationship(cascade="all, delete-orphan")  # single/multiple
    true_false: Mapped[QuizTrueFalse | None] = relationship(cascade="all, delete-orphan")
    ordering_items: Mapped[list["QuizOrderingItem"]] = relationship(cascade="all, delete-orphan")
    matching_pairs: Mapped[list["QuizMatchingPair"]] = relationship(cascade="all, delete-orphan")
    fill_blank_answers: Mapped[list["QuizFillBlankAnswer"]] = relationship(cascade="all, delete-orphan")
    multiple_choice_config: Mapped[QuizMultipleChoiceConfig | None] = relationship(cascade="all, delete-orphan")
```

### Attempts + progress

```python
class LearningUnitAttempt(Base):
    __tablename__ = "learning_unit_attempts"
    # ... schema del §5.2
    # unique (user_id, unit_id) · replay overwritea
    # org_id incluido para RLS

class BlockProgress(Base):
    __tablename__ = "block_progress"
    # status enum: 'started', 'completed'
```

### Criterios
- [ ] 15+ models definidos
- [ ] Relaciones polimórficas configuradas
- [ ] `mypy` limpio (opcional pero deseable)
- [ ] Commit: `feat(learning-units): SQLAlchemy models + polymorphic quiz types`

---

## TASK A-03 · Pydantic schemas + discriminated unions · `[ ]`

Archivo: `apps/backend/src/hg/modules/learning_units/schemas.py`

### Read schemas polimórficos

```python
from typing import Literal, Union
from pydantic import BaseModel, Field

# Base
class BlockRead(BaseModel):
    id: UUID
    position: int
    required: bool
    block_type: str

class VideoBlockRead(BlockRead):
    block_type: Literal["video_intro", "video_teaching", "video_closing"]
    youtube_video_id: str
    poster_url: str | None
    duration_seconds: int
    subtitle_url: str | None
    transcript_text: str | None
    eyebrow_label: str | None

class TextBlockRead(BlockRead):
    block_type: Literal["text_context", "text_evidence", "text_solution"]
    variant: Literal["context", "evidence", "solution"]
    eyebrow: str
    body: str
    citation: dict | None
    applies_to: list[str] | None
    requires_evidence_block_id: UUID | None

# Quiz polimórfico
class QuizOption(BaseModel):
    id: UUID
    position: int
    text: str
    is_correct: bool
    explanation: str

class QuizQuestionSingleChoice(BaseModel):
    id: UUID
    position: int
    question_type: Literal["single_choice"]
    prompt: str
    options: list[QuizOption]

class QuizQuestionMultipleChoice(BaseModel):
    id: UUID
    position: int
    question_type: Literal["multiple_choice"]
    prompt: str
    options: list[QuizOption]
    scoring: Literal["all_or_nothing", "partial"]

class QuizQuestionTrueFalse(BaseModel):
    id: UUID
    position: int
    question_type: Literal["true_false"]
    prompt: str
    # correct_answer NO se expone al consumer (solo al submit response)
    # explanations vienen en el feedback post-submit

class QuizQuestionOrdering(BaseModel):
    id: UUID
    position: int
    question_type: Literal["ordering"]
    prompt: str
    items: list[dict]  # {id, text} · sin correct_position

class QuizQuestionMatching(BaseModel):
    id: UUID
    position: int
    question_type: Literal["matching"]
    prompt: str
    left_items: list[dict]  # {id, text} · shuffled
    right_items: list[dict]  # {id, text} · shuffled

class QuizQuestionFillBlank(BaseModel):
    id: UUID
    position: int
    question_type: Literal["fill_blank"]
    prompt: str  # contiene {{blank}} para placeholders
    blanks_count: int

QuizQuestionUnion = Union[
    QuizQuestionSingleChoice,
    QuizQuestionMultipleChoice,
    QuizQuestionTrueFalse,
    QuizQuestionOrdering,
    QuizQuestionMatching,
    QuizQuestionFillBlank,
]

class QuizBlockRead(BlockRead):
    block_type: Literal["quiz_recall"]
    eyebrow: str
    questions: list[QuizQuestionUnion] = Field(discriminator="question_type")

class ReflectionBlockRead(BlockRead):
    block_type: Literal["reflection_write"]
    eyebrow: str
    prompt: str
    min_chars: int
    max_chars: int
    example: str | None

BlockUnion = Union[VideoBlockRead, TextBlockRead, QuizBlockRead, ReflectionBlockRead]

class LearningUnitDetail(BaseModel):
    id: UUID
    slug: str
    title: str
    pillar_code: str
    competency_code: str | None
    level_code: str
    mentor_id: UUID | None
    published_at: datetime
    estimated_duration_seconds: int | None
    blocks: list[BlockUnion] = Field(discriminator="block_type")

class LearningUnitFeedItem(BaseModel):
    id: UUID
    slug: str
    title: str
    pillar_code: str
    level_code: str
    estimated_duration_seconds: int | None
    blocks_count: int
    attempt_status: Literal["not_started", "in_progress", "completed"] | None
    poster_url: str | None  # del primer video_block si existe
```

### Submit schemas

```python
class QuizSubmitPayload(BaseModel):
    question_id: UUID
    # Por tipo:
    selected_option_ids: list[UUID] | None  # single/multiple
    boolean_answer: bool | None  # true_false
    ordering: list[UUID] | None  # ordering (array de item IDs en el orden respondido)
    matching: list[tuple[UUID, UUID]] | None  # matching (pares (left_id, right_id))
    fill_blank_answers: list[str] | None  # fill_blank

class QuizSubmitResult(BaseModel):
    question_id: UUID
    is_correct: bool
    explanation: str | None  # feedback inmediato del testing effect
    correct_answer: dict | None  # revelar tras responder
```

### Criterios
- [ ] Discriminated unions funcionan con pydantic v2
- [ ] Schemas tienen from_attributes = True
- [ ] Serialization test unitario para cada tipo de quiz
- [ ] Commit: `feat(learning-units): pydantic schemas with discriminated unions`

---

## TASK A-04 · Router endpoints consumer · feed + detail + attempts · `[ ]`

Archivo: `apps/backend/src/hg/modules/learning_units/router.py`

### Endpoints públicos (auth: user)

```python
GET  /api/v1/modulos/feed
     → LearningUnitFeedItem[] · limit=20 · unit del día + próximas de la ruta activa del user

GET  /api/v1/modulos/{slug}
     → LearningUnitDetail · todos los blocks incluidos

POST /api/v1/modulos/{slug}/attempts/start
     → LearningUnitAttempt · idempotente (retorna existing si ya empezó)

POST /api/v1/modulos/{slug}/blocks/{block_id}/complete
     → BlockProgress · marca started/completed según block_type

POST /api/v1/modulos/{slug}/blocks/{block_id}/quiz/submit
     Body: list[QuizSubmitPayload]
     → list[QuizSubmitResult] · calcula is_correct por question, guarda QuizResponse, retorna feedback

POST /api/v1/modulos/{slug}/blocks/{block_id}/reflection/submit
     Body: { text: str }
     → { ok: true } · valida min/max chars · guarda ReflectionText

GET  /api/v1/modulos/{slug}/attempt
     → LearningUnitAttempt del user actual con block_progress[]
```

### Reglas de completion

- Unit completa cuando **todos los blocks required=true tienen block_progress.status='completed'**
- Al completar el último required, setear `learning_unit_attempts.completed_at = now()`
- Replays: si user ya tiene `completed_at IS NOT NULL` y empieza de nuevo, resetear a `NULL` y limpiar block_progress + quiz_responses del attempt (misma row · reuse ID)

### Selección del "unit del día"

Algoritmo simple para MVP:
1. Si user tiene un `attempt` in_progress, ese es el "hoy"
2. Sino, siguiente unit del enrollment activo con menor pillar_score (o el pillar con más lag)
3. Fallback: unit random del pillar más rezagado

Deferrable a Fase 2 · MVP puede usar solo (1) + (3).

### Criterios
- [ ] 7 endpoints funcionales con OpenAPI schema válido
- [ ] Tests unitarios para completion logic
- [ ] Tests para replay (reset attempt)
- [ ] Cobertura ≥85%
- [ ] Commit: `feat(learning-units): consumer endpoints (feed, detail, attempts, quiz/reflection submit)`

---

## TASK A-05 · CMS API endpoints admin · superadmin CRUD · `[ ]`

Archivo: `apps/backend/src/hg/modules/learning_units/admin_router.py`

Todos con `SuperadminGate`.

```python
POST   /api/v1/admin/learning-units
       Body: { slug, title, pillar_code, level_code, ...meta }
       → LearningUnitDetail (con blocks vacío inicial)

PATCH  /api/v1/admin/learning-units/{id}
       Body: meta fields
       → LearningUnitDetail

POST   /api/v1/admin/learning-units/{id}/publish
       Validaciones:
         - Slug único
         - ≥1 video_block
         - ≥1 text_evidence con citation.doi_or_url no vacío
         - ≥1 text_solution con requires_evidence_block_id apuntando a un evidence de la misma unit
         - ≥1 quiz_recall o reflection_write con required=True
         - Cada quiz_question tiene explanation en cada option
       Si falla: 422 con lista errores. Si pasa: setea published_at=now()

POST   /api/v1/admin/learning-units/{id}/unpublish

DELETE /api/v1/admin/learning-units/{id}
       Solo si published_at IS NULL (draft). Si published, primero hacer unpublish

# Bloques
POST   /api/v1/admin/learning-units/{id}/blocks
       Body: { position, block_type, required, ...template_fields }
       → BlockUnion · crea el template + unit_blocks row

PATCH  /api/v1/admin/blocks/{block_type}/{block_id}
       Editar template

DELETE /api/v1/admin/blocks/{block_id}
       Elimina unit_blocks row + cascade al template

POST   /api/v1/admin/learning-units/{id}/blocks/reorder
       Body: [block_id1, block_id2, ...] en el nuevo orden
       → Update positions
```

### Criterios
- [ ] 8 endpoints admin funcionales
- [ ] `SuperadminGate` bloquea a no-superadmin (403)
- [ ] Validaciones publish devuelven mensajes útiles
- [ ] Tests unitarios de validación publish
- [ ] Commit: `feat(learning-units): admin CMS API endpoints with publish validation`

---

## TASK A-06 · YouTube helper + validation · `[ ]`

Archivo: `apps/backend/src/hg/modules/learning_units/youtube.py`

```python
import re
from urllib.parse import urlparse, parse_qs

YOUTUBE_ID_REGEX = re.compile(r"^[a-zA-Z0-9_-]{11}$")

def extract_youtube_video_id(url_or_id: str) -> str:
    """Acepta URL de YouTube o video ID directo. Retorna 11-char video ID."""
    if YOUTUBE_ID_REGEX.match(url_or_id):
        return url_or_id

    parsed = urlparse(url_or_id)
    if "youtube.com" in parsed.netloc:
        # youtube.com/watch?v=XXX
        q = parse_qs(parsed.query)
        if "v" in q:
            vid = q["v"][0]
            if YOUTUBE_ID_REGEX.match(vid):
                return vid
        # youtube.com/embed/XXX o /shorts/XXX
        parts = parsed.path.strip("/").split("/")
        if len(parts) >= 2 and parts[-1]:
            if YOUTUBE_ID_REGEX.match(parts[-1]):
                return parts[-1]
    elif "youtu.be" in parsed.netloc:
        # youtu.be/XXX
        vid = parsed.path.strip("/")
        if YOUTUBE_ID_REGEX.match(vid):
            return vid

    raise ValueError(f"No es una URL/ID de YouTube válido: {url_or_id}")

def youtube_thumbnail_url(video_id: str, quality: str = "hqdefault") -> str:
    """Retorna URL del thumbnail default de YouTube."""
    return f"https://i.ytimg.com/vi/{video_id}/{quality}.jpg"
```

Usar en `admin_router.py` cuando el POST/PATCH de video_block recibe `youtube_video_id`:
- Aceptar URL completa o ID
- Extract + validar formato antes de guardar
- Auto-populate `poster_url` con thumbnail si no viene explícito

### Criterios
- [ ] Tests unitarios con URLs válidas + inválidas
- [ ] Cobertura casos: watch, embed, shorts, youtu.be, ID directo
- [ ] Commit: `feat(learning-units): YouTube URL parser + thumbnail helper`

---

## TASK A-07 · Migration events · sumar `event_type` + campos · `[ ]`

Ya cubierto parcialmente en A-01, pero refinar:

- `events.event_type` CHECK IN ('live_webinar', 'recorded_webinar', 'masterclass_live', 'masterclass_replay')
- `events.is_preview` default true para los courses migrados
- `events.scheduled_at` NULL para replays
- Nuevo campo `events.presenter_id` (FK users) · nullable

Actualizar `apps/backend/src/hg/modules/learning/models.py` para renombrar `Course` → `Event` en el ORM (sin romper referencias en el resto del código).

**Crítico:** grep en backend por `Course` / `course_id` y actualizar refs (schemas, routes, services que apunten a la tabla renombrada). Enrollments siguen apuntando a `career_paths` no a events.

### Criterios
- [ ] `class Event(Base)` reemplaza `class Course(Base)`
- [ ] Grep `Course` en `apps/backend/src/hg/` limpio (0 matches fuera de tests migrados)
- [ ] Tests backend siguen verdes
- [ ] Commit: `refactor(events): rename Course model + schema updates`

---

## TASK A-08 · Endpoints events (heredados) + rename routes · `[ ]`

- Renombrar `/api/v1/courses/*` → `/api/v1/events/*` con **redirect 308** en el router (por si hay clientes viejos)
- Wire con el nuevo `event_type` filter
- **NO agregar features nuevas** de live/streaming en esta fase · solo rename

### Criterios
- [ ] Endpoints `/api/v1/events/*` funcionales
- [ ] Redirect 308 `/api/v1/courses/*` → `/api/v1/events/*` durante 1 sprint
- [ ] Tests actualizados
- [ ] Commit: `refactor(events): rename API routes courses→events with redirect`

---

## TASK A-09 · Seed 3 units con placeholder de coach · `[ ]`

Archivo: `apps/backend/scripts/seed_learning_units.py`

Crear 3 units publicadas · una por pilar principal (P1 Carrera · P3 Relaciones · P4 Salud) con estructura variada para testing:

### Unit 1 · P1 Carrera · Composición A (clásica 7 bloques)

```
Slug: p1-c3-l2-001-onboarding-remoto-placeholder
Title: "[COPY PENDIENTE · coach] Onboarding remoto sin silencio"
Blocks:
  1. video_intro (youtube_video_id: "dQw4w9WgXcQ" · placeholder)
  2. text_context · eyebrow="SITUACIÓN" · body="[COPY PENDIENTE · coach] Cuando entrás a un canal nuevo..."
  3. video_teaching · duration_seconds=30
  4. text_evidence · citation={text: "[COPY PENDIENTE · Edmondson 1999]", ...}
  5. text_solution · requires_evidence_block_id → bloque 4
  6. quiz_recall · 2 preguntas single_choice con placeholder
  7. video_closing · duration_seconds=10
```

### Unit 2 · P3 Relaciones · Composición C (reflexión 5 bloques)

```
Slug: p3-c4-l3-001-feedback-directo-placeholder
Blocks:
  1. video_intro
  2. text_context
  3. video_teaching
  4. text_evidence
  5. reflection_write · min_chars=30 · max_chars=500 · example="[COPY PENDIENTE]"
```

### Unit 3 · P4 Salud · Con quiz variado (multiple_choice + true_false)

```
Slug: p4-c2-l1-001-micro-descansos-placeholder
Blocks:
  1. video_intro
  2. text_evidence · Sianoja 2018 placeholder
  3. text_solution
  4. quiz_recall · 1 pregunta multiple_choice + 1 true_false
```

Todos los video_id: usar placeholders de YouTube (videos públicos short-form permitidos: "dQw4w9WgXcQ" es placeholder canónico). Andrés reemplaza con videos reales post-merge.

### Idempotencia

Script chequea `SELECT slug FROM learning_units WHERE slug=...` antes de insert · si existe, hace UPDATE.

### Criterios
- [ ] 3 units publicadas post-seed
- [ ] Corre 2x sin duplicar
- [ ] Placeholders visibles con `[COPY PENDIENTE · coach]` en frontend
- [ ] Commit: `chore(learning-units): seed 3 units with placeholder content`

---

## TASK A-10 · Tests backend + smoke · `[ ]`

- Tests unitarios para todos los endpoints
- Test integración: create unit → add blocks → publish → user starts attempt → completes blocks → completes unit
- Cobertura ≥85%
- Smoke manual con Bruno/Postman collection: `docs/api/learning_units.bruno` con 15 requests templados

### Criterios
- [ ] Tests verdes
- [ ] Cobertura backend ≥85%
- [ ] Collection Bruno con 15 requests
- [ ] Commit: `test(learning-units): backend tests + Bruno collection`

---

# 🎯 Fin de FASE A · Criterios de merge PR-A

- [ ] 10 TASKs commiteadas
- [ ] Migration corre limpia local + preserva data
- [ ] 15+ models · 20+ schemas
- [ ] 7 endpoints consumer + 8 endpoints admin funcionales
- [ ] 3 units seed publicadas con placeholders
- [ ] Tests ≥85% cobertura
- [ ] PR-A abierto contra `main`

---

# FASE B · Frontend Módulos (10 TASKs · ~24-30h)

Rama: `feat/learning-units-frontend` (post PR-A merged)

## TASK B-01 · Sidebar rework · 5 tabs + drawer "Más" con Eventos · `[ ]`

Archivo: `apps/frontend/src/components/nav/SideNav.tsx` + `BottomNav.tsx`

### B.1.1 · SIDE_NAV_ITEMS actualizado

```ts
export const SIDE_NAV_ITEMS: NavItem[] = [
  { href: "/home", label: "Inicio", icon: Home },
  { href: "/path", label: "Mi Ruta", icon: RouteIcon },
  { href: "/modulos", label: "Módulos", icon: Sparkles },
  { href: "/perfil", label: "Mi Perfil", icon: User },
  { href: "/team", label: "Mi equipo", icon: Users, roles: ["manager", "admin", "superadmin"] },
];

export const MORE_NAV_ITEMS: NavItem[] = [
  { href: "/eventos", label: "Eventos (live)", icon: Calendar },
  { href: "/perfil/editar", label: "Editar mi info", icon: Settings },
  { href: "/admin/org", label: "Modo admin", icon: ShieldCheck, roles: ["admin", "superadmin"] },
  // Logout separado abajo con divider
];
```

### B.1.2 · BottomNav mobile drawer

Mantener 4 items primarios + "Más" (hamburger icon). Al tap "Más" → drawer lateral con `MORE_NAV_ITEMS` filtered por rol.

### B.1.3 · Rename `/library` → `/eventos`

Reglas:
- `next.config.mjs` sumar redirect 308: `/library` → `/eventos` y `/library/:slug` → `/eventos/:slug`
- Mover `app/(app)/library/` → `app/(app)/eventos/`
- Grep `/library` en el frontend y actualizar refs
- Labels: "Biblioteca" → "Eventos" en cualquier lugar visible

### Criterios
- [ ] Sidebar renderiza 5 primary + drawer "Más" con Eventos
- [ ] Mobile bottom nav 4 + "Más"
- [ ] `/library/*` redirects a `/eventos/*`
- [ ] Cero refs a "Biblioteca" en UI
- [ ] Commit: `refactor(app): sidebar 5 tabs + drawer Más · rename library→eventos`

---

## TASK B-02 · Types + API client · `[ ]`

Archivo: `apps/frontend/src/lib/api/modulos.ts` + `src/lib/types/modulos.ts`

Traducir schemas pydantic a TypeScript · usar discriminated unions:

```ts
export type VideoBlock = { block_type: "video_intro" | "video_teaching" | "video_closing"; ... };
export type TextBlock = { block_type: "text_context" | "text_evidence" | "text_solution"; variant: "context" | "evidence" | "solution"; ... };
export type QuizQuestionSingleChoice = { question_type: "single_choice"; ... };
// ... 6 tipos de quiz
export type QuizBlock = { block_type: "quiz_recall"; questions: (QuizQuestionSingleChoice | ...)[] };
export type ReflectionBlock = { block_type: "reflection_write"; ... };
export type Block = VideoBlock | TextBlock | QuizBlock | ReflectionBlock;

export type LearningUnitDetail = { blocks: Block[]; ... };
```

API client:
```ts
export async function apiGetModulosFeed(): Promise<LearningUnitFeedItem[]>;
export async function apiGetModulo(slug: string): Promise<LearningUnitDetail>;
export async function apiStartAttempt(slug: string): Promise<LearningUnitAttempt>;
export async function apiCompleteBlock(slug: string, blockId: string): Promise<BlockProgress>;
export async function apiSubmitQuiz(slug: string, blockId: string, payloads: QuizSubmitPayload[]): Promise<QuizSubmitResult[]>;
export async function apiSubmitReflection(slug: string, blockId: string, text: string): Promise<void>;
export async function apiGetAttempt(slug: string): Promise<LearningUnitAttempt>;
```

### Criterios
- [ ] Types match backend schemas
- [ ] Client con manejo de errores (ApiError)
- [ ] Commit: `feat(modulos): TypeScript types + API client`

---

## TASK B-03 · Página `/modulos` feed + hero card · `[ ]`

Archivo: `apps/frontend/src/app/(app)/modulos/page.tsx`

### Layout

**Mobile:**
```
Hero card grande "TU MÓDULO DE HOY"
├── pillar color band
├── title
├── duration · pillar · level · N pasos
└── [ Empezar ]

Streak badge

"Próximos en tu ruta"
└── UnitCardCompact × 3-5

[ Explorar catálogo ]
```

**Desktop (3 columnas):**
- Nav izq · Feed central 720px · Aside derecho con streak + próximo milestone + explorar catálogo

### Componentes

- `<UnitCardHero unit={feed.hero} />` en `src/components/modulos/UnitCardHero.tsx`
- `<UnitCardCompact unit={feed.next} />` en `src/components/modulos/UnitCardCompact.tsx`

### Fetch

- Server component consulta `apiGetModulosFeed()` en render
- Cache: `revalidate: 60` para el feed

### Criterios
- [ ] Feed renderiza hero + próximas (mobile + desktop)
- [ ] Empty state si no hay units
- [ ] Commit: `feat(modulos): feed page with hero + compact cards`

---

## TASK B-04 · `<UnitStoriesPlayer/>` mobile · progress bars + tap navigation · `[ ]`

Archivo: `apps/frontend/src/components/modulos/UnitStoriesPlayer.tsx`

### API

```tsx
<UnitStoriesPlayer unit={unit} attempt={attempt} onComplete={() => router.push("/modulos")} />
```

### UX detallada

- **Fullscreen** (`fixed inset-0 z-50 bg-bg`)
- **Header:** 
  - Progress bars top segmentadas (una por block) · llenan según `block_progress.status`
  - Botón `X` cierra a `/modulos`
- **Body:** card centrada por bloque · usa `<BlockRenderer block={currentBlock}/>`
- **Footer:** hint "Tocá para avanzar" primera vez
- **Interacciones:**
  - Tap right side of screen → next block
  - Tap left side → previous block
  - Swipe down → cerrar (con confirmación si hay progreso)
  - Long-press durante video → pausar auto-advance
- **Bloqueantes:**
  - `quiz_recall` required → no avanza sin responder todas las preguntas
  - `reflection_write` required → no avanza sin enviar texto válido
  - `video_teaching` required → no avanza hasta watched ≥ 80% o video terminó
- **Al terminar último bloque:** mostrar `<UnitCompletionCard/>`

### State

- `currentBlockIndex` local
- `blockProgress[]` sync con server via `apiCompleteBlock` al pasar bloque
- Auto-advance en videos con toggle preference (default off para >30s videos, on para <30s)

### Reduced motion

Sin auto-advance, sin swipe animations · usar `useShouldAnimate` hook existente.

### Criterios
- [ ] Fullscreen mobile funcional
- [ ] Progress bars sync con block_progress
- [ ] Tap navigation left/right
- [ ] Swipe down cierra
- [ ] Reduced motion respetado
- [ ] Commit: `feat(modulos): UnitStoriesPlayer mobile with tap navigation`

---

## TASK B-05 · `<UnitBackToBackPlayer/>` desktop + focus mode · `[ ]`

Archivo: `apps/frontend/src/components/modulos/UnitBackToBackPlayer.tsx`

### Layout desktop

```
┌─────────────────────────────────────────┐
│ Progress bar horizontal segmentado top  │
├──────────────────────┬──────────────────┤
│                      │ Índice vertical  │
│   Bloque activo      │ ├── ✓ Video      │
│   grande (60% width) │ ├── ✓ Contexto   │
│                      │ ├── ● Video (active) │
│                      │ ├── ○ Evidencia  │
│                      │ ├── ○ Quiz       │
│                      │ └── ○ Reflexión  │
│                      │                  │
├──────────────────────┴──────────────────┤
│ [← Anterior]     [Siguiente →]           │
└─────────────────────────────────────────┘
```

### Interacciones

- Botones `Anterior` / `Siguiente` en footer
- Keyboard: `←/→` para navegar · `Espacio` toggle play video · `F` focus mode
- Click en índice para jump (solo a bloques completed o siguiente inmediato)
- **Focus mode (F):** oculta sidebars app + índice + progress top · deja solo bloque activo centrado

### Same rules as mobile

- `quiz_recall` bloqueante · `reflection_write` bloqueante · videos required exigen 80% watch

### Layout switcher

En `/modulos/[slug]/page.tsx`:

```tsx
"use client";
import { useMediaQuery } from "@/lib/hooks/useMediaQuery";

export default function ModuloPage({ unit, attempt }) {
  const isMobile = useMediaQuery("(max-width: 768px)");
  return isMobile
    ? <UnitStoriesPlayer unit={unit} attempt={attempt} />
    : <UnitBackToBackPlayer unit={unit} attempt={attempt} />;
}
```

### Criterios
- [ ] Layout 2 columnas desktop
- [ ] Keyboard shortcuts
- [ ] Focus mode (F)
- [ ] Click índice funcional
- [ ] Commit: `feat(modulos): UnitBackToBackPlayer desktop + focus mode`

---

## TASK B-06 · `<BlockRenderer/>` polimórfico con 4 sub-vistas + 6 tipos quiz · `[ ]`

Archivo: `apps/frontend/src/components/modulos/BlockRenderer.tsx`

Router polimórfico:

```tsx
export function BlockRenderer({ block, ...handlers }: BlockRendererProps) {
  switch (block.block_type) {
    case "video_intro":
    case "video_teaching":
    case "video_closing":
      return <VideoBlockView block={block} {...handlers} />;
    case "text_context":
    case "text_evidence":
    case "text_solution":
      return <TextBlockView block={block} {...handlers} />;
    case "quiz_recall":
      return <QuizBlockView block={block} {...handlers} />;
    case "reflection_write":
      return <ReflectionBlockView block={block} {...handlers} />;
  }
}
```

### VideoBlockView (YouTube embed)

Archivo: `src/components/modulos/blocks/VideoBlockView.tsx`

```tsx
<YouTubePlayer videoId={block.youtube_video_id} onProgress={onProgress} onEnded={onEnded} />
```

Usar `<iframe src="https://www.youtube.com/embed/{videoId}?enablejsapi=1&modestbranding=1&rel=0" />` + `postMessage` API para trackear progress. Alternativa: sumar dep `react-youtube` (~10KB) si el JSAPI directo es complejo. **Consultar con Andrés antes de instalar.**

**MVP acceptable:** iframe simple sin progress tracking granular · marcar block como completed on click "Ya lo vi" manual (siguiente iteración: auto-tracking via JSAPI).

### QuizBlockView

Router interno por `question_type`:

```tsx
{block.questions.map((q) => {
  switch (q.question_type) {
    case "single_choice": return <QuizSingleChoice question={q} />;
    case "multiple_choice": return <QuizMultipleChoice question={q} />;
    case "true_false": return <QuizTrueFalse question={q} />;
    case "ordering": return <QuizOrdering question={q} />;
    case "matching": return <QuizMatching question={q} />;
    case "fill_blank": return <QuizFillBlank question={q} />;
  }
})}
```

6 sub-componentes en `src/components/modulos/blocks/quiz/`:
- `QuizSingleChoice.tsx`: radio buttons con feedback post-submit
- `QuizMultipleChoice.tsx`: checkboxes
- `QuizTrueFalse.tsx`: 2 botones grandes Verdadero/Falso
- `QuizOrdering.tsx`: drag-and-drop con `@dnd-kit/sortable` (ya está instalado? verificar; sino usar list buttons up/down)
- `QuizMatching.tsx`: 2 columnas · drag desde izq a der (o click-to-select-pair)
- `QuizFillBlank.tsx`: prompt con `<input/>` en posición de `{{blank}}`

Al submit: llamar `apiSubmitQuiz` · mostrar feedback (verde/rojo por opción + explanation).

### TextBlockView

Simple render de eyebrow + body + citation (si evidence) · botón "Siguiente" completa el block automáticamente (mark started + completed after 3s visible).

### ReflectionBlockView

Textarea con min/max chars counter · botón submit cuando ≥ min_chars.

### Criterios
- [ ] 4 sub-vistas + 6 sub-componentes quiz
- [ ] YouTube embed funcional (marca completed manual OK para MVP)
- [ ] Drag-and-drop en ordering (o alternativa buttons)
- [ ] Matching con click-pair fallback
- [ ] Fill blank con inputs
- [ ] Feedback post-quiz con explanations
- [ ] Commit: `feat(modulos): BlockRenderer polymorphic + 4 subviews + 6 quiz types`

---

## TASK B-07 · `<UnitCompletionCard/>` + refetch related · `[ ]`

Archivo: `apps/frontend/src/components/modulos/UnitCompletionCard.tsx`

Card mostrada al completar la unit:

- ✓ "Módulo completado"
- Micro-animación de check en pillar color band (usar framer-motion)
- Resumen: N/N pasos · X min · Y correct answers (si hubo quiz)
- CTA "Siguiente módulo" (link a `/modulos`) + "Volver a Módulos"

**NO auto-play próximo · consciente P5 desirable difficulties**

Al render: llamar `apiGetModulosFeed()` para invalidar cache y actualizar el próximo módulo del `/home` (via SWR mutate o Next router.refresh).

### Criterios
- [ ] Card con check + resumen + CTAs
- [ ] Refetch feed post-completion
- [ ] Commit: `feat(modulos): UnitCompletionCard`

---

## TASK B-08 · Wire y flow completo `/modulos/[slug]` · `[ ]`

Archivo: `apps/frontend/src/app/(app)/modulos/[slug]/page.tsx`

Server component:
1. Fetch unit detail
2. Fetch existing attempt (o crear si no existe)
3. Render StoriesPlayer o BackToBackPlayer según viewport

Client wrapper para manejar navigation + state.

### Criterios
- [ ] Página funcional end-to-end mobile + desktop
- [ ] Attempt creado on-first-visit
- [ ] Progress persistido server-side
- [ ] Commit: `feat(modulos): wire /modulos/[slug] complete flow`

---

## TASK B-09 · `/eventos` redirect + player heredado · `[ ]`

- `/eventos` = catálogo actual (era `/library`)
- `/eventos/[slug]` = player HLS actual (era `/library/[slug]`)
- Sin features nuevas · solo rename semántico + copy

Grep en el frontend:
- `curso` / `Curso` en `/eventos/*` → `evento` / `Evento`
- Titles pages
- Sidebar breadcrumbs

### Criterios
- [ ] `/eventos` accesible desde drawer "Más"
- [ ] Player heredado funcional
- [ ] Cero "curso" en UI de eventos
- [ ] Commit: `refactor(eventos): rename UI courses→eventos + preserve player`

---

## TASK B-10 · Tests + screenshots + a11y · `[ ]`

### Tests

- Unit test `BlockRenderer` con cada tipo de block
- Unit test cada quiz type con submit + feedback
- Test de `UnitStoriesPlayer` navigation (mocked useMediaQuery)
- Test de completion flow (all required blocks done → CompletionCard)

### Smoke manual

Login collab1 (con enrollment en P1):
- `/modulos`: feed con hero + próximas
- Click módulo → `/modulos/[slug]` → stories player mobile
- Ver video → next block texto → answer quiz → siguiente → completion
- Verificar que en `/home` aparece el próximo módulo

Desktop:
- Layout 2 columnas
- Keyboard nav ←/→
- Focus mode F

### Screenshots

```
docs/screenshots/learning-units-fase1/
├── 01-sidebar-5-tabs.png
├── 02-drawer-mas-with-eventos.png
├── 03-modulos-feed-hero.png
├── 04-modulos-feed-mobile.png
├── 05-stories-player-video-block.png
├── 06-stories-player-quiz-single.png
├── 07-stories-player-quiz-matching.png
├── 08-stories-player-reflection.png
├── 09-back-to-back-desktop.png
├── 10-focus-mode-desktop.png
├── 11-completion-card.png
├── 12-eventos-renamed.png
```

### A11y

- Screen reader: verificar que cada block se anuncia correctamente
- Keyboard nav completa en stories player (Tab + Enter + Esc)
- Focus visible en botones quiz

### Criterios
- [ ] Tests verdes
- [ ] 12 screenshots
- [ ] A11y verificado (axe-core sin errors)
- [ ] Commit: `test(modulos): tests + 12 screenshots + a11y verification`

---

# 🎯 Fin de FASE B · Criterios de merge PR-B

- [ ] 10 TASKs commiteadas
- [ ] Sidebar 5 tabs + drawer "Más"
- [ ] `/modulos` feed + `/modulos/[slug]` player
- [ ] StoriesPlayer mobile + BackToBackPlayer desktop
- [ ] 4 tipos block + 6 tipos quiz renderizados
- [ ] YouTube embed funcional (marca manual OK)
- [ ] `/eventos` funcional post-rename
- [ ] Tests + 12 screenshots + a11y
- [ ] PR-B abierto contra `main`

---

# 📤 Entrega final Fase 1

**PR-A** (backend):
- SHA + URL
- 3 units seed publicadas
- Bruno collection en `docs/api/learning_units.bruno`
- Migration verified up/down

**PR-B** (frontend):
- SHA + URL
- 12 screenshots
- Video corto (bonus) del flow completo mobile

**Docs entregables:**
- README sección "Learning Units" en `apps/backend/README.md` con endpoints principales
- Guía "Cómo crear una unit via API" en `docs/learning-units/create-unit-via-api.md`

**Pendiente Andrés post-merge:**
- Reemplazar YouTube video IDs placeholder por videos reales
- Editar copy `[COPY PENDIENTE · coach]` de las 3 units seed
- Definir 1-2 units reales para producción con contenido validado

---

# 🔴 Fuera de scope · defer a Fase 2+

- CMS admin UI (`/admin/perspectivas` estilo para modulos) → Fase 2
- Live streaming embed en /eventos → Fase 3
- Marketing radar refactor si aplica → Fase separada
- Perspectivas CMS (prompt separado) → después de LU Fase 1
- Manager view con métricas agregadas de módulos → Fase 4

---

# Status por TASK

## Fase A · Backend
| ID | Subject | Status |
|---|---|---|
| A-01 | Migration rename + 12 tablas | `[x]` |
| A-02 | SQLAlchemy models polimórficos | `[ ]` |
| A-03 | Pydantic schemas discriminated unions | `[ ]` |
| A-04 | Endpoints consumer | `[ ]` |
| A-05 | Endpoints admin CMS | `[ ]` |
| A-06 | YouTube helper | `[ ]` |
| A-07 | Migration events + Course→Event refactor | `[ ]` |
| A-08 | Endpoints events (rename) | `[ ]` |
| A-09 | Seed 3 units placeholder | `[ ]` |
| A-10 | Tests + Bruno collection | `[ ]` |

## Fase B · Frontend
| ID | Subject | Status |
|---|---|---|
| B-01 | Sidebar 5 tabs + drawer Más | `[ ]` |
| B-02 | Types + API client | `[ ]` |
| B-03 | /modulos feed | `[ ]` |
| B-04 | UnitStoriesPlayer mobile | `[ ]` |
| B-05 | UnitBackToBackPlayer desktop | `[ ]` |
| B-06 | BlockRenderer + 6 quiz types | `[ ]` |
| B-07 | UnitCompletionCard | `[ ]` |
| B-08 | Wire /modulos/[slug] | `[ ]` |
| B-09 | /eventos rename | `[ ]` |
| B-10 | Tests + screenshots + a11y | `[ ]` |
