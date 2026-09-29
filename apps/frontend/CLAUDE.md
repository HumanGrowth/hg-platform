# CLAUDE.md — apps/frontend

Complementa el `CLAUDE.md` raíz (invariantes, dirección V2 y reglas de AI viven allá).

## Stack

Next.js 14 App Router · React 18 · TypeScript estricto · Tailwind · Zustand · react-hook-form + zod ·
axios · TanStack Query · Recharts · framer-motion · hls.js · lucide-react · Vitest + Testing Library.

## Rutas y acceso

- Route groups: `(marketing)` público · `(auth)` · `(app)` colaborador/manager · `(admin)` ·
  `(onboarding)`. Conviven rutas en inglés de V1 (`/home`, `/path`, `/radar`, `/team`, `/profile`) y
  en español más nuevas (`/modulos`, `/plan-accion`, `/dimensiones/[code]`, `/perfil`); antes de
  crear o renombrar una ruta, confirmar cuál está en uso real.
- `middleware.ts` solo gatea por presencia de cookie. El acceso por rol se hace por página con
  `SuperadminGate`, `OrgAdminGate` o `CompanyAdminGate`; la autorización real está en el backend.
- Superadmin "ver como org/empresa": `lib/acting-org.ts` y `lib/acting-company.ts` (solo lectura).

## Datos y auth

- Access token en memoria (`lib/auth-store.ts`); refresh token en cookie httpOnly `hg_refresh`
  gestionada solo por las rutas `app/api/auth/*` (`lib/server-api.ts`). Nunca guardar tokens en
  `localStorage`.
- Toda llamada al backend pasa por `lib/api.ts`; los tipos del contrato viven en `lib/types.ts` y
  deben coincidir con los schemas Pydantic (no usar `packages/shared-types`).
- Descargas con auth (CSV): `fetch` + Bearer + blob, no link directo.

## Contenido y dominio

- Nombres, códigos y estilos de las 6 dimensiones: `lib/dimensions.ts` y `lib/dimension-styles.ts`.
  Nunca hardcodear nombres de pilar ni colores.
- Agrupar por `pillar_number`, ordenar por `level_code`, `unit_number` (invariante 6 del raíz).
- Copy de UI en `lib/locales/es.ts` (canónico) y `en.ts` con la misma forma; acceso con `t()` /
  `getCopy()` de `lib/i18n.ts`. Cambiar una clave exige cambiarla en ambos.
- Flags de build: funciones en `lib/flags.ts` que leen `NEXT_PUBLIC_*` (testeables en vitest).

## Diseño y accesibilidad

- Solo tokens del design system (`globals.css`, `glass.css`, `tailwind.config.ts`); nada de hex
  hardcodeado. Componentes base en `components/ui/`, glass en `components/glass/`.
- **Sin confetti.** El éxito se marca con un glow sutil. Todo movimiento respeta
  `prefers-reduced-motion` (`lib/motion/useShouldAnimate.ts`).
- Las metáforas SVG por pilar se usan en cards, headers de dimensión y completion card, **no en el
  radar** (decisión firme).
- Player de units: 9:16 full-bleed, autoplay con fallback muted + hint, tap zones izquierda/centro/
  derecha, sin overlays pesados.
- Gráficos (Recharts) con `role="img"`, `aria-labelledby` y tabla sr-only (`WidgetSrTable`); nunca
  depender solo del color. Objetivo WCAG 2.1 AA.

## AI en la UI

- Mientras el flag esté apagado, el lugar de la feature muestra `components/shared/AISoonBadge.tsx`.
- Al activar una feature: estado de carga, error y "sin sugerencia" diseñados; la pantalla funciona
  igual si la AI falla. Marcar visualmente que el contenido fue generado por AI y dejar que el
  usuario lo edite o descarte.

## Tests y verificación

`pnpm lint && pnpm typecheck && pnpm test && pnpm build`. Tests junto al código en `__tests__/`
(setup en `src/test/setup.ts`). El CI no corre `pnpm test`: correrlo siempre localmente.
