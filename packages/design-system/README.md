# @hg/design-system

> **v1 — pending DEC-03.** Identidad visual aún no firmada. Este DS beta se
> adopta como *direction* y se integra de forma **tokens-based**: cuando DEC-03
> cierre, el swap a la identidad final es **config** (CSS vars + tailwind), no
> reescritura. Ver `docs/adrs/ADR-0003-design-system-beta-as-v1.md`.

## Origen

`source/` es una copia (no symlink) del design system beta de Human Growth,
originado en `~/Andy/HG/Design/Human Growth Design System/`. Construido a partir
del set de logos (sin Figma ni codebase previo) — es una propuesta de dirección.

## Qué hay en `source/`

| Archivo | Uso |
|---|---|
| `README.md` | Voice/tone, principios visuales, "what we never do". **Léelo antes de escribir copy o UI.** |
| `colors_and_type.css` | Fuente de verdad de los tokens (color, type, spacing, radii, shadows, motion). |
| `assets/logo-*.svg` | 4 lockups (black, white, color, color-bg). |
| `preview/*.html` | Specs visuales de componentes (buttons, inputs, cards, badges…). |
| `hg-*.jsx`, `dashboard-*.jsx` | Pantallas de referencia — **inspiración, no portar literal**; reescribir contra shadcn + tokens. |

## Cómo se consume en el frontend

Los tokens viven duplicados como fuente operativa en:

- `apps/frontend/src/app/globals.css` → bloque `:root` (CSS variables) + `[data-theme="dark"]`.
- `apps/frontend/tailwind.config.ts` → colores, fonts, scale, radii, shadows, easing.

**Regla:** ante un cambio de identidad (DEC-03), se actualizan esos dos
archivos (y, si aplica, este `source/`). Los componentes no deberían cambiar.

## Reglas innegociables (resumen del README del DS)

- Primary `#FF4500`. Canvas `#FDF5E6` (cream, **nunca** `#fff`). Ink `#1A140F` (**nunca** `#000`).
- Display Anton ALL CAPS · Body Manrope sentence case · Serif Instrument italic (sparingly) · Mono JetBrains.
- Radii sharp (8 buttons / 12 cards / 16 modals). Borders 1px warm-ink low-alpha. Easing `cubic-bezier(0.32,0.72,0,1)`.
- Iconos Lucide stroke 1.75. Sin emoji seeded, sin glassmorphism, sin gradients purple/blue, sin illustration hand-drawn.
- Voice: directo, dry, peer-to-peer. Nunca "journey", "unlock", "rockstar", "elevate".
