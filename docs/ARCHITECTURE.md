# Arquitectura — Human Growth (resumen operativo)

> Documento maestro: `HG/Artifacts/HG_Technical_Planning_v1.docx`. Este archivo es el resumen vivo para devs.

## Principios

1. **Monolito modular**, no microservicios. Cada módulo es extraíble.
2. **Multi-tenancy desde día 1**: toda tabla de dato de usuario lleva `org_id` + RLS.
3. **Append-only** para eventos de actividad (`activity_events`).
4. **Assessment de personalidad** es entidad de primera clase, no JSON suelto.
5. **AI ready**: Python en ambas capas (API + agentes), pgvector en la misma DB.

## Módulos de dominio

| Módulo | Responsabilidad | Extracción futura |
|---|---|---|
| identity | Auth, sesiones, roles, multi-tenancy | Si escala de auth lo requiere |
| people | Perfiles, jerarquía org, manager view | Con crecimiento de orgs grandes |
| learning | Cursos, paths, progreso, assessments | Primer candidato a extraer en Fase B |
| ai | Chatbot, RAG, personalización | Lambda/serverless desde inicio |
| notifications | Email, push, alertas de inactividad | Workers separados con Celery |
| analytics | Eventos de actividad, métricas, reportes | Data warehouse en Fase B |
| admin | Panel interno HG, feature flags, soporte | Permanece en monolito |

## Stack — versión rápida

- **Backend:** Python 3.12 · FastAPI · SQLAlchemy 2 · Alembic · Celery · Redis · psycopg3
- **DB:** PostgreSQL 16 (+ pgvector en Fase 1.5)
- **Frontend:** Next.js 14 (App Router) · TypeScript · Tailwind · shadcn/ui · Auth.js v5
- **Hosting MVP:** Railway · Vercel · Neon
- **Almacenamiento video:** Cloudflare R2 (S3 API) + CDN
- **Email:** Resend · **Errores:** Sentry · **Analytics:** PostHog

## Modelo de datos — capas

1. **Identidad** — `organizations`, `users`, `user_sessions`
2. **Perfil y Assessment** — `personality_assessments`, `user_learning_profiles`, `org_assessment_aggregate`
3. **Learning** — `pillars`, `career_paths`, `courses`, `enrollments`, `course_progress`, `pillar_assessments`
4. **Notifications** — `notification_log`, `email_templates`
5. **Activity** (append-only) — `activity_events`
6. **AI** (Fase 1.5) — `ai_conversations`, `course_embeddings`

Esquema completo: ver Technical Planning doc, sección 3.

## Capa 1 — Identity (DEV-03/04)

Implementada y migrada (Alembic). Es la única capa productiva por ahora; el
resto de los modelos (`learning`, `people`/assessments, `ai`, `analytics`)
están en estado **DRAFT** hasta firmar DEC-01/02/05/07.

### Tablas

| Tabla | RLS | Notas |
|---|---|---|
| `organizations` | — | Tabla raíz de tenant (no tiene `org_id`). Incluye `tier`, `country`, `billing_status`, `billing_cycle`, `contract_start/end`, `licenses_total/used`, `settings` (JSONB), `logo_url`, `primary_color`. |
| `users` | ✅ | `org_id NOT NULL` (FK→organizations). Unique `(org_id, email)` = `uq_users_org_email` (el mismo email puede existir en orgs distintas). Campos: `role`, `career_level`, `job_title`, `department`, `hire_date`, `manager_id` (auto-FK), `last_login_at`, `last_active_at`. |
| `user_sessions` | ✅ | `org_id` + `user_id NOT NULL`. `refresh_token_hash` único, `device_info` (JSONB), `ip_address`, `expires_at`, `revoked_at`. |

### Enums

- `user_role`: `superadmin`, `admin`, `manager`, `collaborator`
- `org_tier`: `A`, `B`, `C`
- `career_level`: `L1`, `L2`, `L3`, `L4a`, `L4b`

### Políticas RLS (DEV-04)

- `ENABLE` + `FORCE ROW LEVEL SECURITY` en `users` y `user_sessions`.
- Política `tenant_isolation` (USING + WITH CHECK):
  `org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid`.
