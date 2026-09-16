# Cómo se compone el score 0–100 (completion por dimensión)

- **Actualizado:** 2026-09-16 (corrección post-FASE 1.4: el manager pasa de ponderación a gate de aprobación).
- **Código fuente de verdad:** `apps/backend/src/hg/modules/badges/progression.py` (`recompute_dimension`).

## Los 2 componentes del score

Cada `(user, dimensión, nivel)` tiene un `completion_pct` 0–100 persistido en
`dimension_level_progress`, mezcla ponderada de 2 componentes:

| Componente   | Fuente                                                                 | Función que lo calcula                       |
| ------------ | ----------------------------------------------------------------------- | --------------------------------------------- |
| Aprendizaje  | % de units publicadas del `(dimensión, nivel)` que el user completó   | `_learning_pct`                               |
| Assessment   | Valor 0–100 del último estado del assessment de esa dimensión          | `_assessment_pct` (`assessment/scoring.py`)   |

Los pesos de cada componente por dimensión viven en `dimension_scoring_config`
(catálogo global, sin RLS, gobernado por superadmin) — editables desde
`/admin/scoring` (panel superadmin, FASE 1.4) o `PUT /api/v1/admin/scoring-config/{dimension}`.

**Default:** `learning_weight=0.7`, `assessment_weight=0.3`.

## Renormalización

Los 2 pesos **no necesitan sumar 1**. La fórmula es:

```
completion = (learning_weight·learning_pct + assessment_weight·assessment_pct) / (learning_weight+assessment_weight)
```

Aprendizaje y Assessment están siempre presentes (su valor es 0 cuando no hay
datos, no se excluyen).

Ejemplo: `learning_weight=0.7`, `assessment_weight=0.3`, un colaborador con
aprendizaje=100, assessment=0:

```
completion = (0.7·100 + 0.3·0) / (0.7+0.3) = 70.0
```

## El manager tiene la decisión final: gate de aprobación (no ponderación)

El feedback del manager **no** entra al cálculo numérico del `completion_pct`.
En su lugar, el badge de **nivel** de una dimensión requiere DOS condiciones
simultáneas:

1. `completion_pct >= level.unlock_threshold` (aprendizaje + assessment, como
   arriba).
2. **Aprobación del manager**: TODOS los `pillar_behaviors` **activos** de esa
   dimensión (de cualquier pilar) tienen una `BehaviorEvaluation.rating ==
   DEMOSTRANDO (3)` — la última evaluación por comportamiento, no un
   histórico. Si la dimensión no tiene comportamientos activos, la condición
   se considera cumplida vacíamente (no bloquea el badge).

Esto se calcula en `_manager_approved()` (`badges/progression.py`) y se
expone como `manager_approved: bool` en `BehaviorMatrixOut`
(`GET /api/v1/team/{user_id}/behavior-matrix`), consumido por
`BehaviorMatrixCard` en `/team/[id]` para mostrar el estado "Aprobado" /
"Pendiente de aprobación".

`row.manager_pct` sigue persistido en `dimension_level_progress` como
referencia informativa (promedio 0–100 de las evaluaciones del manager), pero
**no** participa en la fórmula de `completion`.

Nota de diseño: los sub-badges de pilar (completion de contenido puro) NO
están gateados por aprobación del manager — solo los badges de **nivel**,
porque `PillarBehavior` no tiene granularidad por nivel en el modelo de datos.

## Escala del feedback del manager

`BehaviorEvaluation.rating` es 1..3 (`feedback/scoring.py`):

| rating | significado     | valor 0–100 (solo informativo, `manager_pct`) |
| ------ | ---------------- | ---------------------------------------------- |
| 1      | Sin demostrar     | 0                                              |
| 2      | En progreso       | 50                                             |
| 3      | Demostrando       | 100                                            |

Solo el rating 3 (Demostrando) en **todos** los comportamientos activos
habilita el gate de aprobación.

## Recompute masivo

Cambiar los pesos de una dimensión **no** recalcula automáticamente el
`completion_pct` ya persistido de los usuarios existentes — hay que disparar
`POST /api/v1/admin/scoring-config/recompute` (opcionalmente `?dimension_code=CP`
para una sola dimensión). Es superadmin-only, idempotente, y toca
`dimension_level_progress` de **todos** los usuarios activos. En producción:
snapshot de Neon antes de correrlo (mismo guardrail que cualquier migración).

Este mismo recompute también reevalúa `manager_approved` y, si corresponde,
otorga el badge de nivel a colaboradores que ya tenían completion +
aprobación pero cuyo badge no se había disparado (p.ej. si el manager aprobó
antes de que el completion cruzara el threshold).

## Dos espacios de códigos

- **Producto** (`dimension_code` en `pillar_behaviors`, `dimension_scoring_config`,
  `dimension_level_progress`, `learning_units`): `CP · PR · RE · SA · PI · ES`.
- **Assessment** (`DimensionResult.dimension_code`): `P1 · P2 · P3 · P4 · P5 · P6A/P6B`.

El mapeo explícito vive en `assessment/scoring.py` (`DIMENSION_TO_ASSESSMENT_CODES`)
y `learning_units/dimensions.py` (`DRIVE_TO_CAREER_PATH`, para el career_path
P1..P6 del front). `pillar_code` es un sub-grupo DENTRO de una dimensión de
producto (P1..P5 + AI para CP) — no confundir con el código de dimensión del
assessment, que usa el mismo alfabeto por casualidad histórica.
