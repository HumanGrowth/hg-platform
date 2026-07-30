# HG · Sprint Tarde — Discovery (TASK 1, bloqueante)

Fecha: 2026-07-29 · Autor: Claude Code · Spec: Sprint Tarde v1 (Andy, 29-jul-2026)
Objetivo del sprint: subir Inicio + Mi Perfil + Eventos + Página de Dimensión al standard visual del Sprint UI, para user testing.

> **⚠️ Este doc corrige varias suposiciones del spec que no coinciden con el repo real.**
> El spec usa rutas/paths de ejemplo (`/inicio`, `/mi-perfil`, `apps/backend/app/models`,
> `Attempt`, `apps/marketing`) que **no existen tal cual**. Abajo, el mapeo real.

---

## §0 · Correcciones de nomenclatura vs. el spec

| Spec dice | Realidad en el repo |
|-----------|---------------------|
| `/inicio` | **`/home`** — `app/(app)/home/page.tsx` (`HomePage`) |
| `/mi-perfil` | **`/perfil`** — `app/(app)/perfil/page.tsx`. (Existe además `/profile` legacy) |
| `/radar` (página propia) | **`/radar` ya redirige a `/perfil`** (`app-polish-04`). El radar vive dentro de Perfil |
| `apps/backend/app/models/attempt.py` | Backend es `apps/backend/src/hg/modules/...`. **No hay modelo `Attempt`** |
| `apps/marketing` | **No existe.** Marketing es `app/(marketing)/*` dentro de `apps/frontend` |
| `components/modulos/metaphors/*` | Es **un solo archivo**: `components/modulos/PillarMetaphor.tsx` |
| Migrations `alembic/versions` | Es `apps/backend/migrations/versions` |

---

## §1 · Páginas y rutas actuales

| Ruta | Archivo | Componentes clave | Data que consume |
|------|---------|-------------------|------------------|
| `/home` | `(app)/home/page.tsx` | `MiniRadar`, `PillarStatesGrid`, `AISoonBadge`, `HomeActivitySection` (lazy) | `apiGetHomeDashboard()`, `apiGetMyResults()`, `apiGetMeWidgets()` |
| `/perfil` | `(app)/perfil/page.tsx` | `Radar`, `PillarStatesGrid`, `Avatar` | `apiGetMyResults()` + `auth-store` |
| `/perfil/editar` | `(app)/perfil/editar/page.tsx` | form perfil | — |
| `/eventos` | `(app)/eventos/page.tsx` (`LibraryPage`) | `CourseCard`, filtros nivel/competencia | `apiListCourses()` |
| `/eventos/[slug]` | `(app)/eventos/[slug]/page.tsx` | `CourseDetailView` | detalle de **curso** |
| `/radar`, `/radar/[pillar]` | redirects → `/perfil` | — | — |
| `/modulos`, `/modulos/[...segments]` | sprint anterior (unidades de aprendizaje) | — | `getModulosFeed()` etc. |
| assessment | **NO hay ruta `/assessment`** — vive en `(onboarding)/onboarding/*` | `session/[id]`, `detail/[pillar]`, `result/[id]` | módulo assessment |

