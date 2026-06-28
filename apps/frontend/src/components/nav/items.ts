import { BookOpen, Home, Menu, Route as RouteIcon, User, Users, type LucideIcon } from "lucide-react";

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

export const SIDE_NAV_ITEMS: NavItem[] = [
  { href: "/home", label: "Inicio", icon: Home },
  { href: "/path", label: "Mi Ruta", icon: RouteIcon },
  { href: "/library", label: "Biblioteca", icon: BookOpen },
  { href: "/perfil", label: "Mi Perfil", icon: User },
  { href: "/team", label: "Mi equipo", icon: Users, roles: MANAGER_ROLES },
];

/** BottomNav mobile: 4 ítems fijos + botón "Más" (drawer). */
export const BOTTOM_NAV_ITEMS_BASE: NavItem[] = [
  { href: "/home", label: "Inicio", icon: Home },
  { href: "/path", label: "Mi Ruta", icon: RouteIcon },
  { href: "/library", label: "Biblioteca", icon: BookOpen },
  { href: "/perfil", label: "Perfil", icon: User },
];

export function isManagerRole(role: UserRole | undefined): boolean {
  return role !== undefined && MANAGER_ROLES.includes(role);
}

/** "Mi equipo" se oculta si el rol califica pero no tiene reportes (TM-04). */
export function showTeam(user: Pick<MeUser, "role" | "reports_count"> | null | undefined): boolean {
  if (!user || !isManagerRole(user.role)) return false;
  return (user.reports_count ?? 0) > 0;
}

export function sideNavItemsForRole(
  user: Pick<MeUser, "role" | "reports_count"> | null | undefined,
): NavItem[] {
  return SIDE_NAV_ITEMS.filter((item) => {
    if (item.href === "/team") return showTeam(user);
    if (!item.roles) return true;
    return user?.role !== undefined && item.roles.includes(user.role);
  });
}

export function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
