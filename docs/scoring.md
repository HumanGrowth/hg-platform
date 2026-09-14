# Cómo se compone el score 0–100 (completion por dimensión)

- **Actualizado:** 2026-09-11 (FASE 1.4 del plan de feedback del manager + currícula custom).
- **Código fuente de verdad:** `apps/backend/src/hg/modules/badges/progression.py` (`recompute_dimension`).

## Los 3 componentes

Cada `(user, dimensión, nivel)` tiene un `completion_pct` 0–100 persistido en
`dimension_level_progress`, mezcla ponderada de hasta 3 componentes:

| Componente   | Fuente                                                                 | Función que lo calcula                       |
| ------------ | ----------------------------------------------------------------------- | --------------------------------------------- |
| Aprendizaje  | % de units publicadas del `(dimensión, nivel)` que el user completó   | `_learning_pct`                               |
| Assessment   | Valor 0–100 del último estado del assessment de esa dimensión          | `_assessment_pct` (`assessment/scoring.py`)   |
| Manager      | Promedio de las evaluaciones de comportamiento (última por comportamiento) | `_manager_pct` (`feedback/scoring.py`)     |

Los pesos de cada componente por dimensión viven en `dimension_scoring_config`
(catálogo global, sin RLS, gobernado por superadmin) — editables desde
`/admin/scoring` (panel superadmin, FASE 1.4) o `PUT /api/v1/admin/scoring-config/{dimension}`.

**Default:** `learning_weight=0.7`, `assessment_weight=0.3`, `manager_weight=0.0`.
El manager arrancó en 0 a propósito (FASE 1.1): el 3er componente existe en el
modelo de datos y en el motor de cálculo, pero no altera ningún score hasta que
alguien lo configure explícitamente.

## Renormalización

Los 3 pesos **no necesitan sumar 1**. La fórmula es:

```
completion = Σ(peso_i · valor_i) / Σ(peso_i)
```

sobre los componentes **presentes**. Un componente está "presente" si:

- Aprendizaje y Assessment: siempre presentes (su valor es 0 cuando no hay
  datos, no se excluyen).
- Manager: presente solo si el colaborador tiene **al menos una** evaluación de
  comportamiento activa en esa dimensión. Sin evaluaciones, `manager_pct` es
  `None` y se excluye del promedio ponderado — **no se lo castiga con un 0**
  por no haber sido evaluado todavía. El peso de manager se reparte
  proporcionalmente entre aprendizaje y assessment en ese caso.

Ejemplo: `learning_weight=0.4`, `assessment_weight=0.3`, `manager_weight=0.3`,
un colaborador con aprendizaje=100, assessment=0, sin evaluaciones de manager:

```
completion = (0.4·100 + 0.3·0) / (0.4+0.3) = 57.1
```

Si luego el manager lo evalúa y el promedio de sus comportamientos da 100:

```
completion = (0.4·100 + 0.3·0 + 0.3·100) / (0.4+0.3+0.3) = 70.0
```

## Escala del feedback del manager

`BehaviorEvaluation.rating` es 1..3 (`feedback/scoring.py`):

| rating | significado     | valor 0–100 |
| ------ | ---------------- | ----------- |
| 1      | Sin demostrar     | 0           |
| 2      | En progreso       | 50          |
| 3      | Demostrando       | 100         |

`_manager_pct` promedia el valor de la **última** evaluación por comportamiento
(no un histórico), sobre todos los `pillar_behaviors` **activos** de la
dimensión (de cualquier pilar, no solo el pilar en curso) que el colaborador
tenga evaluados.

## Recompute masivo

Cambiar los pesos de una dimensión **no** recalcula automáticamente el
`completion_pct` ya persistido de los usuarios existentes — hay que disparar
`POST /api/v1/admin/scoring-config/recompute` (opcionalmente `?dimension_code=CP`
para una sola dimensión). Es superadmin-only, idempotente, y toca
`dimension_level_progress` de **todos** los usuarios activos. En producción:
snapshot de Neon antes de correrlo (mismo guardrail que cualquier migración).

## Dos espacios de códigos

- **Producto** (`dimension_code` en `pillar_behaviors`, `dimension_scoring_config`,
  `dimension_level_progress`, `learning_units`): `CP · PR · RE · SA · PI · ES`.
- **Assessment** (`DimensionResult.dimension_code`): `P1 · P2 · P3 · P4 · P5 · P6A/P6B`.

El mapeo explícito vive en `assessment/scoring.py` (`DIMENSION_TO_ASSESSMENT_CODES`)
y `learning_units/dimensions.py` (`DRIVE_TO_CAREER_PATH`, para el career_path
P1..P6 del front). `pillar_code` es un sub-grupo DENTRO de una dimensión de
producto (P1..P5 + AI para CP) — no confundir con el código de dimensión del
assessment, que usa el mismo alfabeto por casualidad histórica.
