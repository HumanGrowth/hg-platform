# Prompt Claude Code · Learning Units v2 · Refinements post PR-A/B

> **Modo recomendado:** `/effort high` con **Claude Opus 4.8**.
> Fixes críticos post merge Fase 1: video source DB en vez de YouTube · `/path` conecta learning_units · seed con contenido real de `HG/1.Product/5. Videos Final Version/`. **12 TASKs · ~14-18h · 1 PR**.
> Base: `main` con PR #21 (backend LU) + PR #22 (frontend LU) mergeados.
> Rama: `feat/learning-units-refinements`.

---

## ⚙️ Resume protocol

1. Releé este prompt.
2. Releé:
   - `HG/1.Product/5. Videos Final Version/HG-P1-L1-001.json` (estructura de unit real oficial)
   - `HG/Docs/HG_Guia_Diseno_Modulos_Templates.md` (reglas de templates)
3. `git status && git log --oneline -10 && cd apps/backend && uv run pytest 2>&1 | tail -10 && cd apps/frontend && pnpm typecheck 2>&1 | tail -10`
4. Reanudá desde el primer `[ ]`.

## 🧱 Reglas duras

- Un commit por TASK · prefijos `feat(lu-refine): ...` · `fix(lu-refine): ...` · `refactor(lu-refine): ...`
- Editá ESTE archivo al avanzar
- **NO tocar assessment / marketing / motion**
- **NO instalar deps nuevas**
- **YouTube embed OUT** para units · reemplazado por `<video src>` con video_url de R2 (mismo pattern que events actuales)
- **Full screen mobile** para videos 16:9 en el player stories · mantener aspect-video en desktop
- **`/path` migra a learning_units** · deprecar `apiListCoursesForPath`
- **Contenido seed:** usar el JSON real `HG-P1-L1-001.json` + adaptar 2 más basados en misma estructura · videos usan URLs de events existentes en DB como placeholder

## 🎯 Objetivo funcional

Al terminar:
- Los video_blocks de learning_units apuntan a **video_url de R2** (no YouTube)
- Player fullscreen mobile con controls custom · aspect preservado
- `/path` muestra learning_units por pilar (no events viejos)
- Reseed con contenido real de la carpeta `HG/1.Product/5. Videos Final Version/`
- 3+ units publicadas con contenido validado por coach

## 🧠 Contexto crítico

**Archivos fuente en `HG/1.Product/5. Videos Final Version/`:**
- `HG-P1-L1-001.json` — unit "Antes de seguir" · Pilar P1 · Nivel L1 · slug `hg-p1-l1-001-antes-de-seguir`
- `CP-L1-P1-001 - VID1.mp4` — video 1 asociado a la unit
- `CP-L1-P1-002 - VID1.mp4` y `VID2.mp4` — videos de la unit siguiente (CP-L1-P1-002 = 002)

**Naming convention:**
- Unit slug: `hg-{pillar}-{level}-{seq}-{title-kebab}`
- Video files: `CP-{level}-{pillar}-{seq} - VID{n}.mp4` — múltiples videos por unit (`VID1`, `VID2`, ...)

**Estructura del JSON:** blocks incluyen `text_context`, `text_evidence`, `text_solution`, `quiz_recall`, `reflection_write`. **NO incluye video_blocks explícitos** — los videos se agregan al armar la unit apuntando a los MP4 con naming matching.

**Los MP4 no están en R2 aún.** Andrés los sube después. Mientras tanto, los seed usan `video_url` de events existentes como placeholder para probar el flow. Documentar TODO para reemplazo.

---

# PARTE A · Backend fixes (5 TASKs · ~5-6h)

## TASK lu-refine-A-01 · Migration video_blocks · youtube_video_id → video_url · `[x]`

### A.1.1 · Migration Alembic

Archivo nuevo: `apps/backend/alembic/versions/XXXX_video_blocks_use_video_url.py`

```python
def upgrade() -> None:
    # 1. Add nueva columna nullable
    op.add_column("video_blocks", sa.Column("video_url", sa.Text(), nullable=True))

    # 2. Migrar data existente · YouTube IDs → URLs
    op.execute("""
        UPDATE video_blocks
        SET video_url = CONCAT('https://www.youtube.com/embed/', youtube_video_id)
        WHERE video_url IS NULL AND youtube_video_id IS NOT NULL
    """)

    # 3. Make NOT NULL
    op.alter_column("video_blocks", "video_url", nullable=False)

    # 4. Drop old column
    op.drop_column("video_blocks", "youtube_video_id")

def downgrade() -> None:
    # Restaurar youtube_video_id extrayendo del video_url si es YouTube · sino null
    op.add_column("video_blocks", sa.Column("youtube_video_id", sa.String(11), nullable=True))
    op.execute("""
        UPDATE video_blocks
        SET youtube_video_id = SPLIT_PART(video_url, '/embed/', 2)
        WHERE video_url LIKE 'https://www.youtube.com/embed/%'
    """)
    op.drop_column("video_blocks", "video_url")
```

### A.1.2 · Testear

- `alembic upgrade head` limpio local
- Verificar que existing video_blocks (si hay) migraron OK
- `alembic downgrade -1 && alembic upgrade head` sin errores

### Criterios
- [x] Migration idempotente
- [x] Data preservada
- [x] Commit: `chore(migration): video_blocks · youtube_video_id → video_url`

**Notas de implementación:**
- Archivo: `apps/backend/migrations/versions/LU-02_video_blocks_use_video_url.py`
  (revision `b7f3a1c9d4e2`, down_revision `04c4e56f592e` — el head de LU-01).
  Sigue la convención de naming `LU-0N` ya establecida en Fase 1.
