# ADR-0002 — Modelo de registro híbrido por invitación

- **Estado:** Aceptado
- **Fecha:** 2026-06-05
- **Entregables relacionados:** DEV-06 (auth), DEV-07 (RBAC)

## Contexto

Human Growth es una plataforma B2B Enterprise: las cuentas no son individuos
sueltos sino organizaciones cliente con un contrato y un número de licencias.
HG necesita controlar qué organizaciones existen, cuántas licencias consumen y
quién entra a cada una (compliance + facturación). El registro abierto tipo SaaS
self-service no encaja con ese modelo.

## Decisión

**Registro 100% por invitación. No existe self-service de organizaciones ni un
endpoint público de registro (`/auth/register` NO existe).**

Flujo:

1. El **superadmin de HG** crea la `Organization` (`POST /api/v1/admin/orgs`).
2. El superadmin invita al admin del cliente
   (`POST /api/v1/admin/orgs/:id/invite`) → fila en `invitations` con
   `token_hash`, `expires_at` (7 días), `org_id`, `role`, `email`.
3. El invitado abre el link `…/accept-invite?token=<plain>` y hace
   `POST /api/v1/auth/accept-invite` → se crea el `User`, se marca la invitación
   `accepted_at`, se consume una licencia, y se devuelven tokens.
4. A partir de ahí, el admin de la org puede invitar a más usuarios de **su
   propia org** (mismo endpoint, protegido por `require_role("superadmin","admin")`
   + chequeo de org).

Endpoints **públicos**: sólo `POST /auth/login`, `POST /auth/refresh`,
`POST /auth/accept-invite`.

El **token de invitación** se muestra en plaintext **una sola vez** (en la
respuesta del invite); en DB sólo queda el SHA-256.

## Alternativas consideradas

| Alternativa | Por qué se descartó |
|---|---|
| **Self-service público de orgs** (cualquiera crea su org y se registra) | No es el modelo B2B; pierde el control de licencias/compliance y abre la puerta a abuso/spam de tenants. |
| **Invitación pura sin superadmin** (la org se auto-aprovisiona y luego invita) | Sigue requiriendo que alguien cree y valide la org/licencias; en la práctica necesita igual un panel HG, así que no ahorra trabajo y pierde control. |

## Consecuencias

- ✅ HG controla el alta de cada org y el consumo de licencias
  (`licenses_used`/`licenses_total` se validan en invite y accept).
- ⚠️ **Necesitamos un panel admin de HG (B1-10)** antes del piloto para que el
  superadmin opere orgs/invitaciones sin curl.
- ⚠️ Los **emails de invitación son stub-log** en el MVP (se loggea el link);
  el envío real llega en **B3-05**.
- ⚠️ `accept-invite` corre sin sesión previa → usa el rol `hg_superadmin`
  (BYPASSRLS) para resolver la invitación cross-tenant; la seguridad la da el
  token opaco + expiración + estado (revoked/accepted). Ver
  [ADR-0001](ADR-0001-uuid-and-rls.md) para el modelo de roles de DB.
- El `UniqueConstraint(org_id, email, accepted_at)` no impide múltiples
  invitaciones pendientes al mismo email (NULLs distintos en Postgres); es una
  limitación conocida y aceptada para el MVP.
