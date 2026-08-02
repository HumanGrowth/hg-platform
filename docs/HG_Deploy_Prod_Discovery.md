# HG · Deploy Prod — Discovery (TASK 0)

Fecha: 2026-08-02 · `main @ 8a230d8`

## Estado por servicio

| Servicio | Estado | Nota |
|----------|--------|------|
| **Vercel** (frontend) | ✅ 200 · sirviendo | `x-vercel-cache: HIT` en `app.humangrowth.io` |
| **Railway** (backend) | ✅ `GET /health` → `{status:ok, version:0.1.0, env:production}` | `version` es estático `0.1.0` (no expone git sha) |
| **Neon** (DB) | ✅ **at head `b4c5d6e7f8a9`** | **NO hay migraciones pendientes** |

## Migraciones — NO hay pendientes ✅

`alembic current` == `heads` == `b4c5d6e7f8a9`. Todas aplicadas en sesiones previas:
- ST-01 badges, ST-02 community events, **ST-03 `users.has_seen_onboarding`**, **ST-04 `users.username`** + `uq_users_org_username`.

Schema verificado en Neon: `users.username` ✅ · `users.has_seen_onboarding` ✅ · `badges` ✅ · `events.is_featured` ✅.

> **TASK 1 → el paso de migraciones ya está hecho.** No hay que correr `alembic upgrade`.

## ⚠️ Discrepancias con el spec (a tener en cuenta)

1. **`email_log` / dashboard `/admin/emails`: NO existen.** El dashboard de envíos (TASK 3.5 del release) se dejó como **follow-up** la sesión pasada — nunca se construyó. → Los ítems de TASK 1 que verifican `/admin/emails` con `resend_message_id` **no aplican** (habría que construir el dashboard, que es "feature nueva" y el spec dice que no van features). Observabilidad hoy = logs de Railway (`email.sent` / `email.failed`).
2. **Seed de módulo introductorio: NO existe.** El módulo intro es una **página placeholder frontend-only** (`/modulos/intro`) — no hay `LearningUnit` semilla ni migración. → El paso "PR #45 módulo intro seed" del discovery no aplica.
3. **Health sin git sha**: `version: 0.1.0` estático. Para confirmar el commit exacto en prod habría que agregar el sha (fix chico opcional).

## Env vars (Railway)

Andy confirmó la sesión pasada que seteó `EMAILS_ENABLED=true` + `RESEND_API_KEY` + el resto. El **envío real vía la key de Resend está validado** (test send exitoso, id de mensaje devuelto). Pendiente confirmar en el dashboard de Resend: dominio `humangrowth.io` **Verified** (SPF+DKIM+DMARC) y **cuota del plan** (en el último test los headers mostraron `x-resend-monthly-quota: 1` / `daily-quota: 0` → posible límite bajo; revisar Usage/Plan).

## Fuentes para TASK 2 y 3 (encontradas)

- **TASK 2 (Drive sync)**: script `hg/scripts/sync_units_from_drive.py` (usa `GOOGLE_APPLICATION_CREDENTIALS`). Creds en **`Docs/Google-SA.json`**. Feasible.
- **TASK 3 (logos HQ)**: pack en **`Design/Nueva_Marca-Brand_Book/Web-Assets/`** (+ `USAGE-GUIDE.md`). Feasible. *(La ruta real es `Design/...`, no `HG/Design/...` — el cwd ya es `…/Andy/HG`.)*

## Acciones concretas por gap

- TASK 1: **saltar** migraciones (hechas). Smoke-test de 3 mails a la casilla de Andy (controlado). Dashboard `/admin/emails` = follow-up (no bloquea). Confirmar cuota Resend.
- TASK 2: correr `--dry-run --skip-existing` → reportar count → **OK de Andy** antes del apply (backup Neon primero).
- TASK 3: copiar pack → **Opción A** (mantener filenames legacy + sumar nuevos) recomendada → favicon/manifest + head links → build.