- El contexto se fija por transacción con `set_config('app.current_org_id', …, true)`
  (helper `hg.core.tenancy.set_org_context`); `get_db` abre una transacción
  explícita para que `SET LOCAL` tenga efecto.
- Roles: `hg_app` (NOSUPERUSER/NOBYPASSRLS — rol de la app) y `hg_superadmin`
  (BYPASSRLS — operaciones internas/cross-tenant).

> ⚠️ El rol por defecto `hg` es superusuario y **bypassa RLS**. La conexión
> productiva de la app debe usar `hg_app`. Detalle y rationale en
> [ADR-0001](adrs/ADR-0001-uuid-and-rls.md).

### Migraciones

- `B1-03_layer1_identity.py` — esquema inicial (enums + tablas).
- `B1-04_enable_rls_multi_tenancy.py` — roles + RLS + políticas.

## Auth & RBAC (DEV-06/07)

Autenticación JWT (access + refresh) + registro por invitación (sin
self-service; ver [ADR-0002](adrs/ADR-0002-invitation-based-registration.md)).

### Endpoints

| Método | Ruta | Auth | Rol |
|---|---|---|---|
| POST | `/api/v1/auth/login` | pública | — |
| POST | `/api/v1/auth/refresh` | pública | — |
| POST | `/api/v1/auth/accept-invite` | pública | — |
| POST | `/api/v1/auth/logout` | refresh token | — |
| GET | `/api/v1/auth/me` | Bearer | cualquiera |
| POST | `/api/v1/admin/orgs` | Bearer | superadmin |
| GET | `/api/v1/admin/orgs` | Bearer | superadmin |
| POST | `/api/v1/admin/orgs/{id}/invite` | Bearer | superadmin · admin (su org) |
| GET | `/api/v1/admin/orgs/{id}/invitations` | Bearer | superadmin · admin (su org) |
| DELETE | `/api/v1/admin/invitations/{id}` | Bearer | superadmin · admin (su org) |

### Tokens y roles de DB

- **JWT claims:** `sub` (user_id), `org_id`, `role`, `type` (access|refresh),
  `iat`, `exp`, `jti`. Sin PII adicional.
- **Refresh tokens** se persisten **hasheados** (SHA-256) en
  `user_sessions.refresh_token_hash`. Login = nueva session; refresh = rota
  (revoca la vieja, crea una nueva); logout = `revoked_at`.
- **Rol de DB por request** (`SET LOCAL ROLE`): autenticado tenant-scoped →
  `hg_app` (RLS activo) + `app.current_org_id` del JWT; flujos sin sesión /
  cross-tenant (login, refresh, accept-invite, admin) → `hg_superadmin`
  (BYPASSRLS) + RBAC + checks de org. Ver
  [ADR-0001](adrs/ADR-0001-uuid-and-rls.md).
- **RBAC:** dependency `require_role(*roles)` valida `current_user.role`.

### Flujos

**Login**

```mermaid
sequenceDiagram
  Client->>API: POST /auth/login {email, password, org_slug?}
  API->>DB: (hg_superadmin) buscar user por email (+org_slug)
  API->>API: verify_password (bcrypt)
  API->>DB: crear UserSession (refresh hasheado), set last_login_at
  API-->>Client: {access_token, refresh_token, user}
```

**Refresh (rotación)**

```mermaid
sequenceDiagram
  Client->>API: POST /auth/refresh {refresh_token}
  API->>API: decode JWT (type=refresh)
  API->>DB: buscar session por sha256(token); validar no revocada/expirada
  API->>DB: revocar session vieja + crear session nueva
  API-->>Client: {access_token, refresh_token (nuevo), user}
```

**Accept-invite**

```mermaid
sequenceDiagram
  Admin->>API: POST /admin/orgs/{id}/invite {email, role}
  API->>DB: crear Invitation (token hasheado, exp 7d)
  API-->>Admin: {invite_token (1 sola vez), invite_url, expires_at}
  Note over Invitee: recibe link (email stub en MVP)
  Invitee->>API: POST /auth/accept-invite {token, password, full_name}
  API->>DB: validar invitación (no revocada/usada/expirada) + licencias
  API->>DB: crear User, licenses_used++, marcar accepted_at
  API-->>Invitee: {access_token, refresh_token, user}
```

