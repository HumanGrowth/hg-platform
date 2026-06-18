# ADR-0009 — Manager & RRHH: agregaciones on-demand

- **Estado:** Aceptado
- **Fecha:** 2026-06-18
- **Entregables relacionados:** B4-A (backend)
- **Relación:** consume `course_progress` (ADR-0008) y `enrollments` (este sprint)

## Contexto

Los dashboards de Manager y RRHH necesitan métricas de actividad y avance del
equipo / la org. Todavía **no hay `pillar_scores`** (el motor de assessment
B2-02/03 espera firma de coaches). Hace falta entregar valor con lo que existe:
`course_progress` (fuente de verdad de actividad) + `enrollments` (paths asignados).

## Decisión

- **Métricas on-demand**: se calculan en cada request desde `course_progress` +
  `enrollments`. **Sin Celery beat** por ahora — el scheduling (y las alertas
  push) se suman en B3-05 junto con Resend.
- **Enrollment productivizado** (migración B2-03, RLS por org): 1 usuario → N
  paths activos; asignación manual por manager/admin/superadmin (`source='manual'`;
  futuro `'auto'`). `UserLearningProfile` sigue draft.
- **Completion por pilar = cursos completados del path / cursos activos del path**
  (no requiere assessment). Actividad: `last_played_at > now-7d` activo;
  `> now-30d` cuenta para adopción.
- **Scores por pilar = placeholder** hasta el motor B2-02/03; cuando llegue, se
  suman al dashboard sin tocar lo existente.

## Endpoints

| Método | Ruta | Rol |
|---|---|---|
| GET | `/api/v1/manager/me/team` | cualquiera (ve sus reportes; admin/superadmin la org) |
| GET | `/api/v1/manager/users/{id}/detail` | reporte directo o admin/superadmin |
| POST | `/api/v1/manager/users/{id}/enroll` | idem |
| DELETE | `/api/v1/manager/users/{id}/enroll/{path_code}` | idem |
| GET | `/api/v1/admin/org/metrics` | admin (su org) · superadmin (`?org_id=`) |
| GET | `/api/v1/admin/org/users/export.csv` | idem |

Manager endpoints corren bajo `hg_app` + contexto de org (RLS). Los de `/admin/org`
corren bajo `hg_superadmin` (BYPASSRLS) con filtro explícito por org, para que
superadmin pueda inspeccionar cualquier org.

## Consecuencias

- ✅ Manager y RRHH demoables **hoy** con datos reales (cursos), sin esperar assessment.
- ✅ Cuando llegue el motor, se suman scores sin tocar el resto del dashboard.
- ⚠️ Performance: agregaciones on-demand pueden tardar 1-3s en orgs >100 usuarios.
  Aceptable MVP; futuro (B4-07): snapshot diario materializado en
  `org_assessment_aggregates` vía Celery beat.
- ⚠️ Sin beat no hay alertas push: el manager debe entrar al dashboard para ver
  inactivos.
