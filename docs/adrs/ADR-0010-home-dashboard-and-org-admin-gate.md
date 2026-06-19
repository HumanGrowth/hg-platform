# ADR-0010 — Home del colaborador real + gate de admin de org

- **Estado:** Aceptado
- **Fecha:** 2026-06-19
- **Entregables relacionados:** B3-04 (home real) · FU-12 (org admin gate)
- **Relación:** consume `course_progress` (ADR-0008) y `enrollments` (ADR-0009);
  reusa las agregaciones on-demand de people/service.

## Contexto

El `/home` del colaborador estaba mockeado (radar y progreso hardcodeados). Hay
que mostrarle su crecimiento real con lo que existe: `course_progress` (fuente de
verdad de actividad) + `enrollments` (paths activos). **Sigue sin haber
`pillar_scores`** (motor de assessment B2-02/03 pendiente de firma de coaches), así
que el home **no muestra scores** — muestra **completion rate por pilar**.

En paralelo, el panel `(admin)` estaba protegido por un único `AdminGate`
**superadmin-only**, lo que dejaba afuera a los **admin de org** (RRHH), que ya
tienen permiso backend sobre `/admin/org/metrics` (ADR-0009) pero no podían
navegar a su dashboard.

## Decisión

### Home agregado on-demand (`GET /api/v1/me/home`)

- Endpoint nuevo bajo `me_router` (prefijo `/me`, tag `home`), corre bajo `hg_app`
  + contexto de org (RLS) → **solo devuelve la data del usuario autenticado**.
- Devuelve:
  - `next_step`: curso en progreso (no completado y `watch_pct < 80`) con
    `last_played_at` más reciente; `null` si no hay ninguno.
  - `active_enrollments`: enrollments activos (reusa `list_user_enrollments`).
  - `pillar_completion_rates`: `{P1..P6}` = completados/activos del path (ADR-0009).
  - `recent_activity`: últimos 5 `course_progress` (completados + en progreso).
  - `stats`: `courses_in_progress`, `courses_completed`, `total_watch_minutes`,
    `month_watch_minutes` (suma del mes calendario actual) y `streak_days`.
- `streak_days` = días **consecutivos** con actividad terminando hoy o ayer; un
  hueco >24h rompe la racha (helper puro `streak_days(dates, today)`).
- **Sin scores ni lógica de assessment.** Las tarjetas de pilar muestran
  `completion_rate`, no puntajes.

### Split del gate: `SuperadminGate` + `OrgAdminGate` (FU-12)

- `AdminGate` (superadmin-only) → renombrado a **`SuperadminGate`**.
- Nuevo **`OrgAdminGate`** = admin **o** superadmin.
- Se **quita el gate global** del `(admin)/layout.tsx`; ahora el rol se valida
  **por página**:
  - `/admin/org` (dashboard RRHH de la propia org) → `OrgAdminGate`.
  - `/admin/orgs` y `/admin/orgs/[id]` (panel global de HG) → `SuperadminGate`.
- Sidebar del panel: "Organizaciones" solo para superadmin; "Dashboard org" para
  ambos. TopBar: "Modo admin" / "Panel de organización" visible para admin +
  superadmin y apunta a `/admin/org`.
- Backend ya correcto (ADR-0009): admin que pasa `?org_id` de otra org es
  **ignorado** (`_resolve_org` devuelve su propia org) — verificado con test.

## Consecuencias

- ✅ El colaborador ve su home real (próximo paso, racha, minutos del mes,
  completion por pilar, actividad) sin esperar el motor de assessment.
- ✅ Cuando llegue el motor, el radar de scores se suma al home sin tocar el
  resto (igual que en el dashboard de org).
- ✅ Los admin de org acceden a su dashboard; el panel global de HG queda
  reservado a superadmin, con privacidad cross-org garantizada por RLS + backend.
- ⚠️ Agregaciones on-demand por request (igual que ADR-0009): aceptable para MVP;
  el camino a snapshots materializados sigue vigente para escala.