### Migraciones

- `B1-06_add_invitations_table.py` — tabla `invitations`.
- `B1-06b_enable_rls_on_invitations.py` — RLS sobre `invitations` + grants a
  `hg_superadmin`/`hg_app`.

## Frontend v1 (FE-01 → FE-08)

Next.js 14 (App Router) + TypeScript + Tailwind + el **design system beta**
adoptado como direction v1 (ver [ADR-0003](adrs/ADR-0003-design-system-beta-as-v1.md)).

### Stack

- Next.js 14 App Router · React 18 · TypeScript estricto.
- Tailwind con tokens del DS · `next/font` (Anton/Manrope/Instrument Serif/JetBrains Mono).
- Zustand (auth en memoria) · react-hook-form + zod · axios · Recharts · lucide-react.
- Tests: Vitest + Testing Library.

### Integración del DS (tokens-based)

- Fuente: `packages/design-system/source/` (copia del beta).
- Tokens operativos: `apps/frontend/src/app/globals.css` (`:root` + dark) y
  `apps/frontend/tailwind.config.ts`. Los componentes usan tokens semánticos
  (`bg`, `fg`, `border`, `orange-*`, pillars), nunca hex hardcodeado.
- **Swap a DEC-03 final:** editar esos 2 archivos (+ `next/font` si cambian las
  fuentes, + reemplazar `source/`). No se tocan componentes. Quitar `BetaBanner`.

### Páginas

| Ruta | Grupo | Estado |
|---|---|---|
| `/login`, `/accept-invite` | `(auth)` | ✅ |
| `/home` (dashboard 6 dimensiones) | `(app)` | ✅ |
| `/library` (filtros; grid vacío v1) | `(app)` | ✅ |
| `/profile` (radar 6 dims, mock scores) | `(app)` | ✅ |
| `/admin/orgs`, `/admin/orgs/:id` | `(admin)` | ✅ superadmin |
| `/_kit` (preview de componentes) | — | ✅ |
| Assessment, lección, mentorías, comunidades | — | ⏳ pendiente (post DEC-01/05) |

### Auth en el cliente

- Access token en **memoria** (Zustand); refresh token en **cookie httpOnly**
  gestionada por Next API routes `/api/auth/*` (login, refresh, logout,
  accept-invite). Interceptor axios auto-refresca una vez en 401.
- `middleware.ts` gatea `(app)`/`(admin)` por presencia de cookie; `SessionGate`
  rehidrata el access token (refresh-on-load) y valida; `(admin)` además exige
  rol `superadmin`.

### Pilares (colores DS)

P1 orange-500 · P2 warm-600 · P3 success · P4 warning · P5 info · P6 orange-800.

## Frontend v2 (FE-v2-01 → FE-v2-10)

Sitio de marketing público + paleta marketing v1 + nav adaptativa + Radar +
shells de onboarding. Ver [ADR-0006](adrs/ADR-0006-marketing-palette-v1-and-adaptive-nav.md).

### Paleta + fuentes v1

- Paleta marketing v1 en `tailwind.config.ts`: foundation (`ink`/`slate`/`warm`/
  `cream`), marca (`gold`/`forest`/`orange`/`amber`/`sage`), semánticos, `pillar.p1–p6`.
- Tokens semánticos (`bg`/`fg`/`border`) siguen wired a CSS vars; sólo se remapeó
  su valor en `globals.css`. Aliases de compat para clases legacy de la app v1.
- Fuentes (`next/font`): **Anton → Poppins** (display), **Manrope → Lato** (body),
  Instrument Serif (serif), JetBrains Mono (mono).
- Pilares v1: P1 orange · P2 gold · P3 forest · P4 sage · P5 slate · P6 warm.

### Route groups

`(marketing)` · `(auth)` · `(app)` · `(admin)` · `(onboarding)`. `/` es landing
público; `middleware.ts` redirige a `/home` si hay sesión.

### Nav adaptativa (4 destinos)

