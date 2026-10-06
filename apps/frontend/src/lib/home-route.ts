import type { UserRole } from "@/lib/types";

/** Roles que operan la plataforma: no pasan por onboarding, assessment ni
 * módulos de onboarding (ver `learning_units/onboarding.py` en el backend). */
const ADMIN_ROLES: ReadonlySet<UserRole> = new Set(["admin", "company_admin", "superadmin"]);

export const isAdminRole = (role: UserRole | undefined | null): boolean =>
  role != null && ADMIN_ROLES.has(role);

/** Destino post-login / post-aceptar invitación según el rol. */
export const homeRouteFor = (role: UserRole | undefined | null): string =>
  isAdminRole(role) ? "/admin" : "/home";
