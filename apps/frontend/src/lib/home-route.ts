import type { UserRole } from "@/lib/types";

/** Roles que operan la plataforma: no pasan por onboarding, assessment ni
 * módulos de onboarding (ver `learning_units/onboarding.py` en el backend). */
const ADMIN_ROLES: ReadonlySet<UserRole> = new Set(["admin", "company_admin", "superadmin"]);

export const isAdminRole = (role: UserRole | undefined | null): boolean =>
  role != null && ADMIN_ROLES.has(role);

/** Destino post-login / post-aceptar invitación según el rol. */
/** `/admin` solo no tiene página (404): el panel arranca en /admin/org. El
 * company_admin legado no pasa el OrgAdminGate de esa ruta → su home es la
 * gestión de Empresa. */
export const ADMIN_HOME = "/admin/org";
export const COMPANY_ADMIN_HOME = "/admin/empresa";

export const homeRouteFor = (role: UserRole | undefined | null): string => {
  if (role === "company_admin") return COMPANY_ADMIN_HOME;
  return isAdminRole(role) ? ADMIN_HOME : "/home";
};
