# ADR-0016 · Ciclo de vida de licenciamiento por Empresa

- **Estado:** propuesto
- **Fecha:** 2026-11-16
- **Autores:** Andrés (decisiones), Claude Code (redacción)

## Contexto

Hechos verificados en el código (rama `main`, 2026-11-16):

- No existe una entidad "licencia". Licencia usada = `users.is_active = true`; pool = `companies.licenses_total`;
  `identity.service.company_active_users()` es el único cómputo. `check_license_available()` se llama al aceptar
  una invitación y al reactivar un usuario.
- `companies.is_active` y `organizations.is_active` existen pero ningún código los valida (ni login, ni
  `get_current_user`, ni contenido). Ponerlos en `false` no hace nada.
- `companies.billing_status` es texto libre (default `"trial"`); `contract_start`, `contract_end` y `billing_cycle`
  existen y nada los usa.
- La única forma de cortar acceso hoy es desactivar usuarios uno por uno (`PATCH /admin/users/{id}`), sin registro
  de auditoría (solo `hard_delete_user` escribe un `logger.warning`).
- `get_current_user` valida `user.is_active` en cada request; `login` y `refresh_tokens` también. Access token =
  30 min, refresh = 14 días: es el punto natural de enforcement.
- `company_router` y `admin_router` corren con `get_db_as_superadmin` (BYPASSRLS) aunque el actor sea
  `company_admin`: el chequeo debe aplicarse sobre el **actor**, no sobre el rol de DB.
- Bulk import advierte sobrecupo **después** de procesar y no bloquea; `POST /company/invitations/send` no
  chequea cupo.
- `user_can_see_unit()` (acceso por slug) solo revisa el área; los listados además filtran dimensión y pilar.

## Decisión

1. **El estado de acceso de una empresa vive en `companies.status`** (varchar + CHECK, no enum de Postgres):
   `trial → active → grace → suspended → terminated`.
2. **Gracia = solo lectura de progreso.** Duración `grace_days` (default 30, configurable por empresa; el default
   está pendiente de confirmar por Andy). Termina en `grace_ends_at`.
3. **`suspended` / `terminated`:** solo `superadmin` entra; el resto recibe 403. Los datos quedan intactos.
   `terminated` marca el inicio del reloj de retención (ADR-0017, pendiente).
4. **Suspender una empresa no toca a sus usuarios.** Nunca más se corta una empresa desactivando usuarios en masa.
5. **Transiciones permitidas:** `trial→active`, `trial→grace`, `active→grace`, `grace→active`, `grace→suspended`,
   `active→suspended` (emergencia, con motivo), `suspended→active`, `suspended→terminated`,
   `terminated→suspended` (rescate). Todo lo demás es 409.
6. **Un único escritor de estado:** `company/lifecycle.py::transition_company` (valida matriz, exige motivo,
   calcula `grace_ends_at`, escribe evento, `db.flush()`).
7. **Un único punto de enforcement:** `assert_company_allows(method, path, user, company)`, invocado desde
   `get_current_user`, `login`, `refresh_tokens` y aceptar invitación. En gracia rige una allowlist con deny por
   defecto. Superadmin siempre pasa.
8. **Auditoría append-only:** tabla `company_lifecycle_events` sin `UPDATE`/`DELETE` para ningún rol.
9. **Contrato de error:** `403 {"detail": {"code": "company_read_only" | "company_suspended" | "company_terminated",
   "message": "<es>", "grace_ends_at": "<iso|null>"}}`.
10. **Cupo cuenta al aceptar** (sin cambios). El envío de invitaciones se frena ante sobrecupo proyectado hasta
    reconocimiento explícito (`overage_acknowledged`).
11. `companies.is_active` queda deprecado (no se renombra ni se borra en este bloque). `billing_status` sigue como
    dato comercial libre hasta una fase de facturación.

## Alternativas consideradas

- **Desactivar usuarios en masa.** Simple, pero sin auditoría, sin reversibilidad confiable (no se sabe cuáles
  estaban inactivos antes) y mezcla estado de empresa con estado de persona. Descartada.
- **Reusar `is_active` + `billing_status`.** `is_active` es binario (no modela gracia) y `billing_status` es texto
  libre sin validación ni semántica de acceso. Descartada.
- **Facturación automática ahora.** Prematuro: contrato y factura son manuales hasta tener 5+ clientes. Diferida.

## Exposición del CDN

El video HLS se sirve desde `cdn.humangrowth.io` (Cloudflare R2) y `core/storage.py` no firma URLs: **el CDN es
público**. Bloquear la API no impide que alguien con una URL ya copiada siga viendo ese video.

**Decisión diferida:** no se implementan URLs firmadas en este bloque. Se registra como **deuda de seguridad**
a retomar antes de un cliente con requisitos contractuales de confidencialidad de contenido.

## Consecuencias

- Positivas: corte de acceso reversible y auditado; una sola regla de enforcement; los usuarios no se alteran.
- Negativas / riesgos:
  - +1 lectura por PK a `companies` por request (medir; si pesa, caché Redis con TTL ≤ 30 s y revocación diferida
    como máximo ese TTL).
  - La allowlist de gracia puede quedar desactualizada al agregar rutas: se cubre con un test que falla ante
    rutas sin clasificar.
  - El contenido en CDN sigue accesible por URL directa (ver sección anterior).
  - Hasta LC-09 el paso `grace → suspended` es manual; el enforcement trata `grace` vencida como `suspended`.
- Seguimiento: LC-09 (job diario), ADR-0017 (retención y anonimización), LC-11 (plan y precio).

## Nota de numeración

El Project de Claude tiene otro `ADR-0013-assessment-conversacional-y-memoria-hugie` que choca con
`ADR-0013-rrhh-dashboard-v2` del repo. No se renumera aquí; queda para que Andy decida.