- Downgrade documentado como **best-effort, no lossless**: solo URLs que
  matchean el patrón exacto `https://www.youtube.com/embed/{11 chars}`
  pueden reconstruirse en `youtube_video_id`; cualquier URL real de R2
  agregada después del upgrade queda `NULL` en un downgrade (no hay forma
  de extraer un ID de YouTube de una URL que nunca fue de YouTube). Se
  agregó un chequeo de longitud (`length(...) = 11`) al `SPLIT_PART` del
  downgrade que el prompt no tenía, para no escribir basura si el string
  después de `/embed/` no es un ID válido de 11 caracteres.
- Verificado con datos reales: 184 `video_blocks` existentes (de la seed
  de Fase 1 + testing manual) — upgrade migró el 100% a
  `https://www.youtube.com/embed/{id}` (0 nulls), downgrade restauró el
  100% de los `youtube_video_id` originales, re-upgrade limpio. Ciclo
  completo `upgrade → downgrade -1 → upgrade head` verificado sin errores.

---

## TASK lu-refine-A-02 · Models + schemas update · `[x]`

### A.2.1 · Model

`apps/backend/src/hg/modules/learning_units/models.py`:

```python
class VideoBlock(Base):
    __tablename__ = "video_blocks"
    id: Mapped[uuid.UUID] = mapped_column(UUID, primary_key=True, default=uuid.uuid4)
    video_url: Mapped[str] = mapped_column(Text, nullable=False)   # R2 HLS URL o cualquier http(s) con MP4
    poster_url: Mapped[str | None]
    duration_seconds: Mapped[int]
    subtitle_url: Mapped[str | None]
    transcript_text: Mapped[str | None]
    eyebrow_label: Mapped[str | None]
```

### A.2.2 · Schemas

`apps/backend/src/hg/modules/learning_units/schemas.py`:

```python
class VideoBlockRead(BlockRead):
    block_type: Literal["video_intro", "video_teaching", "video_closing"]
    video_url: str
    poster_url: str | None
    duration_seconds: int
    subtitle_url: str | None
    transcript_text: str | None
    eyebrow_label: str | None

class VideoBlockCreate(BaseModel):
    video_url: str = Field(min_length=1)   # URL HTTP(S) completa
    poster_url: str | None = None
    duration_seconds: int = Field(ge=1)
    subtitle_url: str | None = None
    transcript_text: str | None = None
    eyebrow_label: str | None = None
```

### A.2.3 · Admin router

`apps/backend/src/hg/modules/learning_units/admin_router.py`:

- Remover `_parse_youtube_id_or_422` y auto-populate de thumbnail YouTube
- Aceptar `video_url` tal cual (validar que sea URL HTTP(S) con pydantic `AnyHttpUrl`)
- Poster_url ya no se auto-genera · si no viene, se queda `null`

### A.2.4 · Router consumer

Update `apps/backend/src/hg/modules/learning_units/router.py` para serializar `video_url` en el response.

### A.2.5 · Deprecar `youtube.py`

Mantener el módulo `apps/backend/src/hg/modules/learning_units/youtube.py` como legacy con nota deprecated. Sin uso activo. Se elimina en un sprint futuro.

### Criterios
- [x] Models, schemas, routers usan `video_url`
- [x] Sin refs a `youtube_video_id` en código productivo
- [x] Tests backend actualizados y verdes
- [x] Commit: `refactor(lu-refine): models + schemas + router use video_url`

**Notas de implementación:**
- `VideoBlockCreate.video_url` valida con `Field(pattern=r"^https?://")` en
  vez de `pydantic.AnyHttpUrl` que sugería el prompt — introducir
  `AnyHttpUrl` hubiera sido el único campo `*_url` de todo `schemas.py` con
  un tipo distinto a `str` (todos los demás, incluido `citation.doi_or_url`,
  son `str` plano); `AnyHttpUrl` además serializa/normaliza la URL de forma
  distinta (requiere `str(url)` antes de persistir, puede agregar barra
  final, etc.), lo que hubiera sido una inconsistencia nueva sin beneficio
  real sobre un pattern check simple.
- `admin_router.py`: se borró `_parse_youtube_id_or_422` completo (no solo
  se dejó de llamar) y el import de `youtube.py`. `poster_url` ya no se
  auto-genera en ningún path (ni create ni PATCH) — queda `null` si no
  viene explícito, tal como pide el criterio.
- `router.py` (consumer) construía `VideoBlockRead(...)` campo a campo
  (no via `from_attributes`) — tenía `youtube_video_id=content.youtube_video_id`
  hardcodeado ahí, que el grep inicial de `admin_router.py` no hubiera
  encontrado. Corregido a `video_url=content.video_url`.
- `youtube.py` se dejó con nota `.. deprecated::` en el docstring del
  módulo (no se borró, no se vació) — `test_youtube_helper.py` sigue
  pasando sin cambios porque testea el parser puro directamente, no a
  través del flujo de video blocks.
- El seed script viejo (`src/hg/scripts/seed_learning_units.py`) todavía
  usaba `youtube_video_id` en 6 lugares — se le aplicó un fix mecánico
  mínimo (mismo valor efectivo, solo el nombre del campo) para no dejar el
  commit de A-02 con `mypy`/tests rotos; TASK A-04 reemplaza este archivo
  entero con contenido real, así que este fix es explícitamente interino.
- 3 tests de `test_learning_units_admin.py` quedaban obsoletos (testeaban
  parsing/rechazo de URLs de YouTube específicamente y auto-fill de
  thumbnail — comportamiento que ya no existe): reemplazados por
  `test_create_video_block_accepts_any_https_url` (+ asserts que
  `poster_url` NO se auto-genera) y `test_create_video_block_rejects_non_url_string`.
  El tercero (`test_create_video_block_respects_explicit_poster_url`) seguía
  siendo válido — solo se renombró el campo del payload.