| Destino | Ruta | Icono |
|---|---|---|
| Inicio | `/home` | Home |
| Mi Ruta | `/path` (Biblioteca como sub-vista) | Route |
| Mi Radar | `/radar` (+ `/radar/[pillar]`) | Hexagon |
| Perfil | `/profile` | User |

`SideNav` (desktop, colapsable 240/64, localStorage) · `BottomNav` (mobile, 4 ítems)
· `TopBar` (avatar, logout, toggle admin para superadmin).

### Componentes Radar

- `Radar` (Recharts): 3 estados (`empty`/`filling`/`complete`), 3 tamaños
  (`mini` 120 / `medium` 300 / `large` 440), labels interactivos → `/radar/[code]`.
- `MiniRadar`: 120×120 sin etiquetas (Home + sidebar).

### Páginas v2

| Ruta | Grupo | Estado |
|---|---|---|
| `/`, `/paths`, `/for-teams`, `/pricing`, `/contacto` | `(marketing)` | ✅ público |
| `/path`, `/radar`, `/radar/[pillar]` | `(app)` | ✅ |
| `/onboarding/welcome`, `/onboarding/scenario/[index]`, `/onboarding/result` | `(onboarding)` | ✅ shells (sin scoring) |

### Backend — contact inquiries

Módulo `marketing`: `POST /api/v1/contact/inquiry` (público) + `GET
/api/v1/admin/contact/inquiries` (superadmin). Tabla `contact_inquiries` sin
`org_id`/RLS (leads). Migración B1-13. Email real (Resend) pendiente en B3-05.

## Catálogo PMM (B1-09 + B2-06)

Ver [ADR-0007](adrs/ADR-0007-catalog-model-pmm-as-p1-subset.md). El catálogo del
Drive es PMM v3 y cubre sólo el pilar **P1 Carrera**; los otros 5 pilares aún no
tienen video.

### Modelo (módulo `learning`, **global**, sin RLS)

- `CareerPath` — los 6 pilares del Marco Teórico (`code` P1..P6).
- `Course` — bajo P1, sub-clasificado por `career_level` (enum `career_level_pmm`
  L1..L6), `competency_code` (C1..C5, null para foundations) y `track`
  (`competency` | `foundation_ai` | `foundation_eth` | `foundation_specifics`).
  Campos de media: `video_url` (null), `hls_master_url` (.m3u8), `thumbnail_url`,
  `duration_seconds`. Único por `slug`.
- `Enrollment`/`CourseProgress`/`UserLearningProfile`: **draft hasta B2-08**.
- Migración **B2-01** crea `career_paths` + `courses` (+ enums, grants a
  `hg_app`/`hg_superadmin`) y extiende `users.career_level` con L5/L6.

### Endpoints (auth, `Cache-Control: public, max-age=60`)

| Método | Ruta | Notas |
|---|---|---|
| GET | `/api/v1/paths` | 6 paths ordenados por `order_index` |
| GET | `/api/v1/paths/{code}` | 404 si no existe |
| GET | `/api/v1/paths/{code}/courses` | filtros `level`, `competency` |
| GET | `/api/v1/courses` | filtros `level`, `competency`, `track`, `q` (ILIKE título) |

### Estructura del Drive → flujo de migración

Raíz `1F-_Imak…` → carpetas de nivel (L1/L2/L3 "Done"). Cada nivel → carpetas de
competencia (`P1..P5` → `C1..C5`) o foundation (`FND - AI/ETH/Specifics`) →
MP4 (a veces anidados en "1. Video Creation").

`scripts/migrate_videos_to_r2.py` recorre el Drive (API), transcodea a HLS +
thumbnail con ffmpeg, sube a R2 y escribe `scripts/manifest/{L1,L2,L3}.json`
(idempotente, `--dry-run` sin creds R2). `hg.scripts.seed_catalog` (`make
seed-catalog`) upserta los 6 paths + cursos desde los manifests bajo P1. Hoy sólo
L1 tiene renders (C1/C2); L2/L3 pendientes de producción.

### Frontend

`/library` consume `GET /api/v1/courses` con filtros nivel/competencia + switch
Competencias/Foundations (loading/error/empty). `/path` consume `GET /api/v1/paths`
+ top-3 cursos por carril. Cliente: `apiListPaths`, `apiListCourses`,
`apiListCoursesForPath`. Tipo `CourseLevel` (L1..L6) distinto de `CareerLevel` del
usuario.

