# ADR-0006 — Adopción de paleta marketing v1 + nav adaptativa (SideNav/BottomNav)

- **Estado:** Aceptado
- **Fecha:** 2026-06-16
- **Entregables relacionados:** FE-v2-01 → FE-v2-10 (frontend v2)
- **Relación:** sucede parcialmente a [ADR-0003](ADR-0003-design-system-beta-as-v1.md)
  (DS beta) en lo cromático/tipográfico.

> Nota de numeración: los ADR previos llegan hasta 0003. Se conserva el número
> ADR-0006 indicado en el prompt de FE-v2; 0004/0005 quedan reservados.

## Contexto

Andrés firmó (Jun 15) la **paleta marketing v1** y la jerarquía tipográfica.
A la vez, las decisiones UX/UI v1 piden un sitio de marketing público y una
navegación de app de **4 destinos** (Inicio · Mi Ruta · Mi Radar · Perfil) con
sidebar colapsable en desktop y bottom nav en mobile, más un **Radar** como
elemento visual diferenciador y shells de **onboarding cinematográfico**.

## Decisión

### 1. Paleta + fuentes v1 (swap tokens-based)

- Nueva paleta en `tailwind.config.ts`: foundation (`ink`, `slate`, `warm`,
  `cream`), marca (`gold`, `forest`, `orange`, `amber`, `sage`), semánticos y
  `pillar.p1–p6`.
- Los tokens semánticos (`bg`/`fg`/`border`) **siguen wired a CSS variables**;
  sólo se remapeó su valor en `globals.css` → toda la app v1 adopta la paleta
  sin tocar componentes (coherente con la filosofía de ADR-0003).
- Fuentes vía `next/font`: **Anton → Poppins** (display), **Manrope → Lato**
  (body), Instrument Serif, JetBrains Mono. Cadena de fallback en CSS.
- Aliases de compat (`orange-500`, `cream-300`, `warm-700/900`) para clases
  legacy que aún referencia la app v1; se migran cuando se toquen esas pantallas.

### 2. Route groups

`(marketing)` (público) · `(auth)` · `(app)` · `(admin)` · `(onboarding)`.
`/` es landing público; el middleware redirige a `/home` si hay sesión.

### 3. Nav adaptativa

`SideNav` (desktop, colapsable 240/64, estado en localStorage) + `BottomNav`
(mobile, 4 ítems) + `TopBar` (avatar, logout, toggle admin para superadmin).

### 4. Radar + onboarding

Componente `Radar` (Recharts) en 3 estados (empty/filling/complete) + `MiniRadar`.
Onboarding como **shells visuales** (sin scoring): el motor B2-02/B2-03 se hace
aparte cuando los coaches firmen los escenarios.

## Consecuencias

- ✅ Marketing público navegable + identidad v1 aplicada sin rewrite.
- ✅ Nav y Radar listos para conectar datos reales (assessment, featured-paths).
- ⚠️ Onboarding y Radar usan **datos mock**; el scoring real llega con B2-02/B2-03.
- ⚠️ Quedan aliases de color legacy: limpiarlos al migrar las pantallas v1.
- ⚠️ `BetaBanner` sigue presente hasta cerrar DEC-03 sobre identidad final.
