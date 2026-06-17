# ADR-0008 — Video player (HLS.js) + progress tracking

- **Estado:** Aceptado
- **Fecha:** 2026-06-17
- **Entregables relacionados:** B2-07
- **Relación:** sucede a [ADR-0007](ADR-0007-catalog-model-pmm-as-p1-subset.md) (catálogo PMM)

## Contexto

El catálogo vive en R2 servido por CDN (`cdn.humangrowth.io`) con HLS
multi-bitrate (480/720/1080). El MVP necesita reproducción adaptativa + tracking
simple de progreso por usuario.

## Decisión

- **HLS.js** (no Video.js / Plyr) por peso y control: player custom con controles
  propios alineados al DS (botones primitives + iconos lucide). Fallback a HLS
  nativo en Safari/iOS.
- **`CourseProgress` productivo**, RLS por org (`tenant_isolation`), unique por
  `(user_id, course_id)`. Se inserta al primer play (sin enrollment formal).
- **80%** como umbral fijo de completion (revisable cuando los coaches firmen
  criterios pedagógicos en B3-03). `completed_at` inmutable una vez seteado.
- **Throttling de 5s** para el guardado de progreso (~12 req/min de reproducción
  por usuario) + flush inmediato en saltos > 10 puntos y flush final en
  `pagehide`/unmount.
- **Sin enrollment**: el progreso arranca implícito al primer play. Enrollment
  formal (asignación manual de paths por manager/RRHH) queda en **B2-08**.

## Endpoints

- `GET /api/v1/courses/{slug}` → curso + progreso del usuario actual (o `null`).
- `POST /api/v1/courses/{slug}/progress` → upsert `{position_seconds, watch_pct}`.
  Ambos bajo `hg_app` + contexto de org (RLS). 404 si el curso no existe / inactivo.

## Consecuencias

- ✅ Demo end-to-end: catálogo → click → reproducción HLS adaptativa → progreso
  persistido → marcado completo al 80%.
- ⚠️ Sin enrollment no se puede asignar contenido obligatorio aún (B2-08).
- ⚠️ Las métricas de cohorte (B4-07) se reconstruyen desde `course_progress`
  (es la fuente de verdad del progreso ahora).
- ⚠️ El umbral 80% es un placeholder pedagógico hasta B3-03.