- Verificado: 35/35 tests de `test_learning_units_{admin,router,schemas}.py`
  + `test_quiz_grading.py` + `test_youtube_helper.py` verdes · `ruff check
  src tests` limpio · `mypy src` limpio (el único error reportado es
  preexistente en `seed_assessment.py`, no relacionado — confirmado con
  `git stash`).

---

## TASK lu-refine-A-03 · Endpoint `/modulos/by-pillar` para /path · `[x]`

`apps/backend/src/hg/modules/learning_units/router.py`:

```python
@router.get("/modulos/by-pillar")
async def list_modulos_by_pillar(
    pillar_code: str = Query(..., regex=r"^P[1-6]$"),
    level_code: str | None = Query(None, regex=r"^L[1-6]$"),
    limit: int = Query(default=10, ge=1, le=50),
    user: User = Depends(current_user),
) -> list[LearningUnitFeedItem]:
    """
    Retorna units publicadas del pilar filtrado (opcional nivel).
    Incluye attempt_status del user actual para cada unit.
    Ordenadas por level_code ASC, creation_at DESC.
    """
    # Query learning_units WHERE pillar_code=$1 AND published_at IS NOT NULL
    # Left join learning_unit_attempts para el user actual
    # Return LearningUnitFeedItem[]
```

Criterios visuales de la lista:
- Ordenar por `level_code` ASC (L1 primero, L6 último)
- Tie-break por `created_at` DESC
- Filtrar por level si viene
- Excluir units con `superseded_by_unit_id IS NOT NULL` (versión reemplazada)

### Criterios
- [x] Endpoint funcional con filtros
- [x] Attempt status por user incluido en response
- [x] Test unitario
- [x] Commit: `feat(lu-refine): /modulos/by-pillar endpoint for /path integration`

**Notas de implementación:**
- No es `async def` con `Depends(current_user)` como el sketch del prompt
  (ese nombre de dependencia no existe en este código) — sigue exactamente
  el mismo patrón sync + `Depends(get_current_user)` + `Depends(get_db)`
  que el resto de `router.py` (`get_feed`, `get_unit_detail`, etc.), para
  no introducir una firma distinta al resto del archivo.
- `regex=` del sketch → `pattern=` (Pydantic v2 en FastAPI renombró el
  parámetro de `Query`; `regex=` ya no existe en esta versión).
- Reutiliza `_feed_item()` (ya calculaba `attempt_status` + `poster_url`
  por unit para el feed) en vez de reimplementar esa lógica — el "left join
  learning_unit_attempts" del sketch ya está resuelto ahí vía
  `_get_attempt`.
- Registrado **antes** de `GET /modulos/{slug}` en el archivo — en FastAPI
  el orden de registro importa entre una ruta literal y una con path param:
  si `/modulos/{slug}` fuera declarada primero, capturaría `by-pillar` como
  si fuera un slug. Mismo patrón que ya usa `/modulos/feed`.
- Test con un helper nuevo `_make_minimal_unit()` (unit publicada sin
  bloques) en vez de reusar `_make_unit()` — este endpoint no toca contenido
  de bloques (`_feed_item` solo cuenta `len(unit.blocks)` y busca el primer
  video para el poster), así que no hace falta la estructura completa de 3
  bloques que arma `_make_unit()`. 3 tests: filtro de pilar + orden
  level ASC/created_at DESC (con 4 units, verificando índices relativos en
  la respuesta), filtro de level + exclusión de `superseded_by_unit_id`, y
  422 en un `pillar_code` inválido.
- Verificado: 3/3 tests nuevos verdes, `ruff check` limpio.

---

## TASK lu-refine-A-04 · Seed script con contenido real de la carpeta · `[x]`

Archivo: `apps/backend/scripts/seed_learning_units.py` (reemplazar el existente)

### A.4.1 · Leer JSON real

```python
import json
from pathlib import Path

REAL_UNITS_DIR = Path(__file__).parent.parent.parent.parent / "HG" / "1.Product" / "5. Videos Final Version"

def load_unit_from_json(json_path: Path) -> dict:
    with json_path.open() as f:
        return json.load(f)
```

### A.4.2 · Videos de la unit

El JSON no incluye `video_blocks` — los agregamos programáticamente. Reglas:

1. Buscar MP4s con pattern `CP-{level}-{pillar}-{seq}*.mp4` (donde slug es `hg-{pillar}-{level}-{seq}-...`).
   Ej: slug `hg-p1-l1-001-antes-de-seguir` → buscar `CP-L1-P1-001*.mp4`
2. Para cada MP4 encontrado, agregar un `video_teaching` block al inicio de la unit (después de `text_context` si existe · sino primero).
3. Si NO se encuentran MP4s locales para el slug:
   - Usar `video_url` de un event existente del mismo pilar como PLACEHOLDER
   - Query: `SELECT video_url FROM events WHERE pillar_code=$1 AND video_url IS NOT NULL LIMIT 1`
   - Marcar con `eyebrow_label = "[PLACEHOLDER · Andrés reemplaza]"`

### A.4.3 · Upload de MP4s a R2 (opcional en este PR)

Si el bucket R2 está accesible desde local + hay credenciales configuradas, sumar función `upload_mp4_to_r2(local_path)` que:
- Sube el MP4 a `r2://hg-learning-units/{slug}/VID{n}.mp4`
- Retorna la URL pública/signed

**Si NO hay credenciales R2**, sumar TODO en el commit: "Videos locales de HG/1.Product/5. Videos Final Version/ deben subirse manualmente a R2 · Andrés provee credenciales o ejecuta upload separado".

### A.4.4 · Adaptar 2 units adicionales

