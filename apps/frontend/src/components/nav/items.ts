import { Hexagon, Home, Route as RouteIcon, User, type LucideIcon } from "lucide-react";

/** Los 4 destinos de navegación del Producto A (colaborador). */
export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/home", label: "Inicio", icon: Home },
  { href: "/path", label: "Mi Ruta", icon: RouteIcon }, // /library vive acá como sub-vista
  { href: "/radar", label: "Mi Radar", icon: Hexagon },
  { href: "/profile", label: "Perfil", icon: User },
];

export function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
