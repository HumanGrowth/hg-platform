# ADR-0003 — Adopción del design system beta como direction v1

- **Estado:** Aceptado
- **Fecha:** 2026-06-05
- **Entregables relacionados:** FE-01 → FE-08 (frontend v1)

## Contexto

La identidad visual final de Human Growth **no está firmada** (DEC-03 del kanban).
Sin embargo, existe un design system beta muy completo (tokens de color/tipo/
spacing/radii/shadows/motion, voice & tone, specs de componentes y lockups de
logo) construido a partir del set de logos. El frontend v1 necesita arrancar ya;
esperar a DEC-03 bloquearía semanas de trabajo de producto.

## Decisión

Adoptar el **DS beta como direction v1**, integrándolo de forma **tokens-based**:

- Los tokens viven como **CSS variables** (`globals.css` → `:root`) y en
  `tailwind.config.ts`. Los componentes (`components/ui/*`) consumen tokens
  semánticos (`bg`, `fg`, `border`, `orange-*`, etc.), nunca colores hardcodeados.
- El DS fuente se versiona en `packages/design-system/source/` (copia del beta).
- Un **banner `BETA · DIRECTION V1`** acompaña toda pantalla del app mientras
  DEC-03 no esté firmada.

## Riesgo

Si la identidad final (DEC-03) difiere de la beta, hay **rework cosmético**:
colores, fuentes o radii cambian.

## Mitigación

El swap es **config, no rewrite**:

1. Reemplazar valores en `globals.css` (`:root`) y `tailwind.config.ts`.
2. Si cambian las fuentes, ajustar `next/font` en `layout.tsx`.
3. Reemplazar `packages/design-system/source/` con el DS final.

Como los componentes referencian tokens semánticos (no hex), el cambio se
propaga solo. No debería tocarse lógica ni estructura de componentes. La
superficie de cambio está acotada a 2-3 archivos de tokens.

## Consecuencias

- ✅ El frontend avanza sin esperar a DEC-03.
- ✅ La deuda de identidad queda contenida y explícita (banner + este ADR).
- ⚠️ El equipo debe resistir hardcodear colores/medidas fuera de los tokens, o
  el swap deja de ser barato.
- ⚠️ Al cerrar DEC-03: actualizar tokens, quitar el `BetaBanner` y archivar este
  ADR como "superseded".
