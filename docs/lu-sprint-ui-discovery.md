# Sprint UI Identidad Visual · LU — Discovery (TASK 0)

Mapeo del doc de sprint (escrito a nivel de intención) a la arquitectura real.

## Paths reales

| Doc (tentativo) | Real |
|---|---|
| `components/lu/video/VideoPlayer.tsx` | `apps/frontend/src/components/modulos/blocks/VideoBlockView.tsx` |
| `components/lu/blocks/TextContext/Evidence/Solution.tsx` | **un solo** `TextBlockView.tsx` (por `block.variant`: context/evidence/solution) |
| `components/lu/blocks/Quiz.tsx` + `QuizOption` | `blocks/QuizBlockView.tsx` + `blocks/quiz/Quiz{SingleChoice,MultipleChoice,…}.tsx` |
| `components/lu/blocks/Reflection.tsx` | `blocks/ReflectionBlockView.tsx` |
| `components/lu/UnitCompletionCard.tsx` | `components/modulos/UnitCompletionCard.tsx` (existe) |
| `schemas/lu.ts` (Zod) | `apps/backend/src/hg/modules/learning_units/schemas.py` (Pydantic) |
| `db/migrations/00X.sql` | `apps/backend/migrations/versions/LU-0N_*.py` (Alembic) |
| `pages/api/units/[id].ts` | FastAPI: `learning_units/router.py` + `admin_router.py` |
| `lib/parsers/autoDetect.ts` | `apps/frontend/src/lib/parsers/autoDetect.ts` (nuevo) |
| **Net-new (no existen):** | `UnitOpeningScreen`, `metaphors/*`, `AISoonBadge`, mentor preview, `BlockTransition`, `useNarrativeTone`, `ChapterList`, `HeroDataPoint`, `InteractiveChecklist` |

- `MarkdownBody.tsx` + `lib/markdown/remarkHighlight.ts` **ya existen** (sprint polish) → se reusan; `parseMarkdown` del doc NO se recrea.
- El **mentor preview NO existe** → TASK 15 es crear de cero (ruta simple sin auth, autorizado).

## Modelo de datos (importante)

No hay tabla `blocks` monolítica. Tablas de template separadas + índice polimórfico `unit_blocks`. Los 5 campos nuevos van a:

| Campo | Tabla | Nota |
|---|---|---|
| `chapters` | `video_blocks` | video-only |
| `hero_stat` | `text_blocks` | se llena en variant `evidence` |
| `checklist_items` | `text_blocks` | variant `solution` |
| `narrative_tone` | `learning_units` | unit-level, enum check |
| `keywords` | `learning_units` | unit-level (decisión: tags de unit) |

## Design tokens

Casi todo existe — **no hay que crear casi nada**:

- **Pillars:** `pillar-p1..p6` en `tailwind.config.ts` (valores idénticos al doc). CSS vars `--pillar-p1..p6` **agregadas** en `globals.css` (alias de los brand hues) para glows/gradients por pilar.
- **Base:** `hg-amber` (#e8a030), `hg-green`/primary (#4a7a54).
- **Fuentes:** Anton = **`font-display`** (no `--font-anton`); Poppins = **`font-heading`** (no `--font-poppins`; el body real es Manrope `font-body`).
- **Warm shadows:** usar `shadow-sm/md/lg` (ya son cálidas, ink rgba). No se crean `--hg-warm-shadow-*`.
- **Motion:** hook `useShouldAnimate()` existente (respeta `prefers-reduced-motion`) — usar en toda animación.

**Único token creado (TASK 0):** keyframes `star-glow` (brillo de estrella, box-shadow pulse con `--glow-color` por pilar) y `shake` (quiz incorrecto) en `tailwind.config.ts` + vars `--pillar-p*` en `globals.css`.

## Convención de tests

- **Frontend:** vitest (`pnpm test` → `vitest run`), tests colocados en `__tests__/`.
- **Backend:** pytest (`apps/backend/tests/test_*.py`), corridos desde el venv contra Postgres local (`DATABASE_URL=…@localhost:5432/hg_dev`).

## Desviaciones de scope vs. el doc

1. Templates de texto = 1 archivo por variant (no 3).
2. TASK 7/8 (quiz/reflection) ya tienen shake/pulse/focus de un sprint previo → se **evolucionan** in-place.
3. TASK 15 (preview) = crear de cero (mayor scope). Ruta simple sin auth.
4. Verificación visual real (screenshots, iOS Safari) **no disponible** en el entorno (sin browser automation) → cobertura vía vitest + `next build`; ítems visuales quedan para pasada manual.
