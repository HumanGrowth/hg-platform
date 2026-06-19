# Manager & RRHH B4-B — screenshots

Capturadas con Playwright + Chromium contra el stack local (frontend `next dev`
:3000 + backend host :8000 + DB seedeada). Login `admin@acme.test` para las vistas
de equipo; `superadmin@humangrowth.app` para el dashboard org (ver nota).

| Archivo | Pantalla |
|---|---|
| `01-team-dashboard.png` | `/team` — equipo del manager (admin de Acme ve la org) |
| `02-team-inactive-filter.png` | `/team` con filtro "Solo inactivos" |
| `03-team-detail.png` | `/team/[id]` — barras por pilar (P1 33%) + paths P1/P3 + completados |
| `04-assign-path-modal.png` | modal "Asignar nuevo path" (6 pilares; P1/P3 ya asignados) |
| `05-admin-org-dashboard.png` | `/admin/org` — KPIs + heat strip + distribución + top performers + CSV |
| `06-mobile-team-card.png` | `/team` en mobile (390px) con BottomNav role-aware |

**Nota (05):** `/admin/org` se capturó como **superadmin** porque el `AdminGate`
existente del route group `(admin)` es superadmin-only. El backend
`/admin/org/metrics` ya permite rol `admin`, pero exponer la ruta a org-admins
requiere un gate por-ruta (no global, para no abrir `/admin/orgs` de
provisioning). Queda como follow-up. Por eso 05 muestra la org de HG (datos
escasos) — la estructura del dashboard se ve completa.
