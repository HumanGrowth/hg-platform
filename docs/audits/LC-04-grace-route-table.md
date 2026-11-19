# LC-04 · Tabla de rutas del modo gracia

> Generada desde las rutas registradas en `api/v1/__init__.py` (script de auditoría, 2026-11-16) y revisada a mano.
> Política en `apps/backend/src/hg/modules/company/grace_policy.py`; el test `test_grace_policy_covers_all_routes` impide rutas sin clasificar.
> Superadmin está exento en todos los estados. `trial`/`active`: todo permitido. `suspended`/`terminated`: todo 403 salvo `POST /auth/logout`.

Total: 175 rutas·método — 38 permitidas en gracia, 121 denegadas, 16 sin sesión.

| Ruta | Método | ¿Requiere sesión? | Decisión en gracia |
|---|---|---|---|
| `/` | GET | no | — sin sesión (no aplica) |
| `/admin/areas` | GET | sí | ⛔ 403 `company_read_only` |
| `/admin/areas` | POST | sí | ⛔ 403 `company_read_only` |
| `/admin/areas/{code}` | PATCH | sí | ⛔ 403 `company_read_only` |
| `/admin/assignable-units` | GET | sí | ⛔ 403 `company_read_only` |
| `/admin/assignments/{assignment_id}` | DELETE | sí | ⛔ 403 `company_read_only` |
| `/admin/assignments/{assignment_id}` | PATCH | sí | ⛔ 403 `company_read_only` |
| `/admin/blocks/{block_id}` | DELETE | sí | ⛔ 403 `company_read_only` |
| `/admin/blocks/{block_type}/{block_id}` | PATCH | sí | ⛔ 403 `company_read_only` |
| `/admin/community-events` | GET | sí | ⛔ 403 `company_read_only` |
| `/admin/community-events` | POST | sí | ⛔ 403 `company_read_only` |
| `/admin/community-events/{event_id}` | DELETE | sí | ⛔ 403 `company_read_only` |
| `/admin/community-events/{event_id}` | PATCH | sí | ⛔ 403 `company_read_only` |
| `/admin/companies` | GET | sí | ⛔ 403 `company_read_only` |
| `/admin/companies` | POST | sí | ⛔ 403 `company_read_only` |
| `/admin/companies/{company_id}/access` | GET | sí | ⛔ 403 `company_read_only` |
| `/admin/companies/{company_id}/access` | PUT | sí | ⛔ 403 `company_read_only` |
| `/admin/companies/{company_id}/events` | GET | sí | ⛔ 403 `company_read_only` |
| `/admin/companies/{company_id}/licenses` | PATCH | sí | ⛔ 403 `company_read_only` |
| `/admin/companies/{company_id}/status` | POST | sí | ⛔ 403 `company_read_only` |
| `/admin/contact/inquiries` | GET | sí | ⛔ 403 `company_read_only` |
| `/admin/custom-paths` | GET | sí | ⛔ 403 `company_read_only` |
| `/admin/custom-paths` | POST | sí | ⛔ 403 `company_read_only` |
| `/admin/custom-paths/{custom_path_id}` | DELETE | sí | ⛔ 403 `company_read_only` |
| `/admin/custom-paths/{custom_path_id}` | PATCH | sí | ⛔ 403 `company_read_only` |
| `/admin/custom-paths/{custom_path_id}/assignments` | PUT | sí | ⛔ 403 `company_read_only` |
| `/admin/custom-paths/{custom_path_id}/items` | PUT | sí | ⛔ 403 `company_read_only` |
| `/admin/invitations/{invitation_id}` | DELETE | sí | ⛔ 403 `company_read_only` |
| `/admin/learning-units` | POST | sí | ⛔ 403 `company_read_only` |
| `/admin/learning-units/{unit_id}` | DELETE | sí | ⛔ 403 `company_read_only` |
| `/admin/learning-units/{unit_id}` | PATCH | sí | ⛔ 403 `company_read_only` |
| `/admin/learning-units/{unit_id}/blocks` | POST | sí | ⛔ 403 `company_read_only` |
| `/admin/learning-units/{unit_id}/blocks/reorder` | POST | sí | ⛔ 403 `company_read_only` |
| `/admin/learning-units/{unit_id}/publish` | POST | sí | ⛔ 403 `company_read_only` |
| `/admin/learning-units/{unit_id}/unpublish` | POST | sí | ⛔ 403 `company_read_only` |
| `/admin/org/insights` | GET | sí | ✅ permitida |
| `/admin/org/metrics` | GET | sí | ✅ permitida |
| `/admin/org/users/export.csv` | GET | sí | ✅ permitida |
| `/admin/org/widgets` | GET | sí | ✅ permitida |
| `/admin/organizations/{org_id}/assignments` | POST | sí | ⛔ 403 `company_read_only` |
| `/admin/organizations/{org_id}/assignments-summary` | GET | sí | ⛔ 403 `company_read_only` |
| `/admin/organizations/{org_id}/modules` | GET | sí | ⛔ 403 `company_read_only` |
| `/admin/organizations/{org_id}/modules/{unit_id}` | DELETE | sí | ⛔ 403 `company_read_only` |
| `/admin/orgs` | GET | sí | ⛔ 403 `company_read_only` |
| `/admin/orgs` | POST | sí | ⛔ 403 `company_read_only` |
| `/admin/orgs/{org_id}/invitations` | GET | sí | ⛔ 403 `company_read_only` |
| `/admin/orgs/{org_id}/invite` | POST | sí | ⛔ 403 `company_read_only` |
| `/admin/orgs/{org_id}/users` | GET | sí | ✅ permitida |
| `/admin/perspectives` | GET | sí | ⛔ 403 `company_read_only` |
| `/admin/perspectives` | POST | sí | ⛔ 403 `company_read_only` |
| `/admin/perspectives/{post_id}` | DELETE | sí | ⛔ 403 `company_read_only` |
| `/admin/perspectives/{post_id}` | GET | sí | ⛔ 403 `company_read_only` |
| `/admin/perspectives/{post_id}` | PATCH | sí | ⛔ 403 `company_read_only` |
| `/admin/perspectives/{post_id}/publish` | POST | sí | ⛔ 403 `company_read_only` |
| `/admin/perspectives/{post_id}/unpublish` | POST | sí | ⛔ 403 `company_read_only` |
| `/admin/scoring-config` | GET | sí | ⛔ 403 `company_read_only` |
| `/admin/scoring-config/recompute` | POST | sí | ⛔ 403 `company_read_only` |
| `/admin/scoring-config/{dimension_code}` | PUT | sí | ⛔ 403 `company_read_only` |
| `/admin/support/tickets` | GET | sí | ⛔ 403 `company_read_only` |
| `/admin/support/tickets/{ticket_id}` | GET | sí | ⛔ 403 `company_read_only` |
| `/admin/support/tickets/{ticket_id}` | PATCH | sí | ⛔ 403 `company_read_only` |
| `/admin/support/tickets/{ticket_id}/attachments/{attachment_id}` | GET | sí | ⛔ 403 `company_read_only` |
| `/admin/support/tickets/{ticket_id}/note` | POST | sí | ⛔ 403 `company_read_only` |
| `/admin/support/tickets/{ticket_id}/reply` | POST | sí | ⛔ 403 `company_read_only` |
| `/admin/upload/image` | POST | sí | ⛔ 403 `company_read_only` |
| `/admin/users/{user_id}` | DELETE | sí | ⛔ 403 `company_read_only` |
| `/admin/users/{user_id}` | PATCH | sí | ⛔ 403 `company_read_only` |
| `/admin/users/{user_id}/assignments` | GET | sí | ⛔ 403 `company_read_only` |
| `/admin/users/{user_id}/assignments` | POST | sí | ⛔ 403 `company_read_only` |
| `/admin/users/{user_id}/behavior-evaluations` | PUT | sí | ⛔ 403 `company_read_only` |
| `/admin/users/{user_id}/behavior-matrix` | GET | sí | ✅ permitida |
| `/admin/users/{user_id}/custom-path` | GET | sí | ⛔ 403 `company_read_only` |
| `/admin/users/{user_id}/pillar-feedback` | GET | sí | ✅ permitida |
| `/admin/users/{user_id}/pillar-feedback` | PUT | sí | ⛔ 403 `company_read_only` |
| `/assessment/admin/users/{user_id}/reset-retake/{dimension}` | POST | sí | ⛔ 403 `company_read_only` |
| `/assessment/me/radar` | GET | sí | ✅ permitida |
| `/assessment/me/results` | GET | sí | ✅ permitida |
| `/assessment/me/results/{dimension}/confirm` | POST | sí | ⛔ 403 `company_read_only` |
| `/assessment/sessions` | POST | sí | ⛔ 403 `company_read_only` |
| `/assessment/sessions/{session_id}` | GET | sí | ⛔ 403 `company_read_only` |
| `/assessment/sessions/{session_id}/abandon` | POST | sí | ⛔ 403 `company_read_only` |
| `/assessment/sessions/{session_id}/finalize` | POST | sí | ⛔ 403 `company_read_only` |
| `/assessment/sessions/{session_id}/respond` | POST | sí | ⛔ 403 `company_read_only` |
| `/auth/accept-invite` | POST | no | — sin sesión (no aplica) |
| `/auth/forgot-password` | POST | no | — sin sesión (no aplica) |
| `/auth/invite-info` | GET | no | — sin sesión (no aplica) |
| `/auth/login` | POST | no | ✅ permitida |
| `/auth/logout` | POST | no | ✅ permitida |
| `/auth/me` | GET | sí | ✅ permitida |
| `/auth/me` | PATCH | sí | ⛔ 403 `company_read_only` |
| `/auth/me/dashboard-prefs/{dashboard}` | DELETE | sí | ⛔ 403 `company_read_only` |
| `/auth/me/dashboard-prefs/{dashboard}` | GET | sí | ✅ permitida |
| `/auth/me/dashboard-prefs/{dashboard}` | PUT | sí | ⛔ 403 `company_read_only` |
| `/auth/me/onboarding-seen` | POST | sí | ⛔ 403 `company_read_only` |
| `/auth/refresh` | POST | no | ✅ permitida |
| `/auth/reset-password` | POST | no | — sin sesión (no aplica) |
| `/auth/reset-password/validate` | GET | no | — sin sesión (no aplica) |
| `/community-events` | GET | sí | ⛔ 403 `company_read_only` |
| `/community-events/{event_id}` | GET | sí | ⛔ 403 `company_read_only` |
| `/company/info` | GET | sí | ✅ permitida |
| `/company/invitations/send` | POST | sí | ⛔ 403 `company_read_only` |
| `/company/members` | GET | sí | ✅ permitida |
| `/company/members/bulk-import` | POST | sí | ⛔ 403 `company_read_only` |
| `/company/members/bulk-import/template` | GET | sí | ⛔ 403 `company_read_only` |
| `/company/members/{user_id}` | PATCH | sí | ⛔ 403 `company_read_only` |
| `/company/members/{user_id}/invite` | DELETE | sí | ⛔ 403 `company_read_only` |
| `/company/members/{user_id}/resend-invite` | POST | sí | ⛔ 403 `company_read_only` |
| `/company/organizations` | GET | sí | ✅ permitida |
| `/company/organizations` | POST | sí | ⛔ 403 `company_read_only` |
| `/company/organizations/{org_id}` | DELETE | sí | ⛔ 403 `company_read_only` |
| `/company/organizations/{org_id}` | PATCH | sí | ⛔ 403 `company_read_only` |
| `/company/organizations/{org_id}/invite` | POST | sí | ⛔ 403 `company_read_only` |
| `/company/organizations/{org_id}/quota` | PATCH | sí | ⛔ 403 `company_read_only` |
| `/contact/inquiry` | POST | no | — sin sesión (no aplica) |
| `/courses` | GET | no | — sin sesión (no aplica) |
| `/courses/{slug}` | GET | no | — sin sesión (no aplica) |
| `/courses/{slug}/next` | GET | no | — sin sesión (no aplica) |
| `/events` | GET | sí | ⛔ 403 `company_read_only` |
| `/events/{slug}` | GET | sí | ⛔ 403 `company_read_only` |
| `/events/{slug}/next` | GET | sí | ⛔ 403 `company_read_only` |
| `/health` | GET | no | — sin sesión (no aplica) |
| `/manager/me/team` | GET | sí | ✅ permitida |
| `/manager/me/team/export.csv` | GET | sí | ✅ permitida |
| `/manager/me/widgets` | GET | sí | ✅ permitida |
| `/manager/users/{user_id}/available-custom-paths` | GET | sí | ⛔ 403 `company_read_only` |
| `/manager/users/{user_id}/custom-path-assignments` | GET | sí | ⛔ 403 `company_read_only` |
| `/manager/users/{user_id}/custom-path-assignments/{custom_path_id}` | DELETE | sí | ⛔ 403 `company_read_only` |
| `/manager/users/{user_id}/custom-path-assignments/{custom_path_id}` | POST | sí | ⛔ 403 `company_read_only` |
| `/manager/users/{user_id}/detail` | GET | sí | ✅ permitida |
| `/manager/users/{user_id}/enroll` | POST | sí | ⛔ 403 `company_read_only` |
| `/manager/users/{user_id}/enroll/{path_code}` | DELETE | sí | ⛔ 403 `company_read_only` |
| `/manager/users/{user_id}/path` | GET | sí | ✅ permitida |
| `/manager/users/{user_id}/progression` | GET | sí | ✅ permitida |
| `/manager/users/{user_id}/results` | GET | sí | ✅ permitida |
| `/me/assignments` | GET | sí | ⛔ 403 `company_read_only` |
| `/me/badges` | GET | sí | ✅ permitida |
| `/me/behavior-feedback` | GET | sí | ✅ permitida |
| `/me/consent` | GET | sí | ✅ permitida |
| `/me/consent` | POST | sí | ⛔ 403 `company_read_only` |
| `/me/home` | GET | sí | ✅ permitida |
| `/me/metrics` | GET | sí | ✅ permitida |
| `/me/onboarding` | GET | sí | ⛔ 403 `company_read_only` |
| `/me/path` | GET | sí | ⛔ 403 `company_read_only` |
| `/me/pillar-feedback` | GET | sí | ✅ permitida |
| `/me/pillar-tips` | GET | sí | ⛔ 403 `company_read_only` |
| `/me/plan-accion/ai-summary` | POST | sí | ⛔ 403 `company_read_only` |
| `/me/progression` | GET | sí | ✅ permitida |
| `/me/support/tickets` | GET | sí | ✅ permitida |
| `/me/support/tickets` | POST | sí | ✅ permitida |
| `/me/support/tickets/{ticket_id}` | GET | sí | ✅ permitida |
| `/me/support/tickets/{ticket_id}/attachments/{attachment_id}` | GET | sí | ✅ permitida |
| `/me/support/tickets/{ticket_id}/reply` | POST | sí | ✅ permitida |
| `/me/timeline` | GET | sí | ✅ permitida |
| `/me/tips` | GET | sí | ⛔ 403 `company_read_only` |
| `/me/tips` | POST | sí | ⛔ 403 `company_read_only` |
| `/me/tips/reorder` | POST | sí | ⛔ 403 `company_read_only` |
| `/me/tips/{tip_id}` | DELETE | sí | ⛔ 403 `company_read_only` |
| `/me/tips/{tip_id}` | PATCH | sí | ⛔ 403 `company_read_only` |
| `/me/widgets` | GET | sí | ✅ permitida |
| `/modulos/by-dimension` | GET | sí | ⛔ 403 `company_read_only` |
| `/modulos/feed` | GET | sí | ⛔ 403 `company_read_only` |
| `/modulos/{slug}` | GET | sí | ⛔ 403 `company_read_only` |
| `/modulos/{slug}/attempt` | GET | sí | ⛔ 403 `company_read_only` |
| `/modulos/{slug}/attempts/start` | POST | sí | ⛔ 403 `company_read_only` |
| `/modulos/{slug}/blocks/{block_id}/complete` | POST | sí | ⛔ 403 `company_read_only` |
| `/modulos/{slug}/blocks/{block_id}/quiz/submit` | POST | sí | ⛔ 403 `company_read_only` |
| `/modulos/{slug}/blocks/{block_id}/reflection/submit` | POST | sí | ⛔ 403 `company_read_only` |
| `/paths` | GET | sí | ⛔ 403 `company_read_only` |
| `/paths/{code}` | GET | sí | ⛔ 403 `company_read_only` |
| `/paths/{code}/courses` | GET | no | — sin sesión (no aplica) |
| `/paths/{code}/events` | GET | sí | ⛔ 403 `company_read_only` |
| `/perspectives` | GET | no | — sin sesión (no aplica) |
| `/perspectives/{slug}` | GET | no | — sin sesión (no aplica) |
| `/support/tickets` | POST | no | — sin sesión (no aplica) |
| `/version` | GET | no | — sin sesión (no aplica) |
