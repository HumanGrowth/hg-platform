# HG Frontend — Next.js 14

App Router de la plataforma Human Growth. Marketing público (v2) + app (colaborador)
+ panel admin. Paleta marketing v1 y nav adaptativa: ver
`docs/adrs/ADR-0006-marketing-palette-v1-and-adaptive-nav.md`.

## Stack
- Next.js 14 (App Router) + TypeScript estricto
- Tailwind CSS con tokens del design system (sin shadcn como dep: primitives propios en `components/ui/`)
- Zustand (auth en memoria) · React Hook Form + Zod (formularios)
- axios (cliente API) · Recharts (radar de pilares) · lucide-react (iconos, stroke 1.75)
- Vitest + Testing Library

## Correr solo el frontend
```bash
pnpm install          # desde la raíz del monorepo
cd apps/frontend
pnpm dev              # http://localhost:3000
pnpm lint
pnpm typecheck
pnpm test
pnpm build            # output: standalone
```
El backend debe estar arriba en `http://localhost:8000` (CORS permite `:3000`).
Configurable vía `NEXT_PUBLIC_API_BASE_URL` (browser) y `API_BASE_URL_INTERNAL`
(server / API routes; en docker `http://backend:8000`).

> ⚠️ Corré el dev en **:3000**. El backend solo permite CORS desde `:3000`, así
> que las llamadas directas browser→backend (`/me`, admin) fallan en otros puertos.

## Design system (paleta marketing v1 — pending DEC-03)
- Paleta marketing v1 (firmada Jun 15): foundation `ink`/`slate`/`warm`/`cream`,
  marca `gold`/`forest`/`orange`/`amber`/`sage`, `pillar.p1–p6`.
- Tokens operativos: `src/app/globals.css` (`:root` + `[data-theme="dark"]`) y
  `tailwind.config.ts`. Los componentes usan tokens semánticos, **no hex**.
- Fuentes (`next/font` en `layout.tsx`): Anton→Poppins (display), Manrope→Lato
  (body), Instrument Serif, JetBrains Mono.
- **Swap a la identidad final:** editar esos 2 archivos (+ `next/font` si cambian
  fuentes). No se tocan componentes. Ver `docs/adrs/ADR-0006-...md` (sucede a 0003).
- Preview de componentes en `/_kit`.

## Reglas de voz (resumen del DS — respetarlas)
- Directo, dry, peer-to-peer. Sentence case en UI; ALL CAPS solo en display (Anton) y metadata.
- Nunca: **"journey", "unlock", "rockstar", "elevate"**. Sin emoji seeded.
- Números como numerales ("5 lecciones"), tiempo "20 min". `·` `→` `—` permitidos.

## Reglas visuales (no negociables)
- Canvas cream `#FAF3E8` (**nunca** `#fff`). Ink `#1A1A1A` (**nunca** `#000`). Primary `#E8530A`.
- Radii sharp (8 botones / 12 cards / 16 modales). Borders 1px ink low-alpha.
- Sin glassmorphism (salvo nav glass on scroll), sin gradients purple/blue, sin illustration hand-drawn.

## Estructura
```
src/
├── app/
│   ├── layout.tsx            # Root: next/font (6 familias) + Toaster
│   ├── globals.css           # tokens (:root) + base + utilidades .display/.eyebrow
│   ├── (marketing)/          # landing /, /paths, /for-teams, /pricing, /contacto (+ Nav/Footer)
│   ├── (auth)/               # login, accept-invite (+ layout centrado)
│   ├── (app)/                # home, library, path, radar(+[pillar]), profile (+ SideNav/TopBar/BottomNav)
│   ├── (admin)/              # admin/orgs, admin/orgs/[id] (AdminGate: superadmin)
│   ├── (onboarding)/         # onboarding/welcome, /scenario/[index], /result (full-screen cinematográfico)
│   ├── api/auth/             # route handlers: login, refresh, logout, accept-invite (cookie httpOnly)
│   └── %5Fkit/               # /_kit — preview de componentes
├── components/
│   ├── ui/                   # primitives (button, input, card, badge, avatar, chip, dialog, tabs, progress, eyebrow, display)
│   ├── marketing/            # Nav, Hero, LogoCloud, Features, PathCard, PathsCatalog, MentorStrip, Quote, PricingTable, Footer, ContactForm
│   ├── nav/                  # SideNav, BottomNav, TopBar, items
│   ├── radar/                # Radar (3 estados), MiniRadar, RadarView
│   ├── BetaBanner / Toaster / SessionGate / AdminGate / EmptyRing
├── lib/
│   ├── api.ts                # cliente (Next routes + backend), interceptor auto-refresh
│   ├── i18n.ts · locales/    # stub i18n (t() + getCopy), trees es/en
│   ├── onboarding-store.ts   # Zustand efímero (respuestas onboarding)
│   ├── auth-store.ts · validation.ts · pillars.ts · types.ts · toast-store.ts · utils.ts
└── middleware.ts             # gating de rutas por sesión + redirect "/" → /home con sesión
```

