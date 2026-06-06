# HG Frontend — Next.js 14

App Router de la plataforma Human Growth (v1).

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

## Design system (v1 — pending DEC-03)
- Fuente: `packages/design-system/source/` (copia del DS beta). Leé su `README.md`
  para voice/tone y "what we never do".
- Tokens operativos: `src/app/globals.css` (`:root` + `[data-theme="dark"]`) y
  `tailwind.config.ts`. Los componentes usan tokens semánticos, **no hex**.
- **Swap a la identidad final:** editar esos 2 archivos (+ `next/font` en
  `layout.tsx` si cambian fuentes) y reemplazar `source/`. No se tocan componentes.
  Ver `docs/adrs/ADR-0003-design-system-beta-as-v1.md`.
- Preview de componentes en `/_kit`.

## Reglas de voz (resumen del DS — respetarlas)
- Directo, dry, peer-to-peer. Sentence case en UI; ALL CAPS solo en display (Anton) y metadata.
- Nunca: **"journey", "unlock", "rockstar", "elevate"**. Sin emoji seeded.
- Números como numerales ("5 lecciones"), tiempo "20 min". `·` `→` `—` permitidos.

## Reglas visuales (no negociables)
- Canvas cream `#FDF5E6` (**nunca** `#fff`). Ink `#1A140F` (**nunca** `#000`). Primary `#FF4500`.
- Radii sharp (8 botones / 12 cards / 16 modales). Borders 1px warm-ink low-alpha.
- Sin glassmorphism (salvo nav glass on scroll), sin gradients purple/blue, sin illustration hand-drawn.

## Estructura
```
src/
├── app/
│   ├── layout.tsx            # Root: next/font (4 familias) + Toaster
│   ├── page.tsx              # redirige a /home
│   ├── globals.css           # tokens DS (:root) + base
│   ├── (auth)/               # login, accept-invite (+ layout centrado)
│   ├── (app)/                # home, library, profile (+ shell: BetaBanner, SessionGate, TopNav)
│   ├── (admin)/              # admin/orgs, admin/orgs/[id] (AdminGate: superadmin)
│   ├── api/auth/             # route handlers: login, refresh, logout, accept-invite (cookie httpOnly)
│   └── %5Fkit/               # /_kit — preview de componentes
├── components/
│   ├── ui/                   # primitives (button, input, card, badge, avatar, chip, dialog, tabs, progress, eyebrow, display)
│   ├── BetaBanner / Toaster / TopNav / SessionGate / AdminGate / EmptyRing
├── lib/
│   ├── api.ts                # cliente (Next routes + backend), interceptor auto-refresh
│   ├── server-api.ts         # helpers server-side + cookie httpOnly
│   ├── auth-store.ts         # Zustand (access token en memoria)
│   ├── validation.ts         # schemas zod
│   ├── pillars.ts · types.ts · toast-store.ts · utils.ts
└── middleware.ts             # gating de rutas por sesión
```

## Auth (resumen)
Access token en memoria (Zustand); refresh token en cookie **httpOnly** gestionada
por `/api/auth/*`. `middleware.ts` gatea por cookie; `SessionGate` rehidrata el
access token; `(admin)` exige rol `superadmin`. Sin self-service de orgs — solo
invitación (ver `docs/adrs/ADR-0002`).