Basado en el JSON `HG-P1-L1-001.json`, generar 2 units más artificiales con estructura idéntica pero copy adaptado:

- **Unit 2:** P3 Relaciones L1 · slug `hg-p3-l1-001-feedback-directo` · basado en Composición C (con reflection principal) · usar mismo formato de citation
- **Unit 3:** P4 Salud L1 · slug `hg-p4-l1-001-micro-descansos` · con quiz mix (single_choice + true_false)

Marcar el copy de ambas con `[GENERADO POR CLAUDE · Andrés valida]` inline para diferenciar del real.

### A.4.5 · Idempotencia

Script chequea `SELECT slug FROM learning_units WHERE slug=$1` antes de insert. Si existe, hace UPDATE preservando IDs.

### A.4.6 · Publicación

Al terminar, setear `published_at = now()` en las 3 units.

### Criterios
- [x] Unit real "Antes de seguir" cargada desde JSON
- [x] 2 units adicionales generadas y publicadas
- [x] Videos referenciados (locales R2 si aplica, sino placeholders de events)
- [x] Script idempotente
- [x] Commit: `chore(lu-refine): seed with real content from HG/1.Product/5. Videos Final Version`

**Notas de implementación:**
- Archivo en `apps/backend/src/hg/scripts/seed_learning_units.py` (reemplaza
  el de Fase 1 A-09 in-place), no `apps/backend/scripts/` — mismo criterio
  de siempre, sigue la convención real del repo.
- **`HG/1.Product/5. Videos Final Version/` NO está en git** (vive fuera
  de `hg-platform`, es Drive local de Andrés) — no existe en CI ni en la
  máquina de otro dev. `_resolve_content_dir()` intenta resolver la ruta
  relativa real (confirmada en esta máquina: `parents[6]` del script) +
  soporta override por `LU_SEED_CONTENT_DIR`; si no encuentra nada, cae a
  `_EMBEDDED_UNIT_1` (copia hardcodeada del JSON real) para que el seed
  nunca rompa por falta del Drive. Verificado explícitamente: **si** se
  encuentra el directorio real, carga el JSON real (confirmado con log);
  el fallback embebido no se ejercitó en esta corrida (documentado, no
  bloqueante — el propósito es robustez para otros entornos).
- **Bug real encontrado en el JSON de producción**: `HG-P1-L1-001.json`
  tiene un carácter invisible suelto después del `}` de cierre (`json.load`
  fallaba con "Extra data" en la línea 66) — se cambió a
  `json.JSONDecoder().raw_decode()`, que parsea el primer objeto JSON
  válido e ignora basura de más, en vez de reventar.
- **Segundo bug real en el JSON de producción**: la citation "Di Stefano et
  al. (2016) / Edmondson (2024)" tiene `doi_or_url: ""` (vacío) — viola la
  regla de publish validation (Guía de Diseño §8, ya implementada en A-05
  de Fase 1) y la unit no podía publicarse tal cual. Di Stefano et al.
  (2016) es un working paper real de HBS (no un dato inventado) — se
  parcheó con su URL pública conocida vía `_patch_missing_citation_urls()`,
  con un log warning explícito documentando el parche para que Andrés lo
  vea y decida si prefiere otro URL.
- **Videos**: ningún MP4 de la carpeta está en R2 todavía — `video_url`
  SIEMPRE queda en un placeholder http(s) reproducible (URL de un `event`
  existente del mismo pilar vía join con `career_paths`, o una URL
  genérica si ninguno tiene `video_url` — en esta DB de dev, 0/13 events
  tienen `video_url` poblado, así que cae al genérico). Un MP4 local nunca
  se usa como `video_url` directo (no es http(s), no lo reproduciría el
  browser); en cambio, el nombre del archivo local encontrado
  (`CP-L1-P1-001 - VID1.mp4` para la unit real) se documenta en
  `eyebrow_label` (`"[LOCAL: ... · pendiente subir a R2]"`) para que el
  script de upload de la `PARTE C` (post-merge) sepa qué reemplazar. Las 2
  units generadas no tienen MP4 local (slugs ficticios) → `eyebrow_label`
  genérico `[PLACEHOLDER · Andrés reemplaza]`.
- `duration_seconds` de los videos es un placeholder fijo (30s) — no hay
  forma de leer la duración real de un MP4 sin una dependencia nueva
  (ffprobe/moviepy), fuera de alcance por la regla dura de no instalar
  deps nuevas. Documentado explícitamente como TODO para cuando se suban
  los videos reales a R2 (ahí sí se puede leer metadata real).
- Las 2 units generadas (P3 feedback-directo Composición C con reflection
  como retrieval principal — sin quiz; P4 micro-descansos con quiz mixto
  multiple_choice+true_false) reusan citas reales ya verificadas en Fase 1
  (Edmondson 1999, Sianoja et al. 2018) — mismo criterio que la unit real:
  contenido honesto respaldado por evidencia citable, marcado
  `[GENERADO POR CLAUDE · Andrés valida]` en vez de inventar datos.
- **Limpieza de las 3 units placeholder de Fase 1** (`p1-c3-l2-001-...`,
  etc. — naming distinto, `_delete_if_exists` nunca las hubiera tocado por
  su cuenta) agregada explícitamente en `run()`: sin esto quedarían 6
  units en el feed, la mitad todavía con `[COPY PENDIENTE · coach]`. Este
  script es el reemplazo del de Fase 1, no un agregado.
- Verificado: corrida 1 y 2 confirmadas idempotentes (3 units, no 6) ·
  las 3 devuelven 200 con `video_url` en el payload vía
  `GET /api/v1/modulos/{slug}` · `GET /api/v1/modulos/by-pillar?pillar_code=P1`
  devuelve la unit real · `ruff check` y `mypy` limpios.

