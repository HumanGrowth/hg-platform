# Prompt Claude Code · Ciclo de vida de licenciamiento por Empresa (bloque LC)

> **Modo recomendado:** `/effort high`. Sprint **LC-1** (TASKs 01–08) se entrega en un PR por TASK o en una
> sola rama con un commit por TASK. **LC-2** (TASKs 09–11) es posterior y **no arranca sin visto bueno de Andy**.
> Redactado el 2026-11-16 a partir del análisis de licencias hecho sobre el código (rama `main`).

---

## ⚙️ Resume protocol

Si la sesión se compacta o reinicia:

1. Releé este prompt entero (`docs/prompts/claude-code_company_lifecycle.md`) y `CLAUDE.md` §4–§5.
2. Verificá estado:
   ```bash
   git status && git log --oneline -10
   cd apps/backend && uv run alembic heads   # debe ser UN solo head
   ```
3. Buscá TASKs `🟧 IN PROGRESS` y reanudá desde el último criterio sin tildar.

## 🧱 Reglas duras

- **Rama nueva desde `main`:** `feat/LC-company-lifecycle`. El working tree actual está en `feat/SP-03-support-attachments`
  con `.claude/` sin trackear: **avisá a Andy antes de crear la rama**, no mezcles este trabajo con soporte.
- **Un commit por TASK**, Conventional Commits con prefijo `feat(LC-0X): …`. Nunca mezclar refactor con cambio de comportamiento.
- **Editá ESTE archivo al avanzar** (status + `[x]`). No avances si la TASK actual no está `✅ DONE`.
- **CLAUDE.md §4 aplica completo.** En particular: (2) nunca `db.commit()` a mitad de un handler, usá `db.flush()`;
  (4) una migración por PR, prefijo de bloque `LC-`, con `downgrade`, nunca editar una mergeada; (5) contratos
  Pydantic ↔ `apps/frontend/src/lib/types.ts` ↔ `lib/api.ts` en el mismo PR.
- **NO** tocar: motor de assessment, scorers, catálogo, lógica de roles manager/RRHH, módulo `support`.
- **NO** instalar dependencias nuevas. **NO** introducir dependencias de AWS (horizonte Escala País).
- **NO** borrar datos: nada de este bloque usa `hard_delete_user` ni `DELETE` sobre usuarios o empresas.
- **NO ejecutar nada contra producción.** Todo lo que toque datos reales de CESA (TASK 08) se entrega como script
  con `--dry-run` por defecto y lo corre Andy.
- Verificación obligatoria antes de cerrar cada TASK (el CI no corre vitest ni mypy):
  ```bash
  cd apps/backend  && uv run ruff check src tests && uv run mypy src && uv run pytest
  cd apps/frontend && pnpm lint && pnpm typecheck && pnpm test && pnpm build
  ```
  Si un test ya fallaba antes del cambio, decirlo; no arreglarlo en silencio.

## 📌 Contexto (hechos verificados en el código, 2026-11-16)

- **No existe una entidad "licencia".** Licencia usada = `users.is_active = true`; pool = `companies.licenses_total`;
  `identity.service.company_active_users()` es el único cómputo. `check_license_available()` se llama al aceptar
  invitación y al reactivar un usuario (`update_user`).
- `companies.is_active` y `organizations.is_active` **existen pero ningún código los valida** (ni login, ni
  `get_current_user`, ni contenido). Ponerlos en `false` no hace nada.
- `companies.billing_status` es texto libre (default `"trial"`); `contract_start`/`contract_end`/`billing_cycle`
  existen y **nada los usa**.
- Hoy la única forma de cortar acceso es desactivar usuarios uno por uno (`PATCH /admin/users/{id}`), que no deja
  registro de auditoría (solo `hard_delete_user` escribe un `logger.warning`).
- `get_current_user` (`core/auth_middleware.py`) valida `user.is_active` en cada request; `refresh_tokens` y `login`
  también. Access token = 30 min, refresh = 14 días. Es el punto natural de enforcement.
