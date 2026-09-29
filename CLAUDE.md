# CLAUDE.md — hg-platform

Contexto permanente para Claude Code en el monorepo de Human Growth (HG). Lo que está acá aplica a
toda tarea. Detalle por capa: `apps/backend/CLAUDE.md` y `apps/frontend/CLAUDE.md` (se cargan al
trabajar en esas carpetas).

## 1. Qué es HG

Plataforma SaaS B2B2C de desarrollo humano y profesional para LatAm (arranque en Costa Rica). Una
empresa cliente compra licencias; sus colaboradores hacen un assessment de 6 dimensiones, reciben una
ruta de Learning Units (micro-módulos en video vertical + bloques interactivos) y su manager/RRHH ve
progreso agregado — nunca respuestas individuales.

- **6 dimensiones (pilares):** P1 Carrera e impacto · P2 Propósito y significado · P3 Relaciones y
  conexión · P4 Salud y bienestar · P5 Paz interior y claridad · P6 Estabilidad emocional y material.
  Códigos de Drive/contenido: CP, PR, RE, SA, PI, ES.
- **Niveles de carrera:** L1 … L6 (con L4a/L4b, L5a/L5b en las matrices).
- **Idioma del producto:** español (es) canónico; inglés (en) con la misma forma. Tono cercano, sin
  jerga motivacional vacía.
- **Estado:** V1 cerrada (beta en producción). Ciclo actual: **V2 = producto que se vuelve más
  inteligente y más visible con el uso** (ver §6 y §7).

## 2. Mapa del repo

```
apps/backend/     FastAPI + SQLAlchemy 2 + Alembic + Celery · Python 3.12 · uv
  src/hg/modules/<módulo>/   monolito modular (models, schemas, router, service, tasks)
  src/hg/core/               auth_middleware, tenancy, security, storage (R2), logging
  src/hg/api/v1/__init__.py  registro de todos los routers
  migrations/versions/       migraciones Alembic (prefijo de bloque: CE-05, LU-03, PF-02…)
  tests/                     pytest (Postgres + Redis reales)
apps/frontend/    Next.js 14 App Router · TypeScript estricto · Tailwind · pnpm
packages/design-system/      fuente del DS (tokens se operan desde apps/frontend)
packages/shared-types/       NO se usa hoy (los tipos del contrato viven en apps/frontend/src/lib/types.ts)
docs/             ARCHITECTURE.md, adrs/, prompts/, audits
```

Módulos backend: `identity`, `company`, `people`, `assessment`, `learning` (catálogo PMM legado),
`learning_units` (motor v2 de contenido, paths, tips, assignments), `paths`, `feedback`, `badges`,
`perspectives`, `community_events`, `consent`, `notifications`, `analytics`, `marketing`, `admin`, `ai`.

**Producción:** frontend Vercel (`app.humangrowth.io`) · backend Railway (`api.humangrowth.io`) ·
Postgres 16 en Neon · Redis + Celery en Railway · video HLS en Cloudflare R2 (`cdn.humangrowth.io`) ·
email Resend · Sentry · PostHog (instalado, sin instrumentar). Dominio único: `humangrowth.io`
(cualquier `.app` es regresión).

## 3. Comandos

```bash
docker compose up --build                 # stack local completo
make migrate                              # alembic upgrade head (en contenedor)
make seed-demo                            # migraciones + datos demo vía venv del host
```

**Verificación obligatoria antes de dar una tarea por terminada** (el CI no corre vitest ni mypy,
así que correrlos es responsabilidad de la sesión):

