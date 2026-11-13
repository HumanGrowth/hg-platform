# ADR-0015 · Soporte: tickets, triage asistido por AI y corrección vía PR

- **Estado:** aceptado (Fase 1 en implementación; Fases 2–4 pendientes de su propio visto bueno)
- **Fecha:** 2026-11-11
- **Autores:** @andy

## Contexto

HG no tiene canal de soporte: solo existe `POST /contact/inquiry` (leads comerciales, módulo
`marketing`). Con la beta en producción y más empresas entrando, los problemas llegan por canales
informales y dependen de una persona. Se quiere un canal único donde el ticket llegue con contexto, la
AI ayude a clasificarlo y diagnosticarlo, y, si es un bug, proponga el fix como PR.

Restricciones: multi-tenancy por RLS (ADR-0001), "AI propone, humano decide" (CLAUDE.md §7), sin
servicios ni librerías nuevas sin razón, y no bloquear el horizonte Escala País (sin estado en memoria,
sin dependencias de AWS).

## Decisión

1. **Módulo nuevo `hg.modules.support`** (monolito modular) con tablas `support_tickets` y
   `support_ticket_events`. Los tickets los crean (a) usuarios autenticados desde la app, con contexto
   automático, y (b) cualquier persona desde un formulario público, para problemas de acceso.
2. **Tenancy.** `support_tickets.org_id` es nullable **solo** para tickets públicos. La política
   `tenant_isolation` compara `org_id = app.current_org_id`; una fila con `org_id NULL` nunca coincide,
   así que es invisible para `hg_app` y la opera únicamente `hg_superadmin`. Un ticket público **no se
   vincula automáticamente a un usuario por su email**: el mismo email puede existir en varias orgs y
   vincular por email permitiría adjuntar contenido a la cuenta de otra persona. El vínculo, si hace
   falta, lo hace el admin.
3. **Eventos append-only.** `support_ticket_events` registra creación, mensajes, notas internas y
   cambios de estado. `hg_app` solo tiene `SELECT, INSERT`. Las notas internas
   (`is_internal = true`) nunca se devuelven en `/me`.
4. **Estados.** `new → triaged → needs_info | answered | fix_proposed → resolved | wontfix`. `new`
   significa "requiere atención de soporte": una respuesta del usuario reabre el ticket a `new`.
5. **Anti-abuso del endpoint público.** No existe rate limiting en el backend hoy. Se agrega un
   limitador de ventana fija sobre Redis (`redis` ya es dependencia) por IP, por email y global,
   más un campo honeypot. Si Redis no responde el limitador falla abierto (con log) para no tumbar el
   soporte. Cloudflare Turnstile queda como mejora posterior.
6. **Sin AI en la Fase 1.** La bandeja es manual. La AI entra en la Fase 2 detrás de
   `ai_support_enabled` (default `False`), con las reglas de CLAUDE.md §7: cliente LLM único en
   `hg/modules/ai/`, salida estructurada Pydantic, fuera del request path (Celery), fallo elegante y
   registro de la decisión humana (aceptó / editó / rechazó).
7. **Corrección vía PR (Fase 3).** Un GitHub Action con Claude Code recibe solo el `ticket_id`, lee el
   ticket sanitizado por un endpoint de solo lectura con token de servicio, y abre un PR. Nunca hace
   merge. El texto del ticket es entrada no confiable: se pasa como dato, el workflow no recibe
   secretos de producción ni acceso a la base, y `CODEOWNERS` exige revisión humana sobre migraciones,
   auth, RLS, consent, `.github/` e `infra/`.

## Alternativas consideradas

- **Helpdesk externo (Zendesk, Intercom, Linear).** Pros: bandeja lista. Contras: costo por asiento,
  los datos de usuarios salen a otro encargado (hay que sumarlo al DPA y a la lista de subencargados),
  y la automatización del fix queda fuera del repo. Descartado por ahora.
- **Reutilizar `contact_inquiries`.** Mezcla leads comerciales con soporte de usuarios reales, sin
  RLS ni hilo de conversación. Descartado.
- **Vincular tickets públicos por email.** Más cómodo para el admin, pero abre un vector de suplantación
  (punto 2). Descartado.
- **Auto-merge de fixes de bajo riesgo.** Más rápido, pero contradice "AI propone, humano decide" y
  requeriría su propio ADR. Fuera de alcance.

## Consecuencias

- **Positivas:** un solo canal con contexto (rol, página, versión); trazabilidad completa; la Fase 1
  ya resuelve el problema operativo sin AI; cada fase es reversible por flag o por no desplegarla.
- **Riesgos:** spam en el formulario público (mitigado con rate limit + honeypot); prompt injection a
  través del texto de tickets en las Fases 2–3 (mitigado con las restricciones del punto 7).
- **Consentimiento (bloquea Fase 2).** El módulo `consent` hoy cubre solo la visibilidad del estado del
  assessment hacia jefe directo y RRHH. **No cubre** enviar texto de tickets a un proveedor de LLM.
  Antes de encender `ai_support_enabled` hay que confirmar con asesoría legal si basta el aviso en el
  formulario o se requiere consentimiento adicional, y agregar el proveedor a la lista de subencargados.
  Mientras tanto el flag permanece apagado.
- **Seguimiento:** `/version` con git sha para saber qué versión corría al abrirse el ticket;
  métricas (tiempo a primera respuesta, a resolución) en PostHog cuando se instrumente.
- **Numeración.** El Project de Claude contiene un `ADR-0013-assessment-conversacional…` distinto del
  `ADR-0013-rrhh-dashboard-v2` de este repo. Conviene renumerar uno de los dos para no tener dos 0013.

## Addendum SP-03 — adjuntos de respaldo (2026-11-12)

Los tickets aceptan hasta 3 archivos de 5 MB (capturas PNG/JPG/WebP/GIF, PDF y texto) para dar
evidencia del problema.

- **Almacenamiento en Postgres (`support_ticket_attachments.data`, bytea), no en R2.** El bucket R2 del
  repo se sirve por URL pública (`r2_public_base_url`) y una captura puede contener datos personales de
  otras personas. En la base heredan RLS (`tenant_isolation`, `org_id` NULL = ticket público solo para
  `hg_superadmin`), son append-only (se revoca UPDATE/DELETE/TRUNCATE de forma explícita por el
  `ALTER DEFAULT PRIVILEGES` de B1-04) y se bajan solo con sesión: el dueño del ticket o el superadmin.
  El volumen esperado (tickets de una beta) lo hace viable; si crece, migrar a un bucket **privado** con
  URLs firmadas sin cambiar la API.
- **Validación por contenido (magic bytes), no por `Content-Type` ni extensión.** SVG, HTML y
  ejecutables se rechazan (415); más de 3 archivos o vacíos, 422; más de 5 MB, 413. Las descargas
  salen con `X-Content-Type-Options: nosniff`, CSP `sandbox` y `Cache-Control: private, no-store`;
  solo las imágenes validadas van inline.
- **Endpoints de creación pasan a `multipart/form-data`** (`payload` = JSON del ticket, `files` = archivos).
  Es un cambio de contrato respecto de SP-01/SP-02, aún no desplegados, por lo que no rompe a ningún cliente.
- **Fases 2–3:** los adjuntos **no** se envían a un LLM mientras el consentimiento de la Fase 2 siga
  pendiente; las capturas son el vector más probable de datos personales.