---

## TASK lu-refine-A-05 · Tests backend + Bruno collection update · `[x]`

- Actualizar tests que asumían `youtube_video_id` → `video_url`
- Test integración: seed 3 units → GET /modulos/by-pillar?pillar_code=P1 → devuelve la unit "Antes de seguir"
- Bruno collection actualizado con nuevo schema

### Criterios
- [x] Tests verdes ≥85% cobertura
- [x] Bruno collection sin refs a YouTube
- [x] Commit: `test(lu-refine): update tests + Bruno for video_url schema`

**Notas de implementación:**
- El grueso de "actualizar tests que asumían youtube_video_id" ya se hizo
  en A-02 (era necesario ahí para no dejar ese commit con tests rotos —
  ver sus notas). Esta TASK cierra lo que quedaba pendiente explícitamente
  en su propio scope: el test de integración seed→by-pillar y el Bruno
  collection.
- `test_seed_then_by_pillar_returns_real_unit` (nuevo, en
  `test_learning_units_router.py`) llama `_load_unit_1_spec()` +
  `_seed_unit()` del script de A-04 directamente con una `SessionLocal()`
  propia + commit explícito — **no** usa el fixture `db` (session
  transaccional con rollback-per-test) porque esa sesión vive en una
  conexión separada de la que usa `client` (los requests HTTP pasan por
  `Depends(get_db)`, otra conexión) — si el seed commiteara solo en la
  sesión del fixture `db`, el request HTTP nunca vería esos datos (dos
  conexiones distintas, sin commit cross-connection). Mismo patrón que
  `_make_unit`/`_make_minimal_unit` ya usaban en este archivo. Limpieza
  explícita en `finally` (borra el slug real después del test).
- Cobertura del módulo `learning_units` (todos los test files relevantes,
  incluyendo `test_youtube_helper.py`): **97%** (`admin_router.py` 93%,
  `router.py` 93%, `models.py`/`schemas.py`/`youtube.py` 100%,
  `quiz_grading.py` 96%) — bien por encima del 85% pedido, sin necesidad
  de tests adicionales solo por número.
- Bruno: solo `03-admin-create-block-video-intro.bru` tenía
  `youtube_video_id` — actualizado a `video_url` + doc actualizada
  (ya no hay auto-fill de `poster_url`). Grep final confirma cero
  referencias a YouTube en el resto de la colección.
- También actualizado `docs/learning-units/create-unit-via-api.md` (la
  guía de Fase 1 documentaba el flujo viejo de `youtube_video_id` en la
  sección "Video") — no estaba en el scope literal de esta TASK pero
  quedaba con ejemplos rotos si no se tocaba.
- Verificado: 27/27 tests de `learning_units` (incluye los 3 de A-03 + el
  nuevo de A-05) + `test_catalog.py`/`test_course_progress.py`/
  `test_events_redirect.py` (no tocados por este refinamiento, corridos
  igual para confirmar que nada se rompió) — **todos verdes**. `ruff
  check` limpio.

---

# PARTE B · Frontend fixes (5 TASKs · ~7-9h)

## TASK lu-refine-B-01 · Types + API client update · `[x]`

`apps/frontend/src/lib/types/modulos.ts`:

```ts
export type VideoBlock = {
  id: string;
  position: number;
  required: boolean;
  block_type: "video_intro" | "video_teaching" | "video_closing";
  video_url: string;              // ← reemplaza youtube_video_id
  poster_url: string | null;
  duration_seconds: number;
  subtitle_url: string | null;
  transcript_text: string | null;
  eyebrow_label: string | null;
};
```

Nuevo API method:

```ts
export async function apiListModulosByPillar(
  pillarCode: string,
  levelCode?: string,
  limit = 10,
): Promise<LearningUnitFeedItem[]>;
```

### Criterios
- [x] Types actualizados
- [x] API client con nuevo método
- [x] Cero refs a `youtube_video_id` en frontend
- [x] Commit: `refactor(lu-refine): types + API client for video_url + by-pillar`

**Notas de implementación:**
- Igual que B-02 (Fase 1): los tipos/API viven en `lib/types.ts`/`lib/api.ts`
  (archivos planos existentes), no en `lib/types/modulos.ts` — sigue la
  convención real del repo, no el path literal del sketch.
- `apiListModulosByPillar(pillarCode, levelCode?, limit=10)` — mismo
  nombre/firma que el sketch del prompt.
- **`VideoBlockView.tsx` recibió un fix interino** (solo
  `block.youtube_video_id` → `block.video_url`, el iframe de YouTube queda
  intacto por ahora) para que este commit compile/typechequee limpio sin
  arrastrar B-02 completo acá — mismo criterio que A-02 con el seed script
  de Fase 1. B-02 reemplaza el componente entero (iframe → `<video>`
  nativo) en su propio commit inmediatamente después.
- 2 test fixtures (`BlockRenderer.test.tsx`, `UnitStoriesPlayer.test.tsx`)
  actualizados al mismo tiempo — construían objetos `VideoBlock` con el
  campo viejo, hubieran roto el typecheck si no se tocaban ahora.
- Verificado: `pnpm typecheck`, `pnpm lint` y `pnpm test` (106/106) limpios
  · grep final confirma 0 referencias a `youtube_video_id` en todo `src/`.

---

## TASK lu-refine-B-02 · `<VideoBlockView/>` refactor · `<video>` player + fullscreen mobile · `[x]`

Archivo: `apps/frontend/src/components/modulos/blocks/VideoBlockView.tsx`

### B.2.1 · Reemplazar iframe YouTube