```bash
cd apps/backend  && uv run ruff check src tests && uv run mypy src && uv run pytest
cd apps/frontend && pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

Si un test ya fallaba antes del cambio, decirlo explícitamente; no "arreglarlo" en silencio.

## 4. Invariantes — no se rompen sin aprobación explícita de Andy

1. **Multi-tenancy por RLS.** Toda tabla con datos de usuario lleva `org_id` + `ENABLE` y `FORCE ROW
   LEVEL SECURITY` + política `tenant_isolation`. Requests autenticados corren como `hg_app` con
   `app.current_org_id` del JWT; solo flujos sin sesión o cross-tenant usan `hg_superadmin`
   (`get_db_as_superadmin`) con `require_role` + chequeo de org explícito. Ver ADR-0001.
2. **Nunca `db.commit()` a mitad de un handler.** En producción la conexión es `hg_runtime`
   (NOINHERIT); un commit intermedio revierte el `SET LOCAL ROLE hg_app` y la siguiente query falla
   con `permission denied` (P0 real, PR #57). Usar `db.flush()`; el commit lo hace la dependencia al
   final. Los tests corren como superuser y no lo detectan.
3. **Privacidad del assessment.** El manager y RRHH ven estados/vías por pilar, **nunca**
   `assessment_responses` item por item. `consent_change_log` y `data_access_log` son append-only.
4. **Migraciones.** Una por PR, con prefijo del bloque de trabajo, nunca editar una ya mergeada,
   siempre con `downgrade`. Tabla nueva con datos de usuario ⇒ RLS + grants a `hg_app` /
   `hg_superadmin` en la misma migración.
5. **Contratos de API.** Schemas Pydantic ↔ `apps/frontend/src/lib/types.ts` ↔ `lib/api.ts`. Un
   cambio de forma en uno exige el cambio en los otros en el mismo PR.
6. **Agrupación de contenido por `pillar_number` (1–6)**, orden `level_code ASC, unit_number ASC`.
   `dimension_code` es organizativo del Drive, no de la app. Nombres de pilares desde
   `apps/frontend/src/lib/dimensions.ts`; nunca hardcodear "Pilar N".
7. **Decisiones de producto cerradas:** Perspectivas y Eventos solo los gestiona superadmin; reevaluar
   = assessment completo scoped a una dimensión; asignaciones de módulos son aditivas (sin
   asignaciones se ve todo el catálogo publicado); pricing oculto por flag, no borrado.
8. **Secretos.** Nunca commitear `.env*` (salvo `.env.example`), llaves de service account ni
   credenciales. `docs/dev-credentials.md` está en `.gitignore` a propósito.

## 5. Cómo trabajamos

- **Ramas:** `main` protegida · `feat/<bloque>-<slug>`, `fix/…`, `refactor/…`. Nunca trabajar
  directo en `main`; si el working tree está sucio al empezar, avisar antes de crear la rama.
- **Commits:** Conventional Commits con prefijo de bloque (`feat(CE-05): …`). Una tarea = un commit;
  nunca mezclar refactor con cambio de comportamiento.
- **ADRs:** cualquier decisión que cambie arquitectura, modelo de datos, seguridad o dónde entra AI
  requiere ADR en `docs/adrs/` (plantilla `docs/ADR-template.md`). Hoy existen 0001–0003 y 0006–0012.
- **Docs:** si un cambio altera lo que describe `docs/ARCHITECTURE.md` o este archivo, actualizarlos
  en el mismo PR.
- **Prompts largos de Claude Code** viven en `docs/prompts/` con el resume protocol; al cerrar se
  mueven a `_archive/`.
- **Pensar antes de agregar:** no introducir librerías, servicios o abstracciones sin una razón
  explícita. La opción simple que escala es la preferida.

## 6. Dirección V2 (Roadmap v2, ago-2026)

Objetivos en orden de dependencia:

1. **Activar la capa de AI ya diseñada** (§7), empezando por el punto de mejor esfuerzo/impacto.
2. **Cerrar la brecha de observabilidad:** endpoint `/version` con git sha (hoy `/health` devuelve
   versión fija), dashboard `/admin/emails`, analytics poblado (hoy DRAFT), PostHog instrumentado
   en activación / completar módulo / reevaluar.
3. **Consolidar el modelo de progreso.** Conviven `Enrollment`/`CourseProgress` (catálogo PMM
   legado) y `LearningUnitAttempt` (motor v2). **Decisión pendiente** sobre cuál es la fuente de
   verdad: mientras tanto, no agregar features nuevas sobre el sistema legado; lo nuevo va sobre
   `learning_units`.
4. **Preparar la plataforma para más empresas cliente:** automatizar alta de org, licencias y
   contenido.
5. **Optimizar UX con datos**, no por percepción (depende del objetivo 2).

**Horizonte "Escala País"** (`docs` del proyecto: HG_Arquitectura_Escala_Pais_v1): el mismo monolito
se movería a AWS (ECS Fargate, Aurora PostgreSQL, Valkey, SQS) detrás de Cloudflare. Es arquitectura
objetivo, no actual: no introducir dependencias de AWS todavía, pero no tomar decisiones que la
bloqueen (ej. estado en memoria del proceso, jobs que asumen un solo worker, SQL no portable a
Aurora PG 16).

## 7. AI — principios y reglas (V2)

**Principio rector: AI propone, humano decide.** Ningún LLM toma decisiones sobre scoring del
assessment, ruta de carrera o asignación de contenido sin revisión humana. Cualquier LLM que toque
scoring o paths requiere ADR explícito (Propuesta Assessment v1.5, §8).

**Antes de usar un LLM**, justificar por qué no alcanza una regla, una búsqueda o SQL. Patrón de
referencia: `docs/ai-competency-match-design.md` (regla primero, LLM solo para lo que la regla no
resuelve).

**Assessment con AI — capas (decidido):**
- Capa 1 (hoy): instrumentos validados, cero AI. Es el gold standard y no se reemplaza.
- Capa A / v1.5: un chatbot *administra* los mismos ítems en formato conversacional; el scoring sigue
  siendo el del instrumento vía el `ScorerRegistry` existente.
- Capa B: NLP complementario solo con muestra LatAm propia de N≥500 con outcomes.
- **Descartado:** LLM que clasifica estados sin instrumento, análisis de tono/voz/rostro, "coach AI"
  que decide el path.

**Reglas de implementación para toda feature de AI:**
1. **Feature flag global** en `hg/config.py` (`ai_<feature>_enabled: bool = False`), siguiendo
   `ai_recommendations_enabled`. Con el flag apagado el frontend muestra `AISoonBadge` y el endpoint
   responde `enabled: false` sin llamar al proveedor. Se recomienda además poder apagarlo por org.
2. **Un solo cliente de LLM** en `hg/modules/ai/` (timeouts, reintentos, logging de tokens, costo y
   latencia, reporte a Sentry). Los modelos se configuran en settings, no hardcodeados en el código.
   No sumar frameworks de orquestación (LangChain y similares) sin ADR.
3. **Salida estructurada** (schema JSON validado con Pydantic); nunca parsear texto libre.
4. **Fuera del request path** cuando no sea conversacional: Celery o Message Batches para trabajo
   offline. Rate limit por usuario (precedente: 1/día en Plan de Acción).
5. **Privacidad:** mandar al proveedor lo mínimo necesario; nunca respuestas item por item del
   assessment ni PII que no haga falta; nunca datos de una org en el contexto de otra (ni como
   few-shot). Verificar en el módulo `consent` que el tratamiento está cubierto; si no lo está,
   parar y preguntar.
6. **Fallo elegante:** si el proveedor falla o excede el timeout, la UI sigue funcionando sin la
   parte AI. Nunca un 500 por culpa del LLM.
7. **Evaluación:** guardar propuesta + decisión humana (aceptó / editó / rechazó) para medir calidad.
   Los tests mockean el cliente; **el CI nunca llama a la API real.**
8. **Vector store / pgvector** solo si el volumen lo justifica; hoy el corpus es chico y un LLM-judge
   con contexto explícito alcanza.

**Puntos de entrada de AI** (Roadmap v2). Los que tienen `AISoonBadge` en el código hoy:

| # | Feature | Dónde |
|---|---|---|
| 1 | Por qué la respuesta correcta funciona para vos (feedback del quiz) | `components/modulos/blocks/QuizBlockView.tsx` |
| 2 | Reflexión guiada bajo el textarea | `components/modulos/blocks/ReflectionBlockView.tsx` |
| 3 | Síntesis personalizada al completar un unit | `components/modulos/UnitCompletionCard.tsx` |
| 4 | "Chatear con esta dimensión" (RAG) | nav del player, `components/modulos/UnitBackToBackPlayer.tsx` |
| 7 | Sugerencias sobre tips guardados | `app/(app)/plan-accion/page.tsx` + `POST /api/v1/me/plan-accion/ai-summary` (stub en `learning_units/tips_router.py`, flag apagado) |

Sin placeholder en el código hoy: **#5** recomendación diaria (inicio) y **#6** adaptar dificultad al
ritmo del usuario (overview del unit).

Roadmap v2 marca #1 y #7 como quick wins y el assessment conversacional como la apuesta de mayor
impacto. **El orden final no está decidido:** proponer, no asumir.

**⚠️ Antes de usar `ai_conversations`:** la tabla existe desde `B1-03` con `org_id`, pero **no tiene
RLS** (B1-04 solo la activó en `users` y `user_sessions`) y `hg_app` tiene grants sobre ella. La
primera migración de V2 que la use debe activar RLS + `tenant_isolation`. El modelo en
`modules/ai/models.py` sigue marcado como DRAFT.

## 8. Limpieza y refactor

- No borrar como "huérfano" lo que se carga por convención o registro: archivos de Next (`page`,
  `layout`, `route`, `loading`, `error`, `not-found`, `middleware.ts`), migraciones, tareas Celery,
  routers, modelos registrados por import, scripts de seed.
- Detectar código muerto con herramientas (ruff F401/F841/ERA001, vulture, knip, tsc) y verificar
  cada hallazgo antes de borrar.
- Comentarios: conservar los que explican **por qué** (decisiones, ignores de lint, referencias a
  ADR). Borrar solo los que repiten qué hace el código o son notas residuales.
- Renombres solo en símbolos internos de un módulo; nada que cruce frontend↔backend, DB, claves
  i18n o eventos de analytics.
- No "simplificar" código defensivo de auth, RLS, roles, consent o auditoría.
- Un commit por categoría de cambio; verificación completa (§3) después de cada uno.

## 9. Landmines conocidos

- Sync de Google Drive: la service account no tiene acceso de lector a la carpeta de contenido
  (acción administrativa pendiente, no de código).
- Cuota de Resend no confirmada: no asumir que el envío transaccional escala.
- `user_badges`: el catálogo se ve pero no hay lógica de unlock implementada.
- `SECRET_KEY` tiene default `change_me` y JWT es HS256: nunca depender del default fuera de dev.
- `middleware.ts` gatea por presencia de cookie; la autorización real siempre está en el backend.

## 10. Fuentes de verdad y conflictos conocidos

- **El código manda sobre la documentación.** Si encontrás una contradicción, señalala en la
  respuesta; no la resuelvas en silencio.
- `README.md` está desactualizado: menciona Auth.js/NextAuth, pero la auth real es JWT propio +
  refresh en cookie httpOnly vía `app/api/auth/*` (`next-auth` sigue en `package.json` sin imports
  en `src/`). También su roadmap B1 ya se completó.
- `HG_V1_to_V2_Handoff.md` ubica los nombres de pilares en `lib/pillars.ts`; hoy viven en
  `lib/dimensions.ts`.
- La tabla "Decisiones bloqueantes" de `docs/ARCHITECTURE.md` está parcialmente superada (el motor
  de assessment ya existe, ADR-0012); `ARCHITECTURE.md` tampoco cubre aún `company`,
  `learning_units`, `badges`, `perspectives`, `community_events`, `consent`.
- Documentos de producto y estrategia (fuera del repo, en `HG/Docs`): `HG_V1_to_V2_Handoff.md`,
  `HG_Roadmap_v2.docx`, `HG_Propuesta_Assessment_v1_5.md`, `HG_Guia_JSON_Mentor_v2.md`,
  `HG_Arquitectura_Escala_Pais_v1.md`.

Mantené este archivo corto y verdadero: si algo acá deja de ser cierto, corregilo en el mismo PR
que lo cambia.