**Hallazgo crítico #1 — `/eventos` es la BIBLIOTECA de cursos legacy, no "eventos".**
El componente se llama `LibraryPage`; lista `Course` vía `apiListCourses`; `/eventos/[slug]`
renderiza `CourseDetailView`. El label del nav es "Eventos" pero el contenido es el
catálogo de cursos heredado (ver comentario en `path/page.tsx`: *"El catálogo de events
heredado sigue vivo en /eventos"*). **TASK 5 propone convertir `/eventos` en una página de
eventos reales (live/webinars/material) con tabla nueva** → esto pisa la biblioteca actual
y todos los `/eventos/[slug]` de detalle de curso. **Requiere decisión de Andy** (ver §7).

**Hallazgo crítico #2 — el radar ya se unificó en `/perfil`.** TASK 6 aplica sobre
`components/radar/Radar.tsx` (el que usa Perfil), no sobre una página `/radar` propia.

---

## §2 · Widgets de Inicio y su data source

Ver documento dedicado: **`Docs/HG_Home_Widgets_Audit.md`**.
Resumen: **todo Inicio consume data real**; la única pieza sin data es `AISoonBadge`
(placeholder AI intencional). El grid de dimensiones (widget #6) es el que TASK 3
reemplaza por `<DimensionCard/>`.

---

## §3 · Modelo de badges

- **NO existe** tabla `badges` ni `user_badges` en el backend
  (`rg -i badge apps/backend` → 0 resultados en modelos/migraciones).
- En frontend sólo hay `components/ui/badge.tsx` (pill genérico de UI) y
  `AISoonBadge` (placeholder). **No hay badges de logro ni assets cargados.**
- **Conclusión:** el carrusel de badges de TASK 4 requiere crear de cero:
  modelo `Badge` + `UserBadge`, migración Alembic, endpoint `GET /me/badges`, y
  definir el set inicial + assets (los sube Andy). **Cantidad de badges hoy: 0.**

---

## §4 · Links entrantes a `/eventos` (para no romperlos en TASK 5)

Ninguno en marketing externo (no hay `apps/marketing`). Dentro de la app:

| Archivo | Uso |
|---------|-----|
| `components/nav/items.ts:36` | Item de nav global "Eventos" → `/eventos` |
| `components/nav/MoreDrawer.tsx:36` | Link en drawer → `/eventos` |
| `app/(app)/home/page.tsx` | `next_step` → `/eventos/{course_slug}`; "Ver eventos" → `/eventos`; actividad reciente → `/eventos/{slug}` |
| `app/(app)/modulos/page.tsx:161,186` | Estados vacíos → `/eventos` |
| `app/(app)/path/page.tsx` | comentario: catálogo heredado vive en `/eventos` |
| `components/path/PathLanes.tsx:103` | Link → `/eventos` |
| `components/library/CourseCard.tsx:19` | Card → `/eventos/{course.slug}` |
| `components/library/CourseDetailView.tsx:49,109,124,164` | redirect + back + next → `/eventos` y `/eventos/{slug}` |
| `middleware.ts:8,45` | ruta protegida `/eventos/:path*` |

> **`/eventos/[slug]` es load-bearing**: es el detalle de curso al que apuntan home
> (next_step + actividad reciente) y toda la biblioteca. Si TASK 5 reusa `/eventos`,
> hay que redirigir esos slugs (a `/modulos/...` o mantener la biblioteca en otra ruta).
> Ver decisión §7.

---

## §5 · Assessment engine — ¿soporta scope por dimensión?

**Sí, ya lo soporta — sin columna nueva.** El modelo real (`modules/assessment/models.py`):

- **No hay `Attempt`.** Las entidades son: `AssessmentInstrument`, `AssessmentItem`
  (con `pillar_code`), `AssessmentItemOption`, `AssessmentSession`, `AssessmentResponse`,
  `PillarResult`.
- **`AssessmentSession`** ya tiene:
  - `kind: SessionKind` (enum; SINGLE/FULL) y
  - **`target_pillar: PillarCode | None`** (indexado) → **este es el scope por dimensión**.
- El router ya expone iniciar sesión con `kind` + `target_pillar`
  (`router.py:104` → `service.start_session(..., SessionKind(kind), target_pillar)`;
  `ordered_items(db, kind, target_pillar)` filtra los ítems por pilar).
- `PillarResult` guarda el resultado por pilar (`state_code`, `sub_scores`,
  `next_retake_eligible_at`) → el histórico por dimensión ya es consultable.

**Conclusión (simplificación importante vs. el spec):** la subtarea de TASK 2
("Attempt.dimension_scope + Alembic + filtro") **NO hace falta**. "Reevaluar esta
dimensión" = iniciar una `AssessmentSession` con `target_pillar = pillar(dimension)` y
`kind` de reevaluación. El onboarding ya hace algo equivalente en
`(onboarding)/onboarding/detail/[pillar]`. Reusar ese flujo, apuntado a la dimensión.

---

## §6 · Registro canónico de las 6 dimensiones

Los **6 pilares P1–P6** son la fuente de verdad (`lib/pillars.ts`). Los códigos de
dimensión del modulos-naming mapean 1:1:

| Dim code | Pilar | Nombre completo (pillars.ts) | Label corto (radar TASK 6) |
|----------|-------|------------------------------|----------------------------|
| CP | P1 | Carrera e impacto | Carrera |
| PR | P2 | Propósito y significado | Propósito |
| RE | P3 | Relaciones y conexión | Relaciones |
| SA | P4 | Salud y bienestar | Salud |
| PI | P5 | Paz interior y claridad | Paz |
| ES | P6 | Estabilidad emocional y material | Estabilidad |

Hoy `lib/modulos.ts` → `DIMENSIONS` sólo tiene **CP** (única dimensión con contenido real).
**Tarea de infra (parte de TASK 2):** completar el registro de las 6 dimensiones
(code ↔ pillar ↔ nombre ↔ label corto ↔ metáfora) en un solo lugar reutilizable por
Página Dimensión, `<DimensionCard/>` y el Radar. Sólo CP tiene units; las otras 5 van en
estado "Contenido próximamente".

> Metáforas: reusar `components/modulos/PillarMetaphor.tsx` (un componente que renderiza la
> metáfora por pilar). **No** existe carpeta `metaphors/`; no rebuildear.

---

## §7 · Propuesta de ruta canónica (Página de Dimensión) — requiere OK de Andy

- **Opción A (recomendada): `/dimensiones/[code]`** — top-level, limpia. Es el hub que
  enlaza Inicio, Perfil y Radar; no "vive" bajo perfil.
- Opción B: `/mi-perfil/dimension/[code]` (anidada bajo perfil).

`[code]` = código de dimensión (CP, PR, RE, SA, PI, ES). Convive con Perfil (que sigue
teniendo el radar global). **Recomendación: Opción A.**

### Decisión adicional bloqueante — semántica de `/eventos` (TASK 5)

TASK 5 quiere convertir `/eventos` en página de **eventos reales** (live/webinars/material,
tabla `Event` nueva). Pero `/eventos` hoy es la **biblioteca de cursos** + `/eventos/[slug]`
= detalle de curso, con links load-bearing desde Inicio. Opciones:

- **A — Reemplazar:** `/eventos` pasa a ser Eventos; el catálogo de cursos queda obsoleto
  y los `/eventos/[slug]` + `next_step` de Inicio se redirigen a `/modulos/...`.
  *(Requiere que Andy confirme que la biblioteca de cursos legacy ya no se usa — hoy
  Inicio todavía apunta ahí.)*
- **B — Coexistir:** Eventos nuevos en una ruta distinta (p. ej. `/eventos` para eventos y
  mover la biblioteca legacy a `/biblioteca`, o al revés). Preserva ambos.

Sin esta decisión, TASK 5 no se puede ejecutar sin romper Inicio. **Recomendación: B en el
corto plazo** (no romper Inicio antes del user testing), o A sólo si Andy confirma que la
biblioteca legacy está muerta y que Inicio debe apuntar a `/modulos`.

---

## §8 · Plan de PRs (ajustado a la realidad)

- **PR A** · Docs de discovery (este + widgets audit) + registro de 6 dimensiones (infra).
  *No incluye `Attempt.dimension_scope` (innecesario, §5).*
- **PR B** · Página de Dimensión `/dimensiones/[code]` (front) + endpoint "reevaluar
  dimensión" reusando `AssessmentSession.target_pillar` (sin migración nueva).
- **PR C** · Inicio + Perfil + Radar (comparten `<DimensionCard/>` y `PillarMetaphor`).
  TASK 6 opera sobre `components/radar/Radar.tsx`.
- **PR D** · Eventos (TASK 5) — **bloqueado hasta decisión §7**. Incluye tabla `Event`,
  admin, hero rotativo, secciones. Requiere también badges backend (TASK 4) si se
  agrupa; sugiero separar badges en su propio sub-PR.

## §11 · ⚠️ Colisión de modelo `Event` (bloquea TASK 5 / PR D)

Al ir a implementar PR D se descubrió que **ya existe un modelo `Event`** en el
backend: `hg.modules.learning.models.Event`, `__tablename__ = "events"` — es el
**contenido de aprendizaje legacy** (career_path + level + track + duration), o sea
la "biblioteca de cursos" que `/eventos` muestra hoy. El frontend la consume vía
`/api/v1/courses` (con redirects legacy `/courses/* → /events/*`).

El spec de TASK 5 propone `class Event(Base)` para eventos reales (live/webinars/
material) → **colisiona con este modelo y con la tabla `events`**. Hay que decidir
el nombre/estructura del concepto nuevo antes de codear PR D. Opciones en §12.

## §12 · Decisión pendiente — modelo del nuevo "Eventos" (esperando a Andy)

- **A (recomendada): modelo nuevo `CommunityEvent` (tabla `community_events`)** +
  endpoints `/api/v1/community-events`. Separación limpia del `Event` de
  aprendizaje. `/eventos` (frontend) pasa a mostrar community events; la biblioteca
  de cursos legacy se retira (redirect `/eventos/[slug]` → `/modulos`).
- B: Reutilizar la tabla `events` agregando `type` (live/webinar/material) + columnas
  nuevas. Más sucio: las filas actuales son contenido de aprendizaje atado a
  career_path; mezclar conceptos.
- C: Pausar Eventos y definir la arquitectura en vivo.

## §10 · Decisiones confirmadas por Andy (2026-07-29)

1. **Ruta de Página de Dimensión: Opción A → `/dimensiones/[code]`.** ✅
2. **`/eventos` → REEMPLAZAR.** `/eventos` pasa a ser la página de eventos reales
   (live/webinars/material). La biblioteca de cursos legacy se retira: `/eventos/[slug]`
   (detalle de curso) y los links de Inicio (`next_step`, actividad reciente) se redirigen
   a `/modulos`. `CourseCard`/`CourseDetailView`/`LibraryPage` quedan obsoletos.
   → **PR D deja de estar bloqueado.**
3. **Badges: usar los íconos de `apps/frontend/public/icons/`** (`hex-bulb`, `hex-chat`,
   `hex-rocket`, `hex-scales`, `hex-sprout`, `hex-star`, en 64/128px — los mismos que usa
   `HexIcon` por pilar). El schema de badges se construye vacío; estos íconos son los assets.

---

## §9 · Bloqueantes que necesitan a Andy antes de codear PRs B–D

1. **Ruta canónica de Página de Dimensión** — A (`/dimensiones/[code]`) vs B. → recomiendo A.
2. **Semántica de `/eventos`** (§7) — reemplazar vs coexistir. → recomiendo coexistir.
3. **Confirmar mapeo de las 6 dimensiones** (§6) y que sólo CP tiene contenido hoy.
4. **Set inicial de badges + assets** (§3) — no existe nada; Andy define catálogo/imágenes.