## Catálogo — Reproducción y progreso (B2-07)

Ver [ADR-0008](adrs/ADR-0008-video-player-hls-and-progress-tracking.md).

### Modelo `course_progress` (RLS por org)

Un row por `(user_id, course_id)`: `last_position_seconds`, `watch_pct`,
`is_completed`, `first_played_at`, `last_played_at`, `completed_at`. RLS
`tenant_isolation` (ENABLE + FORCE) por `org_id`, como `users`/`user_sessions`.
Migración **B2-02** (reemplaza el draft de B1-03). Enrollment y
UserLearningProfile siguen draft (B2-08).

### Endpoints (auth, RLS por org)

| Método | Ruta | Notas |
|---|---|---|
| GET | `/api/v1/courses/{slug}` | curso + progreso del usuario (`null` si nunca lo abrió); 404 inactivo |
| POST | `/api/v1/courses/{slug}/progress` | upsert `{position_seconds, watch_pct}`; `is_completed` al `watch_pct>=80`; `completed_at` inmutable |

Corren bajo `hg_app` + contexto de org (RLS), no `hg_superadmin`.

### Reproductor

`VideoPlayer` (HLS.js, fallback nativo Safari) con controles custom del DS:
play/seek/volumen/velocidad/calidad/fullscreen + teclado. `useThrottledProgress`
guarda cada **5s** (+ flush inmediato en saltos >10pt y flush final en
`pagehide`). Umbral de completion **80%** (placeholder pedagógico hasta B3-03).
Ruta `/library/[slug]` con diálogo de reanudación.

## Manager & RRHH (B4-A)

Ver [ADR-0009](adrs/ADR-0009-manager-rrhh-on-demand-aggregations.md). 100% backend
(el frontend lo hace B4-B).

### Modelo `Enrollment` (RLS por org)

`user → CareerPath` asignado. 1 usuario → N paths activos (`source` manual|auto,
`is_active`). Migración **B2-03** (reemplaza el draft de B1-03) + RLS
`tenant_isolation`. Asignación manual por manager/admin/superadmin.