- Visibilidad de contenido: `learning_units/area_access.py::visible_units_predicate` filtra por área, dimensión
  habilitada y pilar en **listados**; `user_can_see_unit()` (acceso directo por slug) **solo revisa el área**.
- Los endpoints de `company_router` y `admin_router` corren con `get_db_as_superadmin` (BYPASSRLS) aunque el actor
  sea `company_admin`: cualquier chequeo de ciclo de vida debe aplicarse sobre el **actor**, no sobre el rol de DB.
- Bulk import (`POST /company/members/bulk-import`): `_license_warnings()` devuelve advertencias **después** de
  procesar y **no bloquea**; con `send_invitations=true` los correos salen en la misma llamada.
  `POST /company/invitations/send` envía sin ningún chequeo de cupo.
- Video HLS se sirve desde `cdn.humangrowth.io` (R2). `core/storage.py` no firma URLs: **el CDN es público**.
  Bloquear la API no impide que alguien con una URL ya copiada siga viendo ese video.
- Head de Alembic al redactar: `st05termsaccept`. **Verificá con `alembic heads`** antes de crear la migración.

## 🧠 Decisiones firmadas por Andrés (2026-11-16, no re-debatir)

1. **Gracia = solo lectura de progreso.** Durante la gracia el usuario ve su progreso/perfil; no consume contenido,
   no hace assessment, no escribe. Duración: **`grace_days`, default 30, configurable por empresa** (default
   propuesto por Claude, **pendiente de confirmar por Andy**).
2. **Cupo cuenta al aceptar** (como hoy). Las invitaciones no consumen licencia hasta que se aceptan.
3. **El bulk debe alertar antes de poder enviar invitaciones.** Si el uso proyectado supera el pool, el envío se
   frena hasta que alguien reconozca explícitamente el sobrecupo (TASK 06).
4. **Retención: dirección = anonimizar** (no borrar) para reutilizar datos al generar perfiles profesionales.
   La política exacta y los plazos están **pendientes de criterio legal** (ver TASK 10). **No se implementa
   anonimización en LC-1.**
5. Suspender una empresa **no toca a sus usuarios**: el estado vive en la empresa. Nunca más se corta una empresa
   desactivando usuarios en masa.

## 🔭 Modelo objetivo

Estados de `companies.status` (varchar + CHECK, no enum de Postgres):
`trial → active → grace → suspended → terminated`.

| Estado | Quién entra | Qué puede hacer | Notas |
|---|---|---|---|
| `trial` / `active` | todos | todo | Igual que hoy. |
| `grace` | usuarios, manager, RRHH, company_admin | **Solo GET de progreso/perfil/dashboards/export**, soporte y auth (logout/refresh). Nada de contenido, assessment, invitaciones ni escrituras. | Termina en `grace_ends_at` = fecha de entrada + `grace_days`. No se aceptan invitaciones nuevas. |
| `suspended` | solo `superadmin` | Usuarios y admins reciben 403 `company_suspended`. | Datos intactos. Reversible a `active`. |
| `terminated` | solo `superadmin` | Igual que `suspended`; marca el inicio del reloj de retención (TASK 10). | Reversible solo por superadmin mientras no se anonimice. |

Transiciones permitidas: `trial→active`, `trial→grace`, `active→grace`, `grace→active`, `grace→suspended`,
`active→suspended` (corte de emergencia, requiere motivo), `suspended→active`, `suspended→terminated`,
`terminated→suspended` (rescate). Todo lo demás es 409.

Contrato de error (usar el mismo en todo el enforcement):
`403 {"detail": {"code": "company_read_only" | "company_suspended" | "company_terminated", "message": "<es>", "grace_ends_at": "<iso|null>"}}`.
Revisá cómo `lib/api.ts` hoy interpreta `detail` (en otros endpoints es string) y adaptalo sin romper lo existente.

---

# TASKS — Sprint LC-1

## TASK LC-01 · ADR-0016 + docs · `✅ DONE` (2026-11-16)