```tsx
"use client";

import * as React from "react";
import { Check, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import type { VideoBlock } from "@/lib/types";

export function VideoBlockView({
  block,
  isCompleted,
  onCompleteBlock,
}: {
  block: VideoBlock;
  isCompleted: boolean;
  onCompleteBlock: () => Promise<void>;
}) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [marking, setMarking] = React.useState(false);
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  // Detectar mobile · si mobile, arrancar en fullscreen automatico al play
  const isMobile = typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches;

  async function requestFullscreen() {
    if (!videoRef.current) return;
    try {
      // iOS Safari usa webkitEnterFullscreen · fallback
      if ((videoRef.current as any).webkitEnterFullscreen) {
        (videoRef.current as any).webkitEnterFullscreen();
      } else if (videoRef.current.requestFullscreen) {
        await videoRef.current.requestFullscreen();
      }
      setIsFullscreen(true);
    } catch {
      // silent fail · algunos navegadores rechazan sin user gesture
    }
  }

  async function handleVideoEnded() {
    // Auto-mark on video ended
    if (isCompleted) return;
    setMarking(true);
    try {
      await onCompleteBlock();
    } finally {
      setMarking(false);
    }
  }

  async function markSeen() {
    if (isCompleted || marking) return;
    setMarking(true);
    try {
      await onCompleteBlock();
    } finally {
      setMarking(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {block.eyebrow_label && <Eyebrow accent>{block.eyebrow_label}</Eyebrow>}
      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-hg-ink">
        <video
          ref={videoRef}
          className="h-full w-full object-contain bg-hg-ink"
          src={block.video_url}
          poster={block.poster_url ?? undefined}
          controls
          playsInline
          preload="metadata"
          onEnded={handleVideoEnded}
        >
          {block.subtitle_url && (
            <track kind="subtitles" srcLang="es" label="Español" src={block.subtitle_url} default />
          )}
          Tu navegador no soporta video HTML5.
        </video>
        {isMobile && !isFullscreen && (
          <button
            type="button"
            aria-label="Ver en pantalla completa"
            onClick={requestFullscreen}
            className="absolute right-2 top-2 rounded-md bg-hg-ink/60 p-2 text-white"
          >
            <Maximize2 size={18} />
          </button>
        )}
      </div>
      {isCompleted ? (
        <div className="flex items-center gap-2 self-start font-sans text-sm font-semibold text-success">
          <Check size={16} />
          Visto
        </div>
      ) : (
        <Button variant="secondary" size="sm" onClick={markSeen} disabled={marking} className="self-start">
          Ya lo vi
        </Button>
      )}
    </div>
  );
}
```

### B.2.2 · Fullscreen behavior mobile

- El `<video controls>` nativo en iOS/Android ya expone botón fullscreen · algunos users no lo encuentran → sumar botón custom "Ver en pantalla completa" arriba a la derecha del thumbnail
- En iOS Safari: `webkitEnterFullscreen()` es el método correcto
- En Android Chrome: `requestFullscreen()` sobre el elemento video funciona
- `playsInline` permite reproducir inline (no auto-fullscreen) · aunque puede overridearse en Safari

### B.2.3 · Auto-completion on ended

Cuando el video termina (`onEnded`), marcar automáticamente como completed. El botón "Ya lo vi" queda como opción manual si el user quiere skipear al final del video.

### Criterios
- [x] Player `<video>` HTML5 nativo con src=video_url
- [x] Fullscreen button visible en mobile
- [x] Auto-mark on video ended
- [x] Botón "Ya lo vi" manual sigue disponible
- [x] Subtítulos si vienen
- [x] Verificado en Chrome desktop + Chrome con viewport mobile emulado — **no en Safari iOS/Android real** (ver nota)
- [x] Commit: `feat(lu-refine): VideoBlockView native <video> + fullscreen mobile`

**Notas de implementación:**
- `webkitEnterFullscreen` tipado con una interfaz local
  (`SafariVideoElement extends HTMLVideoElement`) en vez de un cast a `any`
  — es un método no estándar (solo iOS Safari), no existe en el lib.dom.ts
  de TypeScript.
- `handleEnded` (auto-mark on ended) es un handler separado de `markSeen`
  (el del botón manual) a propósito: comparten la llamada a
  `onCompleteBlock()` pero NO comparten el estado `marking` — mostrar
  "Guardando…" en el botón "Ya lo vi" cuando fue el video el que disparó
  el mark (no el usuario tocando el botón) hubiera sido confuso.
- **Verificación real, no solo unit tests**: reusando el stack local
  levantado antes en esta sesión (backend+frontend+Postgres), login real,
  navegación mobile (390×844 emulado) hasta el bloque de video de la unit
  real → confirmado `<video>` con `controls`/`playsInline`/
  `preload="metadata"`, botón de fullscreen custom visible, eyebrow
  documentando el MP4 local pendiente de subir a R2. Repetido en desktop
  (1440×900) → mismo `<video>`, sin el botón de fullscreen (correcto,
  gateado por `useMediaQuery`), `aspect-video` mantenido dentro del layout
  de 2 columnas.
- **Honesto sobre el límite de esta verificación**: Chrome headless (real
  + con viewport mobile emulado) es lo único a lo que este entorno tiene
  acceso — **no hay Safari iOS ni Chrome Android reales ni simuladores
  disponibles acá**. El branch `webkitEnterFullscreen` está implementado
  siguiendo la API documentada de Apple pero no se pudo ejercitar en un
  dispositivo real; el branch `requestFullscreen()` (Chromium/Firefox) sí
  se verificó indirectamente (el botón dispara el handler sin errores en
  Chrome, aunque headless Chrome no permite fullscreen real sin una
  ventana visible — no se pudo confirmar el efecto visual del fullscreen
  en sí, solo que el código no explota).
