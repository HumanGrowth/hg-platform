# HG · Release · Widgets + Métricas Audit (TASK 0 · items 2-3)

Fecha: 2026-07-31

## Endpoints de métricas existentes (backend)

| Endpoint | Router | Devuelve | Scope |
|----------|--------|----------|-------|
| `GET /me/home` | people `me_router` | `HomeDashboardOut` (stats, next_step, recent_activity, completion rates, enrollments) | user |
| `GET /me/widgets` | people `me_router` | `MeWidgetsOut` (streak, weekly_minutes) | user |
| `GET /assessment/me/results` | assessment | `MeResultsOut` (PillarResult[] latest) | user |
| `GET /assessment/me/radar` | assessment | `RadarHistoryOut` (current/previous) | user |
| `GET /manager/me/team` | people `manager_router` | `TeamResponse` (miembros + agregados) | equipo |
| `GET /manager/users/{id}/detail` | people `manager_router` | `TeamMemberDetailOut` | user (via manager) |
| `GET /manager/me/widgets` | people `manager_router` | `ManagerWidgetsOut` | equipo |
| `GET /admin/org/metrics` | people `admin_router` | `OrgMetricsOut` (+ `org_pillar_metrics`) | org |

## Estado de la data: **real, no mock**

`rg mock|hardcod|fixture|placeholder components/widgets` → **0 resultados**. Los
widgets consumen endpoints reales (confirmado en el audit del sprint anterior:
`HG_Home_Widgets_Audit.md` — todo Inicio es data real salvo el placeholder AI).

**⚠️ La premisa de TASK 2 ("widgets con data mock hardcoded") no se sostiene en el
código actual.** Lo que SÍ es cierto:
- (b) **cálculo distribuido**: las métricas se calculan en varios endpoints/servicios
  (people, assessment, org_pillar_metrics) — no hay un `MetricsService` único.
- No existen los endpoints canónicos que pide el spec: `GET /me/metrics`,
  `GET /team/metrics`, `GET /admin/org/{id}/metrics`.

## Riesgo de consistencia cross-role (lo real a resolver)

El mismo user visto desde `/perfil` (assessment `/me/results`) vs. `/team/[id]`
(`/manager/users/{id}/detail`) podría derivar el radar/score con lógica distinta.
La consolidación en un `MetricsService` **eliminaría ese riesgo** — ese es el valor
real de TASK 2, más que "reemplazar mocks".

## Recomendación para TASK 2

Antes de un refactor grande (MetricsService + 3 endpoints + hooks + reescritura de
widgets), **confirmar con Andy qué widget puntual muestra data incorrecta/inconsistente**
hoy. Si no hay un bug concreto, TASK 2 es un refactor de deuda técnica (valioso pero
no bloqueante para el release) y conviene acotarlo a: (1) unificar el cálculo del
radar/score por user en un helper compartido, (2) exponer `/me/metrics` que Inicio y
`/team/[id]` consuman igual. No inventar widgets nuevos (regla del spec §2.3).