### Endpoints

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/api/v1/manager/me/team` | reportes directos; admin/superadmin → toda la org |
| GET | `/api/v1/manager/users/{id}/detail` | reporte directo o admin/superadmin |
| POST | `/api/v1/manager/users/{id}/enroll` | idem (asigna path; 422 si code inválido) |
| DELETE | `/api/v1/manager/users/{id}/enroll/{path_code}` | idem (soft delete) |
| GET | `/api/v1/admin/org/metrics` | admin (su org) · superadmin (`?org_id=`) |
| GET | `/api/v1/admin/org/users/export.csv` | idem (CSV para Excel) |

### Cálculo on-demand

Actividad y completion se agregan en cada request desde `course_progress` +
`enrollments` (ADR-0009). `last_played_at > now-7d` = activo; `> now-30d` cuenta
para adopción. Completion por pilar = cursos completados del path / cursos activos
del path. **Sin Celery beat**: se agrega en B3-05 (Resend) + snapshot materializado
en B4-07. Los scores por pilar quedan placeholder hasta el motor B2-02/03.

## Frontend Manager + RRHH (B4-B)

100% frontend sobre los endpoints B4-A.

- **Nav adaptativa por rol** (`components/nav/items.ts`): `navItemsForRole` +
  `bottomNavItemsForRole`. "Mi equipo" (`/team`) sólo para manager/admin/superadmin;
  BottomNav mantiene máximo 4 (manager → Perfil pasa al menú del avatar).
- **`/team`** (`(app)`): dashboard del manager — `apiGetMyTeam` con filtros
  (Todos/Solo inactivos) + sort (nombre/última actividad/completion) + paginación;
  alerta de inactivos. `TeamMemberCard` + `formatRelativeTime`.
- **`/team/[id]`**: detalle del reporte — barras de completion por pilar
  (`bg-pillar-pN`), paths asignados con unenroll (confirm Dialog), listas de cursos,
  placeholder de assessments. `AssignPathDialog` (grid 6 pilares) para asignar.
- **`/admin/org`** (`(admin)`): dashboard RRHH — KPIs (adopción/completion/activos/
  inactivos), heat strip por pilar, distribución por nivel, top performers, y
  descarga CSV (`apiExportOrgUsersCsv`: fetch + Bearer + blob). Item "Dashboard org"
  en el sidebar admin.
- **CSV con auth**: el endpoint requiere Bearer, así que el download usa `fetch` +
  `blob` + `<a download>` (no link directo).
- `AdminGate` (superadmin-only) → resuelto en FU-12 (ver abajo): split en
  `SuperadminGate` + `OrgAdminGate`, gate por-página.

## Home del colaborador + org admin gate (B3-04 / FU-12)

Ver [ADR-0010](adrs/ADR-0010-home-dashboard-and-org-admin-gate.md).

### Home agregado (`GET /api/v1/me/home`)

`me_router` (prefijo `/me`, tag `home`), bajo `hg_app` + contexto de org (RLS):
**solo devuelve la data del usuario autenticado**. Reusa las agregaciones
on-demand de `people/service` (ADR-0009). Devuelve `next_step` (curso en progreso
`<80%` más reciente, o `null`), `active_enrollments`, `pillar_completion_rates`
(`{P1..P6}`, completados/activos del path — **no scores**), `recent_activity`
(últimos 5) y `stats` (`courses_in_progress/completed`, `total_watch_minutes`,
`month_watch_minutes`, `streak_days`). `streak_days` = días consecutivos
terminando hoy o ayer (helper puro). `/home` (`(app)`) consume `apiGetHomeDashboard`
con loading/error; tarjetas de pilar muestran completion rate.

### Gates por rol (FU-12)

- `SuperadminGate` (ex-`AdminGate`, superadmin-only) → `/admin/orgs`, `/admin/orgs/[id]`.
- `OrgAdminGate` (admin **o** superadmin) → `/admin/org`.
- `(admin)/layout.tsx` ya **no** tiene gate global; cada página monta el suyo.
  Sidebar: "Organizaciones" solo superadmin. TopBar "Modo admin" → `/admin/org`
  para admin + superadmin. Privacidad cross-org garantizada por backend
  (`_resolve_org` ignora `?org_id` para no-superadmin).

## Widgets dashboard v1 (B4-E)

Ver [ADR-0011](adrs/ADR-0011-dashboard-widgets-v1.md). Fase 1 del doc de propuesta
de visualizaciones: 8 widgets accionables, on-demand, sin customización.

### Endpoints (cache `private, max-age=60`)

| Método | Ruta | Tag | Devuelve |
|---|---|---|---|
| GET | `/api/v1/me/widgets` | home | `streak` (90d) · `weekly_minutes` (12w) |
| GET | `/api/v1/manager/me/widgets` | manager | `team_activity` (30d, cells >0) · `inactivity_buckets` |
| GET | `/api/v1/admin/org/widgets` | admin | `adoption_curve` (12m) · `onboarding_funnel` · `monthly_watch` (12m) |

Permisos = páginas existentes (`/me` user vía RLS; manager → reportes directos,
admin/superadmin → org; `/admin/org/widgets` admin su org, superadmin con `?org_id`).
Cálculo en Python desde `course_progress`/`enrollments`/`invitations` (UTC), **sin
migraciones** (helpers en `people/service.py`: `streak_heatmap`, `weekly_minutes`,
`team_activity_cells`, `inactivity_buckets`, `adoption_curve`, `monthly_watch`,
`onboarding_funnel`).

### Frontend

- 8 componentes en `components/widgets/` (StreakHeatmap, WeeklyMinutesBar,
  ProgressRingsByPath, TeamActivityHeatmap, InactivityFunnel, AdoptionCurve,
  OnboardingFunnelChart, MonthlyWatchBar) + `WidgetCard` wrapper (loading/error/empty)
  + `WidgetSrTable`. Solo **Recharts**.
- Secciones lazy-loaded (`React.lazy` + `Suspense`) integradas en `/home`
  ("Tu actividad"), `/team` ("Vista de equipo") y `/admin/org` ("Tendencias").
- Helpers en `lib/widget-utils.ts` (`formatMonthShort`, `getStreakSummary`,
  `widgetColorScale`, `usePrefersReducedMotion`).
- **Accesibilidad WCAG AA:** cada widget con `role="img"` + `aria-labelledby`,
  `<table>` sr-only, `prefers-reduced-motion` (hook + safety net en `globals.css`),
  sin depender sólo del color.

### Roadmap

- **Fase 2:** customización (drag-and-drop con dnd-kit + `user_dashboard_layouts`).
- **Fase 3 (B4-G):** snapshots materializados (`daily_snapshots`) para escalar las
  agregaciones más allá de ~500 usuarios/org.

## Motor de assessment (B2-02 / B2-03)

Ver [ADR-0012](adrs/ADR-0012-assessment-engine-mvp.md). Reemplaza los drafts de
assessment y productiviza `UserLearningProfile` (`pillar_states` JSONB).

### Modelo (`modules/assessment`)

Catálogo global (sin RLS): `AssessmentInstrument` (9), `AssessmentItem` (57),
`AssessmentItemOption`. Por user (RLS por org): `AssessmentSession`,
`AssessmentResponse`, `PillarResult`. Snapshot read-optimized:
`UserLearningProfile.pillar_states`. Migración **B2-04** (6 enums, 7 tablas, RLS
en las 4 por-user, grants a `hg_app`/`hg_superadmin`).

### Scorers (strategy pattern, 1 por pilar)

`scorers/` con `BaseScorer` + registry `SCORERS[PillarCode]`. Cada pilar tiene su
estructura propia (umbrales del doc firmado): P1 PMM v3 = MIN(C1..C5) (weakest
link); P2 MLQ = Presencia/Búsqueda → 4 estados Damon; P3 UCLA+Cacioppo → N1-N4
(N4 requiere confirmación del user); P4 Prochaska×4 → E1-E5 por dominio + recaída;
P5 ERQ+AAQ → N1-N4; P6A CD-RISC → Baja/Media/Alta; P6B CFPB → Frágil/Vulnerable/
Estable. Ítems invertidos: MLQ-5, AAQ-B1, CFPB-B4.

### Endpoints (`/api/v1/assessment`, tag `assessment`)

`POST /sessions`, `GET /sessions/{id}`, `POST /sessions/{id}/respond|finalize|abandon`,
`GET /me/results`, `POST /me/results/{pillar}/confirm`,
`POST /admin/users/{id}/reset-retake/{pillar}`. Validaciones de elegibilidad
(onboarding único, re-take por ventana) en `service.py`. Seed idempotente:
`python -m hg.scripts.seed_assessment`.

### Frontend (B2-03)

`onboarding/welcome` (inicia `onboarding_short`) → `onboarding/session/[id]`
(loop `TraditionalForm` adapter) → `onboarding/result/[id]` (radar de estados +
vías). `onboarding/detail/[pillar]` corre `pillar_detail` (resultado `confirmed`).
`/home` consume `apiGetMyResults` (radar de estados reales + `PillarStatesGrid`
con badges de source + CTA detalle/re-evaluar + modal de confirmación N4).
`/team/[id]` muestra `assessment_states` (manager ve estados/vías, **no**
respuestas). Helpers en `lib/assessment-utils.ts`.

### Privacidad

Colaborador + coach + manager directo ven estados; nadie expone
`assessment_responses` al manager. RLS por org en todas las tablas por-user.

## Decisiones bloqueantes activas

| ID | Decisión | Bloquea |
|---|---|---|
| DEC-01 | Algoritmo de scoring del assessment | Motor de assessment |
| DEC-02 | Reglas de recomendación de path | Lógica de recomendación |
| DEC-03 | Identidad visual final | Todo el frontend |
| DEC-04 | Cliente piloto | Vista RRHH / piloto |
| DEC-05 | Contenido de los 20-25 escenarios | Onboarding |
| DEC-06 | ¿Diseñador UX externo? | Velocidad de wireframes |
| DEC-07 | Criterio de "pilar completado" | Lógica de progreso |

Ver `HG/Artifacts/HG_Kanban_v1.md` y `HG/Artifacts/HG_Backlog_Priorizado_v1.md`.