## Auth (resumen)
Access token en memoria (Zustand); refresh token en cookie **httpOnly** gestionada
por `/api/auth/*`. `middleware.ts` gatea por cookie; `SessionGate` rehidrata el
access token; `(admin)` exige rol `superadmin`. Sin self-service de orgs — solo
invitación (ver `docs/adrs/ADR-0002`).

## Catálogo (B2-09)
`/library` y `/path` consumen el catálogo PMM real (no mock):
- Cliente en `lib/api.ts`: `apiListPaths()`, `apiListCourses(filters)`,
  `apiListCoursesForPath(code, filters)`.
- Endpoints: `GET /api/v1/paths`, `/paths/{code}`, `/paths/{code}/courses`,
  `/courses` (filtros `level`/`competency`/`track`/`q`).
- Tipos en `types.ts`: `CareerPath`, `Course`, `CourseLevel` (L1..L6, **distinto**
  del `CareerLevel` del usuario), `CompetencyCode`, `CourseTrack`.
- `components/library/CourseCard.tsx` + `components/path/PathLanes.tsx`.
- Ver `docs/adrs/ADR-0007` y la sección "Catálogo PMM" de `docs/ARCHITECTURE.md`.

### Reproductor (B2-07)
- Ruta `/library/[slug]`: detalle del curso + `VideoPlayer` (HLS.js, dep
  `hls.js`) con controles custom del DS + teclado.
- `apiGetCourse(slug)` / `apiSaveProgress(slug, payload)`; `useThrottledProgress`
  guarda progreso cada 5s. Reanudación + marca completo al 80%.
- Ver `docs/adrs/ADR-0008`.

### Manager & RRHH (B4-B)
- Rutas: `/team` (dashboard manager), `/team/[id]` (detalle + asignar paths),
  `/admin/org` (RRHH KPIs + CSV). Nav adaptativa por rol ("Mi equipo" para
  manager/admin/superadmin).
- Consume `/api/v1/manager/*` y `/api/v1/admin/org/*` (cliente: `apiGetMyTeam`,
  `apiGetTeamMemberDetail`, `apiAssignPath`, `apiUnassignPath`, `apiGetOrgMetrics`,
  `apiExportOrgUsersCsv`). `AssignPathDialog` + `formatRelativeTime`.
- Ver ADR-0009 y la sección "Manager & RRHH" de `docs/ARCHITECTURE.md`.

### Widgets dashboard v1 (B4-E)
- 8 widgets (solo Recharts) en `components/widgets/` + `WidgetCard` wrapper, lazy-loaded
  por sección (`React.lazy` + `Suspense`) en `/home` ("Tu actividad"), `/team`
  ("Vista de equipo") y `/admin/org` ("Tendencias").
- Consume `apiGetMeWidgets` / `apiGetManagerWidgets` / `apiGetOrgWidgets`
  (`/api/v1/{me,manager/me,admin/org}/widgets`). Helpers en `lib/widget-utils.ts`.
- Accesibilidad WCAG AA: `role="img"` + `aria-labelledby`, `<table>` sr-only,
  `prefers-reduced-motion`, sin depender sólo del color.
- Ver `docs/adrs/ADR-0011` y la sección "Widgets dashboard v1" de `docs/ARCHITECTURE.md`.
