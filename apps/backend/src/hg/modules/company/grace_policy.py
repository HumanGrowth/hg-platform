"""Allowlist del modo gracia (ADR-0016 · LC-04). **Deny por defecto.**

En ``grace`` el usuario solo puede LEER su progreso / perfil / dashboards (y los de
su equipo u organización si es manager/RRHH/company_admin), exportar CSV, usar
soporte y las rutas de sesión. Todo lo demás (contenido, assessment, invitaciones,
cualquier escritura) responde 403 ``company_read_only``.

Las rutas se identifican por **plantilla de ruta + método** (no por URL cruda), sin
el prefijo ``/api/v1``. Toda ruta autenticada registrada debe estar en exactamente
una de las dos tablas: ``GRACE_ALLOW`` o ``GRACE_DENY_REVIEWED``. El test
``test_grace_policy_covers_all_routes`` falla si aparece una ruta nueva sin
clasificar, de modo que nada queda permitido (ni sin revisar) por omisión.

Decisiones de criterio (ver tabla del PR): ``/me/path``, ``/me/assignments``,
``/me/onboarding``, ``/me/tips``, ``/me/pillar-tips``, ``/events``,
``/community-events`` y ``/paths*`` sirven o recomiendan CONTENIDO/comunidad, no
progreso → denegadas. Los GET de roster/dashboards de manager, RRHH y
company_admin → permitidos.
"""
from __future__ import annotations

from typing import Final

API_PREFIX: Final = "/api/v1"

Route = tuple[str, str]  # (METHOD, plantilla de ruta sin /api/v1)

# Rutas de sesión: permitidas en TODOS los estados que las alcanzan (logout siempre).
ALWAYS_ALLOWED: Final[frozenset[Route]] = frozenset({("POST", "/auth/logout")})

GRACE_ALLOW: Final[frozenset[Route]] = frozenset(
    {
        # Sesión
        ("POST", "/auth/login"),
        ("POST", "/auth/refresh"),
        ("POST", "/auth/logout"),
        ("GET", "/auth/me"),  # incluye company_status (LC-05)
        ("GET", "/auth/me/dashboard-prefs/{dashboard}"),
        # Progreso / perfil propios (solo lectura)
        ("GET", "/me/home"),
        ("GET", "/me/metrics"),
        ("GET", "/me/widgets"),
        ("GET", "/me/progression"),
        ("GET", "/me/timeline"),
        ("GET", "/me/badges"),
        ("GET", "/me/consent"),
        ("GET", "/me/behavior-feedback"),
        ("GET", "/me/pillar-feedback"),
        ("GET", "/assessment/me/radar"),
        ("GET", "/assessment/me/results"),
        # Manager (solo lectura de progreso del equipo, incl. export CSV)
        ("GET", "/manager/me/team"),
        ("GET", "/manager/me/team/export.csv"),
        ("GET", "/manager/me/widgets"),
        ("GET", "/manager/users/{user_id}/detail"),
        ("GET", "/manager/users/{user_id}/path"),
        ("GET", "/manager/users/{user_id}/progression"),
        ("GET", "/manager/users/{user_id}/results"),
        # RRHH / company_admin / admin (solo lectura, incl. export CSV)
        ("GET", "/admin/org/insights"),
        ("GET", "/admin/org/metrics"),
        ("GET", "/admin/org/widgets"),
        ("GET", "/admin/org/users/export.csv"),
        ("GET", "/admin/orgs/{org_id}/users"),
        ("GET", "/admin/users/{user_id}/behavior-matrix"),
        ("GET", "/admin/users/{user_id}/pillar-feedback"),
        ("GET", "/company/info"),
        ("GET", "/company/members"),
        ("GET", "/company/organizations"),
        # Soporte: los tickets siguen funcionando
        ("GET", "/me/support/tickets"),
        ("POST", "/me/support/tickets"),
        ("GET", "/me/support/tickets/{ticket_id}"),
        ("GET", "/me/support/tickets/{ticket_id}/attachments/{attachment_id}"),
        ("POST", "/me/support/tickets/{ticket_id}/reply"),
    }
)

