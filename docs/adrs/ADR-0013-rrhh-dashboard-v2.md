# ADR-0013 · Dashboard RRHH v2: ventana única de actividad e insights agregados

- **Estado:** aceptado (implementado en local; pendiente de pasar a producción)
- **Fecha:** 2026-10-27
- **Autores:** @andy

## Contexto

El dashboard de RRHH (`/admin/org`) tenía dos problemas de datos y poco valor de seguimiento:

1. **Dos ventanas distintas.** Adopción contaba "activo" con 30 días (`ACTIVE_WINDOW_DAYS`) e inactividad
   con 21 (`INACTIVE_DAYS`). Alguien con 25 días sin entrar era activo e inactivo a la vez y
   `activos + inactivos ≠ total`.
2. **Redundancia.** Los KPI "Activos", "Inactivos" y la tarjeta "Necesitan seguimiento" repetían casi el
   mismo dato, y ninguno decía *a quién* contactar.

Además RRHH no veía cumplimiento de asignaciones, necesidades agregadas del assessment ni retención.

## Decisión

- **Una sola ventana: 21 días.** `ACTIVE_WINDOW_DAYS = INACTIVE_DAYS`. Activo = actividad en los últimos
  21 días; inactivo = el resto (incluye "nunca"). Invariante: `activos + inactivos == total`. El cambio
  aplica también a la comparativa del dashboard de manager, que usaba la misma constante.
- **Nuevo endpoint `GET /api/v1/admin/org/insights`** (admin/superadmin, mismo scope que
  `/org/metrics`) con: cumplimiento de asignaciones, lista de seguimiento, panorama de assessment y
  módulos estancados (>14 días). Todo on-demand (ADR-0009), sin migraciones ni tablas nuevas.
- **`/org/metrics`** suma completion sobre lo asignado, período anterior (21 días previos) para deltas
  y uso de licencias (cupo/pool vs usuarios activos + invitaciones pendientes).
- **Sin filtro por consentimiento en estos widgets.** Decisión de producto (2026-10-27): al ingresar a la
  plataforma el colaborador habilita a RRHH a ver su avance, así que la lista de seguimiento y el
  panorama de assessment incluyen a todas las personas del alcance. Por eso no hay widget de
  consentimiento. El roster de Empresa (`company/service.py`) tampoco filtra ya por `consent_hr`
  (se retiró después, "por ahora"); `consent_status` queda como dato informativo. El gate del
  manager sigue usando `consent_manager`.
- **Privacidad que se mantiene (invariante 3).** Nunca respuestas ítem por ítem. El panorama de
  assessment es agregado por dimensión (último `DimensionResult` por usuario) y se **suprime con menos
  de 5 personas** (`ASSESSMENT_MIN_GROUP`): no es un filtro de consentimiento, evita re-identificar en
  grupos chicos.
- **Retención por cohorte: descartada** tras evaluarla; no aportaba valor de seguimiento.

## Alternativas consideradas

- Mantener 30 días para adopción y solo explicarlo en la UI — no resuelve la inconsistencia numérica.
- Snapshot materializado para retención/estancados — innecesario al volumen actual; se reevalúa si
  `/org/insights` escala mal (ADR-0009).
- Un LLM para resumir necesidades — descartado: es agregación por SQL, no requiere AI (CLAUDE §7).

## Consecuencias

- Las cifras de adopción bajan respecto al cálculo de 30 días (es el efecto buscado).
- `/org/insights` hace varias consultas por request; cache HTTP de 60 s como los widgets.
- El umbral de grupo mínimo (5) y la ventana de estancamiento (14 días) viven como constantes en
  `people/org_insights.py`.
- Antes de producción, validar con legal que el consentimiento de ingreso cubre mostrar nombres y
  progreso individual a RRHH (texto vigente: `CURRENT_CONSENT_VERSION`).
