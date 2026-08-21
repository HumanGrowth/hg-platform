import {
  Calendar,
  ClipboardList,
  Home,
  Menu,
  Route as RouteIcon,
  ShieldCheck,
  Sparkles,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";

import type { User as MeUser, UserRole } from "@/lib/types";

export { Menu };

/** Destinos de navegación del Producto A (colaborador + manager). */
export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Si está definido, solo se muestra cuando user.role está en la lista. */
  roles?: UserRole[];
}

const MANAGER_ROLES: UserRole[] = ["manager", "admin", "superadmin"];
// Roles con acceso a Modo Admin. La landing depende del rol (ver adminHomeHref):
// admin/superadmin → dashboard RRHH; company_admin → panel de su empresa.
const ADMIN_ENTRY_ROLES: UserRole[] = ["admin", "superadmin", "company_admin"];

/** Landing de "Modo admin" según el rol (null si el rol no tiene panel). */
export function adminHomeHref(role: UserRole | undefined): string | null {
  if (role === "superadmin" || role === "admin") return "/admin/org";
  if (role === "company_admin") return "/admin/empresa";
  return null;
}

// Desktop (TASK polish-04, Opción B): se suma "Eventos" — en desktop no hay
// drawer "Más", así que sin esto el acceso a eventos se perdía. En mobile,
// Eventos vive en el MoreDrawer (ver BOTTOM_NAV_ITEMS_BASE + MoreDrawer).
export const SIDE_NAV_ITEMS: NavItem[] = [
  { href: "/home", label: "Inicio", icon: Home },
  { href: "/path", label: "Mi Ruta", icon: RouteIcon },
  { href: "/modulos", label: "Módulos", icon: Sparkles },
  { href: "/plan-accion", label: "Plan de Acción", icon: ClipboardList },
  { href: "/eventos", label: "Eventos", icon: Calendar },
  { href: "/perfil", label: "Mi Perfil", icon: User },
  { href: "/team", label: "Mi equipo", icon: Users, roles: MANAGER_ROLES },
  // "Empresa" ya no vive en el menú del colaborador: la gestión de empresa vive
  // dentro de Modo Admin. El href real de "Modo admin" se resuelve por rol.
  { href: "/admin/org", label: "Modo admin", icon: ShieldCheck, roles: ADMIN_ENTRY_ROLES },
];

/** BottomNav mobile: 4 ítems fijos + botón "Más" (drawer, incluye Eventos). */
export const BOTTOM_NAV_ITEMS_BASE: NavItem[] = [
  { href: "/home", label: "Inicio", icon: Home },
  { href: "/path", label: "Mi Ruta", icon: RouteIcon },
  { href: "/modulos", label: "Módulos", icon: Sparkles },
  { href: "/perfil", label: "Perfil", icon: User },
];

export function isManagerRole(role: UserRole | undefined): boolean {
  return role !== undefined && MANAGER_ROLES.includes(role);
}

/**
 * "Mi equipo" visible para todo manager/admin (release oficial: el manager
 * necesita un entrypoint claro). Si aún no tiene reportes, `/team` muestra su
 * estado vacío. `reports_count` se mantiene en la firma para compat de llamadas.
 */
export function showTeam(user: Pick<MeUser, "role" | "reports_count"> | null | undefined): boolean {
  return isManagerRole(user?.role);
}

export function sideNavItemsForRole(
  user: Pick<MeUser, "role" | "reports_count"> | null | undefined,
): NavItem[] {
  const adminHref = adminHomeHref(user?.role);
  return SIDE_NAV_ITEMS.filter((item) => {
    if (item.href === "/team") return showTeam(user);
    if (!item.roles) return true;
    return user?.role !== undefined && item.roles.includes(user.role);
  }).map((item) =>
    // "Modo admin" apunta a la landing correcta según el rol (empresa vs dashboard).
    item.label === "Modo admin" && adminHref ? { ...item, href: adminHref } : item,
  );
}

export function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