# Resto de las rutas autenticadas, revisadas una por una: en gracia → 403.
# (Generada desde las rutas registradas y revisada a mano; ver tabla del PR.)
GRACE_DENY_REVIEWED: Final[frozenset[Route]] = frozenset(
    {
        ("GET", "/admin/companies/{company_id}/events"),
        ("POST", "/admin/companies/{company_id}/status"),
        ("GET", "/admin/areas"),
        ("POST", "/admin/areas"),
        ("PATCH", "/admin/areas/{code}"),
        ("GET", "/admin/assignable-units"),
        ("DELETE", "/admin/assignments/{assignment_id}"),
        ("PATCH", "/admin/assignments/{assignment_id}"),
        ("DELETE", "/admin/blocks/{block_id}"),
        ("PATCH", "/admin/blocks/{block_type}/{block_id}"),
        ("GET", "/admin/community-events"),
        ("POST", "/admin/community-events"),
        ("DELETE", "/admin/community-events/{event_id}"),
        ("PATCH", "/admin/community-events/{event_id}"),
        ("GET", "/admin/companies"),
        ("POST", "/admin/companies"),
        ("GET", "/admin/companies/{company_id}/access"),
        ("PUT", "/admin/companies/{company_id}/access"),
        ("PATCH", "/admin/companies/{company_id}/licenses"),
        ("GET", "/admin/contact/inquiries"),
        ("GET", "/admin/custom-paths"),
        ("POST", "/admin/custom-paths"),
        ("DELETE", "/admin/custom-paths/{custom_path_id}"),
        ("PATCH", "/admin/custom-paths/{custom_path_id}"),
        ("PUT", "/admin/custom-paths/{custom_path_id}/assignments"),
        ("PUT", "/admin/custom-paths/{custom_path_id}/items"),
        ("DELETE", "/admin/invitations/{invitation_id}"),
        ("POST", "/admin/learning-units"),
        ("DELETE", "/admin/learning-units/{unit_id}"),
        ("PATCH", "/admin/learning-units/{unit_id}"),
        ("POST", "/admin/learning-units/{unit_id}/blocks"),
        ("POST", "/admin/learning-units/{unit_id}/blocks/reorder"),
        ("POST", "/admin/learning-units/{unit_id}/publish"),
        ("POST", "/admin/learning-units/{unit_id}/unpublish"),
        ("POST", "/admin/organizations/{org_id}/assignments"),
        ("GET", "/admin/organizations/{org_id}/assignments-summary"),
        ("GET", "/admin/organizations/{org_id}/modules"),
        ("DELETE", "/admin/organizations/{org_id}/modules/{unit_id}"),
        ("GET", "/admin/orgs"),
        ("POST", "/admin/orgs"),
        ("GET", "/admin/orgs/{org_id}/invitations"),
        ("POST", "/admin/orgs/{org_id}/invite"),
        ("GET", "/admin/perspectives"),
        ("POST", "/admin/perspectives"),
        ("DELETE", "/admin/perspectives/{post_id}"),
        ("GET", "/admin/perspectives/{post_id}"),
        ("PATCH", "/admin/perspectives/{post_id}"),
        ("POST", "/admin/perspectives/{post_id}/publish"),
        ("POST", "/admin/perspectives/{post_id}/unpublish"),
        ("GET", "/admin/scoring-config"),
        ("POST", "/admin/scoring-config/recompute"),
        ("PUT", "/admin/scoring-config/{dimension_code}"),
        ("GET", "/admin/support/tickets"),
        ("GET", "/admin/support/tickets/{ticket_id}"),
        ("PATCH", "/admin/support/tickets/{ticket_id}"),
        ("GET", "/admin/support/tickets/{ticket_id}/attachments/{attachment_id}"),
        ("POST", "/admin/support/tickets/{ticket_id}/note"),
        ("POST", "/admin/support/tickets/{ticket_id}/reply"),
        ("POST", "/admin/upload/image"),
        ("DELETE", "/admin/users/{user_id}"),
        ("PATCH", "/admin/users/{user_id}"),
        ("GET", "/admin/users/{user_id}/assignments"),
        ("POST", "/admin/users/{user_id}/assignments"),
        ("PUT", "/admin/users/{user_id}/behavior-evaluations"),
        ("GET", "/admin/users/{user_id}/custom-path"),
        ("PUT", "/admin/users/{user_id}/pillar-feedback"),
        ("POST", "/assessment/admin/users/{user_id}/reset-retake/{dimension}"),
        ("POST", "/assessment/me/results/{dimension}/confirm"),
        ("POST", "/assessment/sessions"),
        ("GET", "/assessment/sessions/{session_id}"),
        ("POST", "/assessment/sessions/{session_id}/abandon"),
        ("POST", "/assessment/sessions/{session_id}/finalize"),
        ("POST", "/assessment/sessions/{session_id}/respond"),
        ("PATCH", "/auth/me"),
        ("DELETE", "/auth/me/dashboard-prefs/{dashboard}"),
        ("PUT", "/auth/me/dashboard-prefs/{dashboard}"),
        ("POST", "/auth/me/onboarding-seen"),
        ("GET", "/community-events"),
        ("GET", "/community-events/{event_id}"),
        ("POST", "/company/invitations/send"),
        ("POST", "/company/members/bulk-import"),
        ("GET", "/company/members/bulk-import/template"),
        ("PATCH", "/company/members/{user_id}"),
        ("DELETE", "/company/members/{user_id}/invite"),
        ("POST", "/company/members/{user_id}/resend-invite"),
        ("POST", "/company/organizations"),
        ("DELETE", "/company/organizations/{org_id}"),
        ("PATCH", "/company/organizations/{org_id}"),
        ("POST", "/company/organizations/{org_id}/invite"),
        ("PATCH", "/company/organizations/{org_id}/quota"),
        ("GET", "/events"),
        ("GET", "/events/{slug}"),
        ("GET", "/events/{slug}/next"),
        ("GET", "/manager/users/{user_id}/available-custom-paths"),
        ("GET", "/manager/users/{user_id}/custom-path-assignments"),
        ("DELETE", "/manager/users/{user_id}/custom-path-assignments/{custom_path_id}"),
        ("POST", "/manager/users/{user_id}/custom-path-assignments/{custom_path_id}"),
        ("POST", "/manager/users/{user_id}/enroll"),
        ("DELETE", "/manager/users/{user_id}/enroll/{path_code}"),
        ("GET", "/me/assignments"),
        ("POST", "/me/consent"),
        ("GET", "/me/onboarding"),
        ("GET", "/me/path"),
        ("GET", "/me/pillar-tips"),
        ("POST", "/me/plan-accion/ai-summary"),
        ("GET", "/me/tips"),
        ("POST", "/me/tips"),
        ("POST", "/me/tips/reorder"),
        ("DELETE", "/me/tips/{tip_id}"),
        ("PATCH", "/me/tips/{tip_id}"),
        ("GET", "/modulos/by-dimension"),
        ("GET", "/modulos/feed"),
        ("GET", "/modulos/{slug}"),
        ("GET", "/modulos/{slug}/attempt"),
        ("POST", "/modulos/{slug}/attempts/start"),
        ("POST", "/modulos/{slug}/blocks/{block_id}/complete"),
        ("POST", "/modulos/{slug}/blocks/{block_id}/quiz/submit"),
        ("POST", "/modulos/{slug}/blocks/{block_id}/reflection/submit"),
        ("GET", "/paths"),
        ("GET", "/paths/{code}"),
        ("GET", "/paths/{code}/events"),
    }
)
