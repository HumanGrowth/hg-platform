# Dashboard widgets v1 (B4-E) — screenshots

Capturadas con Playwright + Chromium contra el stack local (frontend `next dev`
:3000 + backend host :8000 + DB seedeada/enriquecida para dev). Las páginas `(app)`
scrollean dentro de `<main>`, por eso `/home` y `/team` se capturan sobre el
elemento `main.overflow-auto` con viewport alto; `/admin/org` scrollea el documento
(fullPage).

| Archivo | Pantalla |
|---|---|
| `01-home-with-widgets.png` | `/home` colaborador con bloque "Tu actividad" (streak heatmap + tiempo por semana + progreso por path) |
| `02-streak-heatmap-detail.png` | Close-up del widget Racha de actividad (C-03) |
| `03-team-with-widgets.png` | `/team` con "Vista de equipo": team activity heatmap (M-01) + inactividad por tiempo (M-03) |
| `04-admin-org-tendencias.png` | `/admin/org` con "Tendencias": curva de adopción (R-01) + funnel onboarding (R-03) + tiempo invertido por mes (R-08) |
| `05-mobile-widgets-stacked.png` | `/home` mobile (390px) — widgets apilados verticalmente |
| `06-empty-state-adoption.png` | `/admin/org` de una org sin historial (Globex) → curva de adopción en empty state |
| `07-accessibility-sr-table.png` | Widget de racha con la capa accesible revelada: alt text `role="img"` + tabla sr-only (Día/Minutos) que lee el lector de pantalla |

**Login:** `collab1@acme.test` (01, 02, 05, 07), `admin@acme.test` (03, 04),
`admin@globex.test` (06).

**Accesibilidad (07):** no se corrió VoiceOver headless; en su lugar se reveló por
CSS la `<table class="sr-only">` + el `aria-label` del `role="img"` para mostrar
exactamente lo que anuncia el lector de pantalla. Cada widget incluye esta capa,
respeta `prefers-reduced-motion` y no depende sólo del color (datos en tabla +
tooltips con texto). Verificado además con DevTools "Emulate vision deficiency:
achromatopsia": los widgets siguen siendo legibles.

**Datos:** se enriqueció el progreso de `collab1/2/3@acme.test` (dev only, sin
migración) para poblar streak, team heatmap, adopción y funnel.
