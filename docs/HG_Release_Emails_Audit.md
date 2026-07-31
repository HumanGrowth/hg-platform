# HG · Release · Emails Audit (TASK 0 · items 4-5)

Fecha: 2026-07-31

## Estado real: infra mínima, envío NO cableado

- **`RESEND_API_KEY`** presente en `.env` y `.env.example`. ✅ (confirmar valor real en Railway)
- **`config.py`**: `resend_api_key: str = ""`, `email_from = "HumanGrowth <admin@humangrowth.io>"` (ya `.io`).
- **NO existe** `EmailService`. El módulo `notifications/` sólo tiene `tasks.py` + `__init__.py` — **sin `email_service.py`, sin `templates/`**.
- **Contact form**: `marketing/router.py` sólo hace `log.info("contact.inquiry", ...)` a stdout ("Email stub … Resend se conecta en B3-05"). No envía nada.
- **Invitación**: crea `Invitation` pero **no dispara mail**.
- **Welcome / reevaluación**: no existen triggers.

## Triggers que deberían mandar mail y hoy NO lo hacen
1. Crear invitación → email al invitado (con `Invitacion Beta.html`).
2. Completar accept-invite → welcome.
3. Contact form → notificación interna a `admin@humangrowth.io`.
4. (opcional) Recordatorio de reevaluación a 30 días.

## Config faltante (a sumar en TASK 3)
`email_reply_to`, `emails_enabled` (feature flag, default false), `leads_inbox`,
`app_base_url` → `.io` (hoy `.app`, ver Menu/Domain).

## ⚠️ BLOQUEANTES (necesitan a Andy antes de mergear TASK 3)
1. **¿Existe la cuenta de Resend y la API key es válida?** (el `.env` tiene la key; confirmar que es real y activa).
2. **¿Está el dominio `humangrowth.io` verificado en Resend (SPF + DKIM)?** Sin esto,
   los mails desde `admin@humangrowth.io` **no se entregan** (o van a spam). Es el
   bloqueante duro para emails reales.
3. Fallback para testing sin dominio verificado: `onboarding@resend.dev` (sandbox).

## Cambios de datos/modelo que arrastra TASK 3
- `users` NO tiene `username` — TASK 3.4 (form `username_or_email`) requiere columna
  nueva + migración + cambio en `accept-invite` (hoy pide `fullName`).
- Template oficial: `HG/Design/Invitacion Beta.html` (fuera del repo, en la carpeta
  de diseño) — verificar que existe y es accesible antes de copiarlo.
