# HG Frontend — Next.js 14

App Router de la plataforma Human Growth.

## Stack
- Next.js 14 (App Router) + TypeScript
- Tailwind CSS + shadcn/ui (componentes accesibles, copiar a `components/ui/`)
- Auth.js v5 (NextAuth)
- TanStack Query (server state) + Zustand (UI state)
- React Hook Form + Zod (formularios)
- Recharts (radar chart de pilares)
- PostHog (analytics) + Sentry (errores)

## Setup local
```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm lint
pnpm typecheck
pnpm test
```

## Estructura
```
src/
├── app/
│   ├── layout.tsx           # Root layout (PostHog, QueryClient, ThemeProvider)
│   ├── page.tsx             # Landing pública / redirige a /home
│   ├── globals.css          # Tailwind base + tokens
│   ├── (auth)/              # login, register, magic-link
│   ├── (app)/               # rutas autenticadas
│   │   ├── home/            # Dashboard colaborador
│   │   ├── library/         # Biblioteca de carrera
│   │   ├── path/[id]/       # Detalle de path
│   │   ├── course/[id]/     # Player de video
│   │   ├── assessment/      # Onboarding y assessments de pilar
│   │   ├── profile/         # Perfil de aprendizaje
│   │   └── settings/
│   ├── manager/             # Vista manager
│   ├── hr/                  # Vista RRHH
│   └── admin/               # Panel HG interno
├── components/
│   ├── ui/                  # shadcn primitives
│   └── ...                  # componentes de dominio
├── lib/
│   ├── api.ts               # cliente axios + interceptores
│   ├── auth.ts              # config Auth.js
│   └── utils.ts             # cn(), helpers
└── styles/
```

## Convenciones
- Rutas autenticadas dentro del grupo `(app)`; layouts por rol.
- API server-side: usar `fetch` con cache de Next; cliente: TanStack Query.
- Formularios: siempre RHF + Zod.
- Tokens de color en `tailwind.config.ts` (definir tras DEC-03 — identidad visual).