- Bug real encontrado y corregido durante esta verificación (no de este
  commit — de infraestructura de test): un test de integración de A-05
  (`test_seed_then_by_pillar_returns_real_unit`) borra la unit real en su
  `finally` — al correr la suite completa antes de esta verificación
  manual, la unit quedó borrada de la DB de dev. Se resembró
  (`python -m hg.scripts.seed_learning_units`) antes de continuar; no
  requirió cambios de código, es el comportamiento esperado de un test
  con cleanup.
- Verificado además: `pnpm typecheck`, `pnpm lint`, `pnpm test` (106/106)
  limpios.

---

## TASK lu-refine-B-03 · `/path` · migrar de events a learning_units · `[x]`

`apps/frontend/src/components/path/PathLanes.tsx`:

Reemplazar `apiListCoursesForPath` por `apiListModulosByPillar`. Cambiar `<CourseCard>` por `<UnitCardCompact>` (que ya existe de PR-B).

```tsx
"use client";

import Link from "next/link";
import * as React from "react";
import { UnitCardCompact } from "@/components/modulos/UnitCardCompact";
import { apiListModulosByPillar, apiListPaths } from "@/lib/api";
import { PILLARS } from "@/lib/pillars";
import type { CareerPath, LearningUnitFeedItem } from "@/lib/types";

interface Lane {
  path: CareerPath;
  modulos: LearningUnitFeedItem[];
}

export function PathLanes() {
  const [status, setStatus] = React.useState<"loading" | "error" | "ok">("loading");
  const [lanes, setLanes] = React.useState<Lane[]>([]);

  const load = React.useCallback(async () => {
    setStatus("loading");
    try {
      const paths = await apiListPaths();
      const lanes = await Promise.all(
        paths.map(async (path) => {
          const modulos = await apiListModulosByPillar(path.code, undefined, 3);
          return { path, modulos };
        }),
      );
      setLanes(lanes);
      setStatus("ok");
    } catch {
      setStatus("error");
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  // ... render con lanes.modulos map a UnitCardCompact
  // Link "Ver todos" apunta a /modulos?pillar=P1 (si existe filter) o /modulos con highlight
}
```

Empty state por pilar si no hay units publicadas: "Aún no hay módulos publicados para este pilar."

### B.3.1 · Update copy `/path/page.tsx`

Cambiar el subtítulo de "Cada carril agrupa tus eventos por dimensión" → "Cada carril agrupa tus módulos por dimensión."

### Criterios
- [x] PathLanes muestra learning_units, no events
- [x] Empty state por pilar vacío
- [x] Copy actualizado
- [x] Cero refs a `apiListCoursesForPath` en PathLanes
- [x] Commit: `refactor(lu-refine): /path shows learning_units instead of events`

**Notas de implementación:**
- `apiListCoursesForPath` no se borró — marcada `@deprecated` con JSDoc (sin
  callers activos confirmado por grep) siguiendo el mismo criterio que
  `youtube.py` en A-02 (deprecar, no eliminar código que podría servir
  después; el endpoint que pega abajo sigue vivo vía el redirect legacy).
- **Extensión pequeña sobre el sketch del prompt**: además del link
  genérico "Explorar todos los eventos" al final de la página (sin
  cambios), se agregó un link "Ver todos →" **por lane** apuntando a
  `/modulos?pillar={code}` — el criterio de B-04 ("Link 'Ver todos' desde
  /path apunta a /modulos?pillar=X") implica que cada carril necesita su
  propio link, no solo uno genérico al fondo de la página. Solo aparece si
  la lane tiene al menos 1 unit (no tiene sentido "ver todos" de un pilar
  vacío).
- `isFixtureCourse` (filtraba slugs de seed/test del catálogo de events)
  no aplica a learning_units — no hay equivalente de fixture-slugs ahí, así
  que se sacó del import sin reemplazo.
- **Verificado en browser real** (no solo build/typecheck): login,
  `/path` con datos reales — pilar P1 muestra "Antes de seguir" (unit
  real), P3/P4 muestran las units generadas, P2/P5/P6 (sin units
  publicadas) muestran correctamente el empty state "Próximamente ·
  contenido en producción", y los 3 links "Ver todos →" apuntan a
  `/modulos?pillar=P1`, `?pillar=P3`, `?pillar=P4` respectivamente.
- Verificado: `pnpm typecheck`, `pnpm lint`, `pnpm test` (106/106) limpios.

---

## TASK lu-refine-B-04 · Filtro por pilar opcional en `/modulos` · `[x]`

`apps/frontend/src/app/(app)/modulos/page.tsx`:

Cuando llega `?pillar=P1` en la query, filtrar el feed a units de ese pilar. Sino, feed normal (recomendado/próximo).

```tsx
export default async function ModulosPage({ searchParams }: { searchParams: { pillar?: string } }) {
  const pillarFilter = searchParams.pillar;
  const feed = pillarFilter
    ? await apiListModulosByPillar(pillarFilter, undefined, 20)
    : await apiGetModulosFeed();
  // ... render con filter chip visible en top si aplica
}
```

### Criterios
- [x] `/modulos?pillar=P1` filtra a units de P1
- [x] Chip visible "Filtrando: Carrera · [X quitar]"
- [x] Link "Ver todos" desde `/path` apunta a `/modulos?pillar=X`
- [x] Commit: `feat(lu-refine): /modulos pillar filter via query param`

**Notas de implementación:**
- El sketch del prompt usa un server component `async function ModulosPage({
  searchParams })`; esta página sigue siendo client component
  (`"use client"`, mismo patrón que el resto de `(app)/*`, sin precedente
  de data-fetching server-side — ver notas de B-03 de Fase 1) — el filtro
  se lee con `useSearchParams()` de `next/navigation` en vez de la prop
  `searchParams` de un server component.
- **`useSearchParams()` en un client component exige un `<Suspense>`**
  boundary en Next.js App Router — se extrajo el contenido a
  `ModulosPageContent` y el export default (`ModulosPage`) lo envuelve en
  `<React.Suspense fallback={...}>`. Confirmado con `next build` limpio
  (sin este boundary, el build tira warning/error) — la ruta sigue
  prerenderizada estáticamente (`○`) en el output del build.
- Chip usa el componente `Chip` del design system existente (no uno nuevo)
  con el ícono `X` de lucide-react adentro — clickear el chip entero
  limpia el filtro (`router.push("/modulos")`), no solo la X.
- Empty state diferenciado: "Todavía no hay módulos publicados para este
  pilar" (con filtro activo) vs. "Todavía no hay módulos para vos" (feed
  normal) — mensajes distintos para no confundir "no hay nada para tu
  pilar filtrado" con "no hay nada en general".
