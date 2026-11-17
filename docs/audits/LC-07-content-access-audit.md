# LC-07 · Auditoría de acceso a contenido (área + dimensión + pilar)

> 2026-11-16 · rama `feat/LC-company-lifecycle`. Regla única: `visible_units_predicate` (SQL) ≡ `unit_allowed` /
> `user_can_see_unit` (in-memory), ambas en `learning_units/area_access.py`; un test de paridad recorre la matriz
> área × dimensión × pilar. Invariante #6 de CLAUDE.md (agrupación por `pillar_number`) intacta.

## Corrección de la premisa del plan

El plan decía que el acceso directo por slug "solo revisa el área". **No era cierto**: `_published_unit_or_404`
(`learning_units/router.py`) ya filtra con `visible_units_predicate` (área + dimensión + pilar) en los 6 endpoints
que cargan una unit por slug. `user_can_see_unit()` —la función que el plan señalaba— era código muerto (sin
llamadores) y solo revisaba el área; ahora aplica la misma regla completa. Verificado con tests contra el código
sin tocar: detalle, `attempts/start` y `attempt` ya daban 404.

## Tabla de accesos

| Acceso | Gate de visibilidad | Hallazgo |
|---|---|---|
| `GET /modulos/by-dimension` | `visible_units_predicate` | ✅ |
| `GET /modulos/{slug}`, `…/attempts/start`, `…/attempt`, `…/blocks/{id}/complete`, `…/quiz/submit`, `…/reflection/submit` | `_published_unit_or_404` → predicado | ✅ (404 para dim./pilar/área deshabilitados) |
| `GET /modulos/feed` — unit "siguiente" y próximas | `path_engine` / `sequencing` → predicado | ✅ |
| `GET /modulos/feed` — **hero = intento abierto más reciente** | ninguno | ❌ **hueco real, corregido** (commit `fix(LC-07)`): mostraba título/slug de una unit cuya dimensión se deshabilitó DESPUÉS de empezarla (abrirla daba 404) |
| `GET /me/path` | `sequencing` → predicado | ✅ |
| `GET /admin/assignable-units` | predicado | ✅ |
| Asignar módulos a una persona / a una org / ítems de ruta custom | validación al **escribir** (área + dimensión/pilar) | ✅ al escribir; no se revalida al leer (ver abajo) |
| `GET /me/assignments` | ninguno al leer | ⚠️ issue aparte: una asignación previa a la revocación sigue mostrando título/slug |
| `GET /me/home` (`next_step`, actividad reciente) | derivado de intentos del usuario, sin predicado | ⚠️ issue aparte (misma clase que el hero; leído en código, no ejercitado con test) |
| `GET /me/tips`, `GET /me/pillar-tips` (`unit_slug`/`unit_title` de tips guardados) | ninguno | ⚠️ issue aparte, severidad baja (son notas propias del usuario) |
| `GET /me/onboarding` | dimensión `ON` (no gobernable por empresa, por diseño) | ✅ por diseño |
| `GET /me/timeline`, vistas de manager/RRHH (historial de intentos) | ninguno | ✅ por diseño: es historia del usuario, no oferta de contenido |
| Assessment (`/assessment/*`) | no referencia `LearningUnit` | ✅ |
| `/courses`, `/paths/{code}/courses` (catálogo PMM legado, públicos) | no aplica | fuera de alcance |

## Issues a abrir (no se cambiaron en LC-07)

1. `/me/assignments`: filtrar (o marcar como no disponible) las asignaciones cuya unit ya no es visible para la empresa.
2. `/me/home`: `next_step` y `recent_activity` no deberían ofrecer una unit no visible (misma causa que el hero del feed).
3. `/me/tips`: decidir si el título/slug de una unit no visible debe ocultarse en tips guardados.