- Crear `docs/adrs/ADR-0016-ciclo-de-vida-de-empresa.md` con la plantilla `docs/ADR-template.md`: contexto
  (hechos de arriba), decisión (modelo objetivo, enforcement único, `company_lifecycle_events` append-only,
  suspender ≠ desactivar usuarios), alternativas descartadas (desactivar usuarios en masa; usar `is_active` +
  `billing_status`; facturación automática ahora), consecuencias y riesgos.
- Incluir en el ADR una sección **"Exposición del CDN"** con el hallazgo (R2 público, sin URLs firmadas) y la
  decisión **diferida**: no se implementan URLs firmadas en este bloque; se registra como deuda de seguridad.
- Actualizar `CLAUDE.md` §4 (#7: "el estado de acceso de una empresa vive en `companies.status`") y
  `docs/ARCHITECTURE.md` si describe licencias.
- [x] ADR-0016 creado · [x] sección CDN · [x] CLAUDE.md §4 #7 + ARCHITECTURE.md (nota; describía `organizations.licenses_used`, que no existe)
- **Aceptación:** ADR enlazado desde `CLAUDE.md` (lista de ADRs existentes: 0001–0003 y 0006–0016).
  Nota: el Project de Claude tiene otro `ADR-0013-assessment-conversacional-y-memoria-hugie` que choca con
  `ADR-0013-rrhh-dashboard-v2` del repo; **no lo renumeres tú**, solo anótalo en el PR para que Andy decida.

## TASK LC-02 · Migración `LC-01_company_lifecycle` · `✅ DONE` (2026-11-16)

Una sola migración, con `downgrade`:

1. `companies`: agregar `status varchar(20) NOT NULL` con `CHECK (status IN ('trial','active','grace','suspended','terminated'))`,
   `status_changed_at timestamptz NOT NULL DEFAULT now()`, `status_reason text NULL`,
   `grace_days integer NOT NULL DEFAULT 30 CHECK (grace_days BETWEEN 0 AND 180)`, `grace_ends_at timestamptz NULL`.
2. **Backfill** dentro de la migración: `is_active = false → 'suspended'`; `is_active = true AND billing_status = 'trial' → 'trial'`;
   resto → `'active'`. Después quitar el default de `status` (lo maneja la app).
3. Tabla `company_lifecycle_events` (**append-only**): `id uuid pk`, `company_id uuid FK companies ON DELETE CASCADE`,
   `event_type varchar(40)` (`status_change`, `overage_acknowledged`, `grace_extended`, …), `from_status`, `to_status`,
   `actor_user_id uuid NULL FK users ON DELETE SET NULL`, `reason text`, `metadata jsonb DEFAULT '{}'`,
   `created_at timestamptz DEFAULT now()`. Índice `(company_id, created_at DESC)`.
   - Sin RLS (mismo criterio que `companies`: raíz de tenant, solo la opera superadmin / servicios con `hg_superadmin`).
   - **Grants:** `hg_superadmin`: `SELECT, INSERT`. **`REVOKE UPDATE, DELETE`** explícito sobre `hg_app`, `hg_superadmin`
     y `PUBLIC`: la migración B1-04 hizo `ALTER DEFAULT PRIVILEGES … GRANT ALL`, así que un GRANT angosto **no** alcanza.
     Verificá con un test que `UPDATE`/`DELETE` fallan con `permission denied`.
4. **Dejar `companies.is_active` en su lugar pero deprecado** (comentario en el modelo): no se renombra ni se borra en
   este bloque. `billing_status` sigue siendo dato comercial libre hasta una fase de facturación.
- [x] columnas + backfill + CHECK · [x] `company_lifecycle_events` append-only con REVOKE · [x] `is_active` deprecado en el modelo
- Notas: revision `lc01companylifecycle` (archivo `LC-01_company_lifecycle.py`); también se agregó `CHECK grace_days` y el import de `company.models` en `migrations/env.py`. Probado en la DB local (upgrade/downgrade/upgrade); `make migrate` usa el contenedor, se corrió `alembic` del venv del host.
- **Aceptación:** `make migrate` y `alembic downgrade -1` funcionan; un solo head; test de grants pasa.

## TASK LC-03 · Servicio único de transiciones · `✅ DONE` (2026-11-16)

- Nuevo módulo `apps/backend/src/hg/modules/company/lifecycle.py` con `transition_company(db, *, company_id, to_status,
  actor, reason, dry_run=False)` como **único** escritor de `status`. Valida la matriz de transiciones, exige `reason`
  no vacío en `suspended`/`terminated`/`active→suspended`, calcula `grace_ends_at` al entrar a `grace`
  (`now + grace_days`), escribe el evento y hace `db.flush()` (nunca commit).
- `dry_run=True` devuelve un `LifecyclePreview` sin escribir: usuarios activos afectados por rol, invitaciones
  pendientes, admins/company_admin, fecha de fin de gracia resultante.
- **Superadmin nunca queda bloqueado**: la lógica de enforcement (LC-04) lo exime; este servicio impide suspender la
  empresa a la que pertenece el último superadmin activo (409).
- [x] `transition_company` único escritor · [x] `dry_run` → `LifecyclePreview` · [x] guardia del último superadmin
- Notas: errores como `HTTPException` con `detail={code,message}` (404 `company_not_found`, 409 `invalid_transition`/`last_superadmin`, 422 `reason_required`/`invalid_status`). Motivo exigido para `suspended`/`terminated`. `actor=None` = proceso automático (LC-09). "Último superadmin" = la empresa aloja a un superadmin activo y no hay otro superadmin activo en otra empresa.
- **Aceptación:** tests unitarios de la matriz completa (cada transición válida e inválida), de que el evento se
  escribe, de que `dry_run` no escribe, y del límite del último superadmin.

## TASK LC-04 · Enforcement único · `✅ DONE` (2026-11-16)

Una función `assert_company_allows(request_method, request_path, user, company)` usada desde:
`get_current_user` (agregá `request: Request`), `identity.service.login`, `refresh_tokens`, y el flujo de **aceptar
invitación** (no autenticado: bloquear si la empresa de la invitación no está en `trial`/`active`).

Reglas (ver matriz arriba):
- `user.role == superadmin` → siempre permitido.
- `trial`/`active` → permitido.
- `grace` → **allowlist** explícita (deny por defecto): `GET` de endpoints de progreso/perfil/dashboards propios y de
  manager/RRHH/company_admin (incl. export CSV), `/auth/refresh`, `/auth/logout`, endpoints de `support` (los tickets
  siguen funcionando) y un `GET /me` que ya incluya el estado. **Construí la allowlist auditando los routers
  registrados en `api/v1/__init__.py`**, no a ojo: listá cada ruta con su decisión en una tabla dentro del PR.
  Todo lo demás → 403 `company_read_only`. Si `now > grace_ends_at` y el estado sigue en `grace`, tratá la empresa como
  `suspended` (defensa en profundidad por si el job de LC-09 aún no corrió).
- `suspended` / `terminated` → 403 `company_suspended` / `company_terminated`. Solo `/auth/logout` pasa.
- **Login:** el 401 genérico `_INVALID_CREDENTIALS` se mantiene para credenciales malas. **Solo después de verificar la
  contraseña** devolvé el 403 con código de empresa (así no se filtra qué emails existen).
- El chequeo se hace sobre el **actor** (`user.company_id`), no sobre el rol de DB: `company_router` usa
  `get_db_as_superadmin` y debe quedar cubierto igual.
- Costo: una lectura por PK a `companies` por request. Medila; si pesa, cachear en Redis con TTL ≤ 30 s y
  documentar que la revocación tarda como máximo ese TTL. No optimizar antes de medir.
- **Tests** (Postgres real, como el resto de la suite): suspendida no puede login ni refresh; token emitido antes de
  suspender muere en el siguiente request; en gracia GET de progreso pasa y POST de contenido/assessment da 403;
  company_admin en gracia puede exportar pero no invitar; aceptar invitación bloqueado en gracia/suspendida;
  superadmin de una empresa suspendida entra; **aislamiento**: suspender empresa A no afecta a B; reactivar restaura todo.
- [x] `assert_company_allows` (`company/access.py`) en `get_current_user`, `authenticate`, `refresh_tokens` · [x] accept-invite bloqueado fuera de trial/active · [x] allowlist deny-por-defecto (`company/grace_policy.py`) · [x] tabla de rutas (`docs/audits/LC-04-grace-route-table.md`) · [x] tests (`test_company_enforcement.py`, 24)
- Notas / hallazgos:
  - Rutas por **plantilla + método**; test `test_grace_policy_covers_all_routes` falla ante rutas autenticadas sin clasificar.
  - Costo medido en local: lectura de `companies` por PK p50 0.40 ms / p95 0.50 ms → **sin caché Redis** (no optimizar antes de medir en Neon/Railway; superadmin no la paga).
  - **Plan vs. código:** el plan dice "company_admin en gracia puede exportar", pero el único export CSV de RRHH (`/admin/org/users/export.csv`) exige rol `admin`/`superadmin`, no `company_admin`. El test cubre `admin` (export OK) y `company_admin` (lee `/company/members`, no invita). No se cambió el RBAC.
  - **Criterio a confirmar por Andy:** en gracia `POST /me/consent` queda denegado (regla "nada de escrituras"), lo que impide retirar un consentimiento durante la gracia. Revisar con legal; si debe poder retirarse, mover esa ruta a `GRACE_ALLOW`.
  - Rutas sin sesión (`/courses`, `/paths/{code}/courses`, `/perspectives*`) no pasan por `get_current_user` y no se pueden bloquear por empresa.
  - El 403 con `detail` dict aún no lo interpreta `lib/api.ts` → se adapta en LC-05 (mismo PR/rama).
- **Aceptación:** todos los tests nuevos + suite completa verdes.

## TASK LC-05 · Endpoints superadmin + UI de administración · `✅ DONE` (2026-11-16)

Backend (`company/router.py`, `admin_router`, solo `superadmin`):
- `POST /admin/companies/{id}/status` body `{to_status, reason, dry_run?, confirm_slug?}`. Para `suspended`/`terminated`
  exigir `confirm_slug == company.slug` (confirmación tipo "escribí el nombre") salvo `dry_run`.
- `GET /admin/companies/{id}/events` (historial paginado).
- `CompanyOut` suma `status`, `status_changed_at`, `grace_ends_at`, `grace_days`.
- `/me` (o el endpoint que ya use el frontend para el usuario actual) expone `company_status` y `grace_ends_at`.

Frontend (`apps/frontend/src/app/(admin)/admin/companies/page.tsx` y `lib/types.ts`, `lib/api.ts`):
- Columna/chip de estado; acción "Cambiar estado" con **vista previa (dry-run)** → muestra números → pide motivo →
  confirmación escribiendo el slug → aplica. Historial de eventos visible.
- Para usuarios finales: pantalla/estado claro en 403 (`company_suspended`: "El acceso de tu empresa a Human Growth
  está pausado. Contacta a tu administrador de RRHH."; en login, mismo mensaje). Banner persistente en gracia:
  "Tu empresa ya no tiene licencia activa. Puedes ver tu progreso hasta el {fecha}." Tono cercano, sin jerga, es-first
  con paridad en en. Respetá el design system (tokens en `apps/frontend`).
- [x] `POST /admin/companies/{id}/status` + `GET .../events` · [x] `CompanyOut` y `/auth/me` con estado · [x] chip + diálogo dry-run→motivo→slug→aplicar + historial · [x] banner de gracia · [x] pantalla `/acceso-pausado` · [x] copy es/en · [x] `lib/api.ts` entiende `detail` objeto (ApiError.code, `companyAccessError`)
- Notas:
  - **Ajuste a LC-03:** `dry_run` ya no exige motivo (la UI lo pide después de mostrar los números; si no, la vista previa de suspender sería imposible). Test agregado.
  - Empresas nuevas arrancan en `trial` si `billing_status='trial'` (mismo criterio que el backfill), si no `active`.
  - Al recibir 403 `company_suspended/terminated` el interceptor limpia la sesión y manda a `/acceso-pausado`; en gracia, una escritura bloqueada muestra toast y los GET bloqueados no (evita spam).
  - Los 2 endpoints nuevos se clasificaron como denegados en la allowlist de gracia (solo superadmin, que está exento); el test de cobertura los detectó.
  - Frontend: 26 tests nuevos; siguen fallando los 3 previos de `acceptInviteSchema`.
- **Aceptación:** tests de componentes (vitest) para el diálogo de cambio de estado, el banner y la pantalla de bloqueo;
  `pnpm build` verde.

## TASK LC-06 · Guardia de sobrecupo en bulk e invitaciones · `✅ DONE` (2026-11-16)

Regla: **no se puede enviar invitaciones si el uso proyectado supera el pool, salvo reconocimiento explícito.**
Uso proyectado = `activos + invitados vigentes + los que se están por invitar` frente a `licenses_total`
(el cupo por organización, `license_quota`, sigue siendo solo advertencia).

- Extraé el cálculo de `_license_warnings` a una función pura `projected_license_usage(db, company_id, extra_invites)`
  que devuelva `{active, invited, to_invite, pool, overage}`; reutilizala en bulk e invitaciones.
- `POST /company/members/bulk-import` (`send_invitations=true`) y `POST /company/invitations/send`: si `overage > 0` y
  no viene `acknowledge_overage=true` → **409** `{"code": "license_overage", active, invited, to_invite, pool, overage}`
  **antes de enviar cualquier correo**. `validate_only` y la carga sin envío siguen funcionando igual (solo agregan la
  advertencia estructurada).
- Con `acknowledge_overage=true` se envía y se escribe un `company_lifecycle_events` de tipo `overage_acknowledged`
  (actor, números, momento). Pueden reconocerlo `company_admin` y `superadmin`.
- **Aceptar invitación sin cupo:** hoy devuelve `400 "company license pool exhausted"`. Cambiá a un error con código
  (`license_pool_exhausted`) y mensaje amigable para la persona ("Tu empresa alcanzó su límite de licencias. Avisamos a
  tu administrador."), y notificá al `company_admin` (reusá `notifications`/email existente; rate-limit para no spamear).
- **Frontend** (`(admin)/admin/empresa/importar/page.tsx` y el paso de envío): modal con los números y dos salidas
  ("Ajustar licencias" / "Enviar de todos modos"), antes de enviar.
- [x] `projected_license_usage` (`company/license_guard.py`) reusada por bulk, envío y advertencia estructurada (`licencias` en la respuesta del bulk) · [x] 409 `license_overage` antes de cualquier correo · [x] `acknowledge_overage` + evento `overage_acknowledged` · [x] accept-invite sin cupo → `license_pool_exhausted` + aviso rate-limited (1/día/empresa, Redis) al `company_admin` (fallback `admin`) · [x] modal con dos salidas · [x] tests (22 backend, 12 frontend)
- Notas / hallazgos:
  - **El bulk ya limitaba filas contra el pool al cargar** (`reserve()`: activos + creados en la carrera → fila con error "se excede el pool"). Eso NO cambió. El sobrecupo que ahora frena es el que se arma por acumulación: invitados vigentes previos + los nuevos. Los tests lo reflejan.
  - Un 409 en el bulk con envío **revierte la carga completa** (la dependencia hace rollback): no queda nada escrito ni sale ningún correo; el cliente reintenta el mismo archivo con `acknowledge_overage=true`.
  - Definiciones: `invited` = invitados con invitación vigente (sin aceptar, sin revocar, no vencida); `to_invite` = los que recibirían un correo nuevo en esta operación (reenviar a uno de invitación vigente no suma). La advertencia textual existente se conserva idéntica.
  - Solo accept-invite cambió de contrato (`detail` = `{code, message}`). Los otros 400 `company license pool exhausted` (invitar desde admin, reactivar) siguen siendo string: sus tests y callers no se tocaron.
  - **Huecos fuera del alcance del plan** (no cambiados): `POST /company/members/{id}/resend-invite` y las invitaciones individuales (`/admin/orgs/{id}/invite`, `/company/organizations/{id}/invite`) no pasan por la guardia de sobrecupo; `issue_invitation` mantiene su chequeo duro `activos >= pool`.
  - Nueva plantilla de email `license_pool_exhausted.html`; el correo no incluye datos de la persona que lo intentó.
- **Aceptación:** tests: sin sobrecupo envía normal; con sobrecupo → 409 y **cero correos enviados**; con
  `acknowledge_overage` envía y deja evento; accept-invite sin cupo devuelve el código nuevo.

## TASK LC-07 · Consistencia de acceso a contenido · `✅ DONE` (2026-11-16)

- Que `user_can_see_unit` (acceso directo por slug) aplique **también** dimensión habilitada y pilar deshabilitado
  (hoy solo área), reusando `company_content_access`. Una sola regla compartida entre listado y detalle; sin romper la
  invariante #6 de CLAUDE.md.
- Auditá y listá (sin cambiar) otros accesos a contenido que no pasen por `visible_units_predicate`: paths, assignments,
  assessment, home/widgets. Cada hallazgo va como fila en el PR y, si es un hueco real, como issue aparte.
- [x] regla única `unit_allowed` / `user_can_see_unit` ≡ `visible_units_predicate` (test de paridad sobre la matriz área×dimensión×pilar) · [x] auditoría (`docs/audits/LC-07-content-access-audit.md`) · [x] hueco del hero del feed corregido en commit aparte `fix(LC-07)` (aprobado por Andy)
- Notas / hallazgos:
  - **La premisa del plan era falsa**: el acceso por slug YA respetaba dimensión y pilar (`_published_unit_or_404` usa el predicado). `user_can_see_unit` era código muerto y solo revisaba el área. Verificado con tests contra el código sin tocar. Andy lo confirmó y eligió cerrar + arreglar el hueco del feed.
  - Issues a abrir (no cambiados): `/me/assignments`, `/me/home` (`next_step`) y `/me/tips` aún pueden mostrar título/slug de una unit que dejó de ser visible (ver auditoría).
  - Una corrida completa de la suite dio 4 fallos (`test_behavior_matrix_endpoints` ×3, `test_custom_paths` ×1) que NO se reprodujeron: pasan aislados y en una segunda corrida completa (784 passed). Atribuible a datos residuales en la DB local tras corridas fallidas previas al reinicio de Docker.
- **Aceptación:** test que demuestra que una empresa con dimensión deshabilitada recibe 404/403 al pedir por slug una
  unit de esa dimensión (hoy la recibe).

## TASK LC-08 · Runbook de cierre + script de migración de CESA · `[ ]`

- `docs/runbooks/cierre-de-piloto.md`: pasos para cerrar una empresa con el modelo nuevo — (1) exportar reporte final
  (CSV de RRHH), (2) confirmar backup de Neon reciente, (3) `dry-run` de la transición, (4) avisar al contacto de la
  empresa con X días, (5) `active → grace`, (6) verificar con un usuario de prueba de esa empresa, (7) a `grace_ends_at`
  pasa a `suspended` (manual en LC-1, automático en LC-09), (8) cómo revertir. Incluir el mensaje tipo al cliente.
- `apps/backend/scripts/lc_migrate_company.py`: recibe `--slug`, es **dry-run por defecto**, imprime estado actual de
  la empresa y sus usuarios (activos / inactivos / invitados) y, con `--apply`, la pasa a `suspended` o `grace` usando
  `transition_company`. **No reactiva usuarios por su cuenta.** Si CESA ya fue cerrada a mano desactivando usuarios,
  el script solo lista los inactivos para que Andy decida a cuáles restaurar (no se puede saber cuáles desactivó el
  cierre y cuáles ya estaban inactivos).
- **No lo ejecutes contra producción.** Entregá el comando exacto en el PR.

---

# TASKS — Sprint LC-2 (esperar visto bueno de Andy)

## TASK LC-09 · Job diario de ciclo de vida · `[ ]`
Tarea Celery periódica (seguí el patrón de los recordatorios de engagement; **verificá que Celery beat esté desplegado**
y si no, parar y consultar). Cada día: avisos a `company_admin` a T-30/T-14/T-7 de `contract_end`; al vencer el
contrato `active → grace` (solo si hay `contract_end`); al pasar `grace_ends_at` `grace → suspended`. Idempotente,
con evento por cada transición (`actor_user_id = NULL`, `reason = "job:lifecycle"`) y kill-switch por flag.

## TASK LC-10 · Política de retención y anonimización (diseño, no código) · `[ ]`
Entregar un **ADR-0017** con la política y un diseño del job, **sin implementarlo** hasta que Andy lo apruebe con su
abogado. Debe resolver la tensión central: **datos anonimizados de verdad no sirven para armar perfiles individuales.**
- Cubeta A — *dataset anonimizado* (reutilizable por HG): puntajes por dimensión, nivel, sector, país, sin nombre, email,
  textos libres ni reflexiones; agregados con supresión de celdas n < 10 (consistente con `HG_Arquitectura_Escala_Pais_v1`).
- Cubeta B — *perfil individual*: sigue siendo dato personal (aun seudonimizado) → requiere consentimiento propio y
  separado del de la empresa (nuevo `consent_type`, versionado en `consent_change_log`), y **nunca** incluye resultados
  de P4/P5 sin consentimiento explícito. Camino natural: la persona conserva su cuenta al irse la empresa (portabilidad).
- Propuesta de plazos para discutir con el abogado: `terminated` + **12 meses** → anonimizar identificadores directos;
  logs de auditoría 5 años (alineado con el documento de Escala País, a confirmar); cuentas inactivas 24 meses → anonimizar.
  Marcar cada plazo como **supuesto**, no como decisión.
- Incluir: qué se borra vs qué se anonimiza vs qué se conserva, cómo se prueba que no hay reidentificación, y el
  `POST /me/export` del titular como prerrequisito.

## TASK LC-11 · Plan y precio por empresa · `[ ]`
Columnas en `companies`: `plan varchar`, `price_per_seat_cents int`, `currency char(3)`, `price_locked_until date`
(cláusula grandfather de 36 meses del piloto fundador). Plantillas de plan (Piloto/Estándar/Enterprise) que fijan
dimensiones habilitadas y tope de asientos al crear la empresa. Precio base vigente: **US$50–60 por usuario al año**
(`HG_Decisiones_Vigentes`, 2026-11-02). **Sin integración de cobro**: contrato y factura manual hasta tener 5+ clientes.

---

## 📝 Notas de ejecución

- Rama creada desde `main` con visto bueno de Andy (el plan suponía `feat/SP-03…`, ya mergeada en #176).
- **`.env` apunta a Neon (prod).** Para pytest/alembic exportar siempre
  `DATABASE_URL=postgresql+psycopg://hg:hg@localhost:5432/hg_dev` y `REDIS_URL=redis://localhost:6379/0`.
- **Fallo previo a LC:** vitest `src/lib/__tests__/validation.test.ts` · `acceptInviteSchema` (3 tests, contraseña de 6
  caracteres / username / email). Ya fallaba en `main`; no se toca en este bloque.
- Línea base backend: ruff, mypy y pytest verdes. Frontend: lint, typecheck y build verdes.

## ✅ Definición de terminado de LC-1

- [ ] Una empresa puede pasar `active → grace → suspended → active` desde la UI de superadmin con vista previa, motivo
      y registro en `company_lifecycle_events`, sin tocar a sus usuarios.
- [ ] En gracia, un usuario ve su progreso y nada más; suspendida, nadie de la empresa entra (superadmin sí).
- [ ] El bulk/envío de invitaciones frena ante sobrecupo y exige reconocimiento explícito.
- [ ] Acceso directo por slug respeta dimensión y pilar.
- [ ] ADR-0016, runbook y script de migración listos; **nada ejecutado en producción**.
- [ ] Suite backend + frontend verde (comandos de "Reglas duras").