- **Bug de proceso encontrado durante la verificación** (no de código): un
  `rm -rf .next` mientras el dev server de Next ya estaba corriendo con
  ese mismo `.next/` como working dir corrompió su cache de webpack
  (`ENOENT` en `.next/cache/webpack/...`). Requirió matar y reiniciar el
  dev server. Documentado para no repetir el mismo error en tasks
  siguientes — de acá en más, verificar con `next build` en un directorio
  aparte del dev server activo, o reiniciar el dev server después.
- **Verificado en browser real**: `/modulos?pillar=P3` muestra el chip
  "FILTRANDO: RELACIONES" + solo la unit de P3; click en el chip limpia el
  filtro y vuelve al feed normal (hero + próximas). Confirmado también
  desde B-03 que los links "Ver todos →" de `/path` apuntan correctamente
  acá.
- Verificado: `pnpm typecheck`, `pnpm lint`, `pnpm test` (106/106) y `next
  build` (producción) limpios.

---

## TASK lu-refine-B-05 · Tests + smoke visual · `[ ]`

- Tests actualizados: `VideoBlockView` renderiza `<video>` (no `<iframe>`)
- Test snapshot para el filter query param
- Smoke manual:
  - `/modulos` feed muestra 3 units seed
  - Click una unit → player muestra video HTML5 (no YouTube)
  - Mobile: click "Ver en pantalla completa" → funciona (o el usuario usa control nativo)
  - Video termina → auto-mark completed
  - `/path` muestra las 3 units distribuidas por pilar (P1 tiene "Antes de seguir")
  - Click "Ver todos" desde /path/P1 → `/modulos?pillar=P1` filtra

### Screenshots

```
docs/screenshots/lu-refinements/
├── 01-modulos-feed-with-real-content.png
├── 02-video-player-html5-desktop.png
├── 03-video-player-mobile-fullscreen.png
├── 04-path-with-learning-units.png
├── 05-modulos-pillar-filter.png
```

### Criterios
- [ ] Tests + typecheck + lint verdes
- [ ] 5 screenshots
- [ ] Smoke mobile + desktop OK
- [ ] Commit: `test(lu-refine): tests + 5 screenshots for video/path/filter changes`

---

# PARTE C · Upload MP4s a R2 (post-merge · fuera del prompt)

**No es una TASK del prompt** — Andrés/Claude Code post-merge:

1. Configurar credenciales R2 en local
2. Correr script `apps/backend/scripts/upload_learning_unit_videos.py` que:
   - Lista MP4s en `HG/1.Product/5. Videos Final Version/`
   - Sube cada uno a `r2://hg-learning-units/{slug}/VID{n}.mp4`
   - Update `video_blocks.video_url` con las URLs finales
3. Verificar que los videos reproducen desde R2 en /modulos

Este paso queda documentado como próximo TODO post-merge.

---

# 🎯 Criterios globales

- [ ] 10 TASKs commiteadas
- [ ] Migration video_blocks (youtube_video_id → video_url) aplicada
- [ ] VideoBlockView usa `<video>` nativo
- [ ] Fullscreen mobile funcional
- [ ] `/path` conecta learning_units (no events)
- [ ] `/modulos?pillar=X` filtra
- [ ] Seed cargó unit real "Antes de seguir" + 2 generadas
- [ ] Videos placeholder documentados con `[PLACEHOLDER · Andrés reemplaza]`
- [ ] Tests + 5 screenshots
- [ ] PR contra `main`

# 📤 Entrega

- SHA + PR URL
- 5 screenshots (mobile + desktop)
- Lista de units cargadas: real vs generadas
- TODO doc para upload R2 post-merge
- Nota de cross-browser (Safari iOS + Chrome Android verificados)

---

# 🔴 Fuera de scope

- CMS admin UI para producir units desde interfaz (Fase 2)
- Auto-tracking de watch % granular (marca on-ended es suficiente MVP)
- HLS adaptive streaming (MP4 progressive es OK para 60s videos)
- Migración masiva de events a learning_units (siguen coexistiendo)

---

# Status por TASK

| ID | Subject | Status |
|---|---|---|
| A-01 | Migration youtube_video_id → video_url | `[x]` |
| A-02 | Models + schemas + admin_router update | `[x]` |
| A-03 | Endpoint /modulos/by-pillar | `[x]` |
| A-04 | Seed real content HG-P1-L1-001.json + 2 más | `[x]` |
| A-05 | Tests backend + Bruno collection | `[x]` |
| B-01 | Types + API client update | `[x]` |
| B-02 | VideoBlockView native player + fullscreen | `[x]` |
| B-03 | /path migrate to learning_units | `[x]` |
| B-04 | /modulos pillar filter | `[x]` |
| B-05 | Tests + 5 screenshots | `[ ]` |
