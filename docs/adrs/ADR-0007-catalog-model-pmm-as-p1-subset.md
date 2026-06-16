# ADR-0007 — Modelo de catálogo: PMM v3 como subconjunto de P1 Carrera

- **Estado:** Aceptado
- **Fecha:** 2026-06-16
- **Entregables relacionados:** B1-09, B1-11, B2-06, B2-09

## Contexto

El catálogo de videos del Drive es **PMM v3** y operativiza únicamente el pilar
**P1 Carrera** del Marco Teórico. Los otros 5 pilares (P2 Propósito, P3
Relaciones, P4 Salud, P5 Paz interior, P6 Estabilidad) **no tienen videos
producidos hoy**. Hace falta un schema que:

- muestre el dashboard con las 6 dimensiones aunque sólo P1 tenga contenido,
- soporte la sub-clasificación PMM (competencias × niveles × tracks),
- no colisione con la nomenclatura `P1..P6` del Marco Teórico.

## Decisión

- `CareerPath` = los **6 pilares** del Marco Teórico (`code` P1..P6).
- `Course` se modela **bajo P1** con tres ejes de sub-clasificación:
  - `competency_code` ∈ {C1..C5} (nullable para foundations),
  - `career_level` ∈ {L1..L6} (enum nuevo `career_level_pmm`),
  - `track` ∈ {competency, foundation_ai, foundation_eth, foundation_specifics}.
- Los códigos del catálogo se llaman **C1..C5** para no chocar con P1..P6.
- El catálogo es **global al producto** (sin `org_id`, sin RLS): es contenido
  HG, no por organización. `Enrollment`/`CourseProgress`/`UserLearningProfile`
  sí son por usuario/org y quedan **draft hasta B2-08**.
- El enum `users.career_level` se extiende con **L5/L6** sin destruir los
  deprecados L4a/L4b (migración B2-01).
- Frontend: el tipo de nivel del catálogo se llama `CourseLevel` (L1..L6),
  distinto del `CareerLevel` del usuario (L1..L4b), para no colisionar.

## Endpoints (B2-06)

`GET /api/v1/paths` · `GET /api/v1/paths/{code}` · `GET /api/v1/paths/{code}/courses`
· `GET /api/v1/courses` (filtros `level`/`competency`/`track`/`q`). Todos
requieren auth; corren bajo `hg_superadmin` (catálogo global, sin RLS);
`Cache-Control: public, max-age=60`.

## Consecuencias

- ✅ El dashboard muestra las 6 dimensiones aunque sólo P1 tenga contenido.
- ✅ Cuando se produzcan videos para P2..P6 se cargan al mismo schema.
- ⚠️ El `track` foundations (AI/ETH/Specifics) es cross-competencia pero sigue
  bajo P1.
- ⚠️ `users.career_level` ahora incluye L1..L6 (L4a/L4b deprecados, no destruidos).
- ⚠️ Hoy sólo L1 tiene videos renderizados (C1/C2); L2/L3 tienen guiones "Done"
  pero sin video. Los manifests de L2/L3 están vacíos hasta producción.
