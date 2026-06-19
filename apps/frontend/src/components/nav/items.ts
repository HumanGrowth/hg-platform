import { Hexagon, Home, Route as RouteIcon, User, Users, type LucideIcon } from "lucide-react";

import type { UserRole } from "@/lib/types";

/** Destinos de navegación del Producto A (colaborador + manager). */
export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Si está definido, solo se muestra cuando user.role está en la lista. */
  roles?: UserRole[];
}

const MANAGER_ROLES: UserRole[] = ["manager", "admin", "superadmin"];

export const NAV_ITEMS: NavItem[] = [
  { href: "/home", label: "Inicio", icon: Home },
  { href: "/path", label: "Mi Ruta", icon: RouteIcon }, // /library vive acá como sub-vista
  { href: "/radar", label: "Mi Radar", icon: Hexagon },
  { href: "/team", label: "Mi equipo", icon: Users, roles: MANAGER_ROLES },
  { href: "/profile", label: "Perfil", icon: User },
];

export function navItemsForRole(role: UserRole | undefined): NavItem[] {
  return NAV_ITEMS.filter((item) => !item.roles || (role !== undefined && item.roles.includes(role)));
}

/** BottomNav mobile: máximo 4 ítems. Manager → Perfil pasa al menú del avatar
 * y "Mi equipo" toma su lugar. Colaborador → los 4 de siempre. */
export function bottomNavItemsForRole(role: UserRole | undefined): NavItem[] {
  const all = navItemsForRole(role);
  if (role !== undefined && MANAGER_ROLES.includes(role)) {
    return all.filter((i) => i.href !== "/profile").slice(0, 4);
  }
  return all.slice(0, 4);
}

export function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
