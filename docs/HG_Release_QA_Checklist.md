# HG · Release Oficial — QA Checklist cross-role (TASK 4)

Fecha: 2026-08-01 · Owner de la corrida: Andy (browser real) · Estado: **pendiente sign-off**

Correr con **4 personas simuladas** (usuario seed por rol): `collaborator` / `manager` /
`admin` / `superadmin`. Marcar 🟢 (ok) / 🟡 (menor) / 🔴 (bloqueante). Cualquier 🔴 bloquea el go-live.

> Navegadores: **iOS Safari + Chrome desktop** (+ Android si se puede).
> Leyenda de origen: **[auto]** = cubierto por tests automatizados en CI · **[man]** = requiere verificación manual en el browser.

## Estado de PRs del release (todo mergeado a prod)
- #42 dominio `.io` + menú manager · #43 métricas (fuente única) · #44 emails end-to-end ·
  #45 onboarding + módulo intro · #46 accept-invite `username_or_email`.
- Migraciones Neon aplicadas: **ST-03** (has_seen_onboarding), **ST-04** (username).
- Deploy: Vercel (front) + Railway (back). **Emails: `EMAILS_ENABLED=true` + `RESEND_API_KEY` en Railway.**

---

## Matriz feature × rol

| # | Feature / flujo | collaborator | manager | admin | superadmin | Origen |
|---|-----------------|:---:|:---:|:---:|:---:|:---:|
| 1 | Login / refresh token / logout | ☐ | ☐ | ☐ | ☐ | [auto+man] |
| 2 | Nav: cada rol ve sólo lo que le corresponde | ☐ | ☐ | ☐ | ☐ | [auto] |
| 3 | **Manager**: "Mi equipo" visible en el menú (desktop + mobile) | — | ☐ | ☐ | ☐ | [auto] |
| 4 | Inicio: 6 cards de dimensión + widgets con data real | ☐ | ☐ | ☐ | ☐ | [man] |
| 5 | Módulos: player + templates + progreso guardado | ☐ | ☐ | ☐ | ☐ | [man] |
| 6 | Mi Perfil: card unificada por dimensión + carrusel de badges + reevaluar | ☐ | ☐ | ☐ | ☐ | [man] |
| 7 | Radar: metáforas en vértices + overlay histórico + tap → /dimensiones/[code] | ☐ | ☐ | ☐ | ☐ | [man] |
| 8 | Página de dimensión: progreso + reevaluar + material | ☐ | ☐ | ☐ | ☐ | [man] |
| 9 | Eventos: hero rotativo + secciones + link externo (los 5 mock) | ☐ | ☐ | ☐ | ☐ | [man] |
| 10 | **Consistencia cross-role**: mismo user muestra los mismos números en `/perfil` (colab) y `/team/[id]` (manager) | — | ☐ | ☐ | ☐ | **[auto]** |
| 11 | Manager: `/team` lista + `/team/[id]` detalle | — | ☐ | ☐ | ☐ | [man] |
| 12 | Admin: `/admin/orgs` + `/admin/org` + `/admin/events` (en el menú admin) | — | — | ☐ | ☐ | [man] |
| 13 | **Emails**: invitar user → llega invitación (usa `Invitacion Beta.html`) | — | — | ☐ | ☐ | **[auto render]** + [man envío] |
| 14 | **Emails**: registro (accept-invite) → llega welcome | ☐ | ☐ | ☐ | ☐ | [man] |
| 15 | **Emails**: contact form → llega a `admin@humangrowth.io` | público | | | | [man] |
| 16 | **Accept-invite**: form pide "Usuario o correo" (único); acepta ambos; rechaza duplicado (409) y email que no matchea (400) | ☐ | ☐ | ☐ | ☐ | **[auto]** |
| 17 | **Dominio**: cero refs visibles a `.app`; links de invitación → `app.humangrowth.io` | ☐ | ☐ | ☐ | ☐ | [auto grep] + [man] |
| 18 | **Onboarding**: primer login post-invite dispara el tour (6 pasos) | ☐ | ☐ | ☐ | ☐ | [auto comp] + [man] |
| 19 | **Onboarding**: "Ver el tour de nuevo" en Mi Perfil resetea + re-dispara | ☐ | ☐ | ☐ | ☐ | [man] |
| 20 | **Módulo intro** `/modulos/intro`: bienvenida + botones Módulos / Inicio | ☐ | ☐ | ☐ | ☐ | [man] |

---

## Verificado por tests automatizados (CI verde)
- **Consistencia cross-role** (#10): `test_user_metrics.py::test_manager_sees_same_states_as_collaborator`.
- **Emails** (#13-15): `test_email_service.py` (skipped-flag-off, sent-mocked, never-raises, render de los 3 templates) + `test_contact_inquiries.py` (trigger).
- **Accept-invite** (#16): `test_accept_invite_username.py` (username, email-match, mismatch 400, dup 409, backward-compat).
- **Menú manager** (#3): `nav/__tests__/{items,MoreDrawer}.test.ts`.
- **Onboarding** (#18): `OnboardingTour.test.tsx` + `test_onboarding_flag.py`.
- Suite total: backend completa + 206 tests frontend, ruff + mypy + tsc + eslint + build.

## Requiere verificación MANUAL de Andy (browser real)
- Envío REAL de emails (con `EMAILS_ENABLED=true` en Railway) — que lleguen y no caigan en spam (verificar SPF/DKIM del dominio en Resend).
- Todo lo visual/UX marcado [man]: layout mobile 375px, player, radar (geometría recharts en device), hero de eventos, tour.
- Cargar contenido real: eventos (además de los 5 mock), catálogo de badges (hoy 6 de dimensión, bloqueados).

## Follow-ups conocidos (no bloquean el release)
- **Unlock de badges** (`user_badges`): el catálogo se ve pero los badges arrancan bloqueados — falta la lógica de desbloqueo.
- **Dashboard `/admin/emails`** (observabilidad de envíos) — TASK 3.5, opcional.
- **Welcome email** apunta a `/modulos`; se puede pasar a `/modulos/intro` (1 línea).
- **Inicio**: `next_step`/actividad reciente aún linkean a `/eventos/{slug}` legacy → redirigen a `/modulos`.
- **Data prod**: el superadmin loguea con `@humangrowth.app`; migrar a `.io` es cambio de credencial (re-seed o update en Neon).

---

## Sign-off
- [ ] **Andy** — todas las filas 🟢/🟡, sin 🔴 → **OK go-live oficial**.
