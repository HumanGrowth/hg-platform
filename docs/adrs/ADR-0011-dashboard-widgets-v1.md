# ADR-0011 — Dashboard widgets v1 (Fase 1)

- **Estado:** Aceptado
- **Fecha:** 2026-06-20
- **Entregables relacionados:** B4-E
- **Relación:** consume `course_progress` (ADR-0008), `enrollments` + agregaciones
  on-demand (ADR-0009) e `invitations`. No introduce migraciones.

## Contexto

El doc `HG_Propuesta_Dashboard_Visualizaciones.md` (aprobado 17-jun-2026) define un
roadmap de visualizaciones en 3 fases. **Fase 1** son 8 widgets accionables, sin
customización drag-and-drop ni layouts por usuario. Hay que entregar dashboards
reales en `/home`, `/team` y `/admin/org` con lo que ya existe (sin motor de
assessment), reusando las agregaciones on-demand de ADR-0009.

## Decisión

- **3 endpoints densos multi-widget** (1 round-trip por página):
  - `GET /api/v1/me/widgets` (tag `home`): streak heatmap 90d + tiempo por semana 12w.
  - `GET /api/v1/manager/me/widgets` (tag `manager`): team activity 30d + buckets de inactividad.
  - `GET /api/v1/admin/org/widgets` (tag `admin`): curva de adopción 12m + funnel onboarding + tiempo por mes 12m.
- **Cálculo on-demand** desde `course_progress`/`enrollments`/`invitations`, en
  Python (DB-agnóstico, timezone UTC explícito). **Sin migraciones** ni tablas
  materializadas (sigue ADR-0009).
- **Cache HTTP `private, max-age=60`** en cada endpoint para mitigar carga.
- **Solo Recharts** (ya instalado). No visx, no d3, no dnd-kit — eso es Fase 2.
- **Layouts hardcoded por página** (no `user_dashboard_layouts` todavía — Fase 2).
- **K-anonymity no aplica** en esta fase: todo widget es del propio user / reportes
  directos / propia org (no comparativos cross-cohort).
- **Permisos** reusan los de las páginas existentes: `/me/*` = user autenticado
  (RLS); `/manager/me/widgets` = reportes directos (admin/superadmin → org como
  equipo extendido); `/admin/org/widgets` = admin de su org (superadmin con `?org_id`).

### Los 8 widgets (Fase 1)

| ID | Página | Widget |
|---|---|---|
| C-03 | /home | Streak heatmap 90d |
| C-04 | /home | Tiempo por semana (12w) |
| C-06 | /home | Progress rings por path activo |
| M-01 | /team | Team activity heatmap 30d |
| M-03 | /team | Inactivity funnel (buckets) |
| R-01 | /admin/org | Adoption curve (12m) |
| R-03 | /admin/org | Onboarding funnel |
| R-08 | /admin/org | Tiempo invertido por mes (12m) |

### Accesibilidad (WCAG AA, no-negociable)

Cada widget: `role="img"` + `aria-labelledby` (resumen), una `<table>` sr-only con
los datos exactos, tooltips con texto, animaciones desactivadas bajo
`prefers-reduced-motion` (hook + safety net en `globals.css`) y color que nunca es
el único portador de significado.

## Consecuencias

- ✅ `/home`, `/team`, `/admin/org` con dashboards reales — diferenciador comercial
  vs. un LMS tradicional.
- ✅ Widgets lazy-loaded (`React.lazy` + `Suspense`): no agregan peso al critical
  path de cada página.
- ⚠️ **Performance:** 1 endpoint adicional por page load, agregando on-demand.
  Aceptable hasta orgs ~500 usuarios; en B4-G se materializan en `daily_snapshots`.
- ⚠️ **Sin customización:** un user no puede ocultar/reordenar widgets. Fase 2
  (`user_dashboard_layouts` + dnd-kit) lo resuelve.
- ⚠️ El streak atribuye los minutos del progreso a su `last_played_at` (no hay event
  log de reproducción todavía) — aproximación aceptable para MVP.
