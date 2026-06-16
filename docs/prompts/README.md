# Prompts de Claude Code

Plantillas y prompts ejecutados para mover el Kanban de Human Growth.

## Activos

| Archivo | Propósito |
|---|---|
| `_TEMPLATE_resume_protocol.md` | Bloque reutilizable que sobrevive a `/compact`. Copiar al inicio de cada prompt nuevo. |

## Convenciones

- **Nombre:** `claude-code_<BLOQUE-XX>_<DESC>.md` (ej. `claude-code_B1-09_videos_to_r2.md`).
- **Modo recomendado por default:** `/effort high` con **Claude Opus 4.8**.
- **Una TASK = un commit** con prefijo Kanban (`feat(B1-XX): ...`).
- **Sub-commits intermedios** cada >25 min: `wip(B1-XX): partial — <qué>`.
- **Resume protocol obligatorio** al tope.
- **Status table al final** para tracking en vivo dentro del prompt.

## Workflow

1. Antes de empezar: actualizar el bloque `📌 Estado al iniciar` del prompt con SHA del último commit + tablas DB + tests pasando.
2. Abrir terminal en `~/Andy/HG/hg-platform/`, correr `claude`.
3. `/model claude-opus-4-8` y `/effort high` (o `medium` si la tarea es mecánica).
4. Pegar el prompt completo.
5. Esperar reporte y validar criterios uno por uno.
6. Al cerrar: mover el prompt a `_archive/` con `git mv` y actualizar Notion (kanban + journal).

## Histórico (`_archive/`)

| Prompt | Resultado | Cierre |
|---|---|---|
| `claude-code_DEV-03_DEV-04.md` | Esquema PG + RLS multi-tenancy | Día 2 · Jun 4 |
| `claude-code_DEV-06_DEV-07.md` | Auth JWT + RBAC + invitaciones | Día 3 · Jun 5 (AM) |
| `claude-code_Frontend-v1.md` | FE-01 → FE-08 (DS beta + auth + 6 páginas + admin panel) | Día 4 · Jun 5 (PM) |
| `claude-code_FU-01_02_03.md` | Fix Docker + tab Usuarios admin + QA refresh | Día 5 · Jun 6 |
| `claude-code_Sprint-A_remote_merge_issue1.md` | GitHub remote + merge a main + fix CI + ISSUE-1 | Día 6 · Jun 8 |

## Próximos prompts a escribir (orden sugerido)

1. **Sprint B** · Deploy productivo (`docs/prompts/claude-code_Sprint-B_deploy_productivo.md` — ya listo).
2. **B1-09** · Migración 111 videos CC360 → Cloudflare R2 (~2d) — destraba B1-11 y B2.
3. **B1-11** · Seed de 111 cursos en DB (1d) — depende de B1-09.
4. **(post-DEC)** Motor de assessment + recomendación path (~3d) — cuando los coaches firmen Decisions Kit.

## Issues abiertos
- **ISSUE-2** · CodeQL falla por falta GHAS — decisión de infra (habilitar o borrar `codeql.yml`).
