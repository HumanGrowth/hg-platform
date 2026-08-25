"use client";

import { ArrowLeft, Building2, Calendar, Layers, LineChart, Newspaper, Upload, Users2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useActingCompany } from "@/lib/acting-company";
import type { UserRole } from "@/lib/types";
import { cn } from "@/lib/utils";

import { isActive } from "./items";

interface AdminNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/**
 * Ítems del bottom nav admin por rol (y, para superadmin, según si está
 * gestionando una empresa). Cada rol ve solo destinos válidos: un company_admin
 * es rebotado por OrgAdminGate en /admin/org, y un superadmin sin empresa
 * elegida no tiene dashboard con sentido (agrega su propia org HG).
 */
function itemsForRole(role: UserRole | undefined, managingCompany: boolean): AdminNavItem[] {
  if (role === "superadmin") {
    // Gestionando una empresa → mismas acciones que el sidebar desktop.
    if (managingCompany) {
      return [
        { href: "/admin/org", label: "Dashboard", icon: LineChart },
        { href: "/admin/empresa", label: "Empresa", icon: Building2 },
        { href: "/admin/empresa/miembros", label: "Miembros", icon: Users2 },
        { href: "/admin/empresa/organizaciones", label: "Orgs", icon: Layers },
      ];
    }
    // Global HG (sin empresa elegida): el selector de empresas + contenido.
    return [
      { href: "/admin/companies", label: "Empresas", icon: Building2 },
      { href: "/admin/events", label: "Eventos", icon: Calendar },
      { href: "/admin/perspectivas", label: "Contenido", icon: Newspaper },
    ];
  }
  if (role === "admin") {
    // Rol unificado: gestiona toda su empresa + dashboard company-scope.
    return [
      { href: "/admin/org", label: "Dashboard", icon: LineChart },
      { href: "/admin/empresa/miembros", label: "Miembros", icon: Users2 },
      { href: "/admin/empresa/organizaciones", label: "Orgs", icon: Layers },
    ];
  }
  if (role === "company_admin") {
    // Legado (sin dashboard: OrgAdminGate lo restringe a admin/superadmin).
    return [
      { href: "/admin/empresa/miembros", label: "Miembros", icon: Users2 },
      { href: "/admin/empresa/organizaciones", label: "Orgs", icon: Layers },
      { href: "/admin/empresa/importar", label: "Importar", icon: Upload },
    ];
  }
  return [{ href: "/admin/org", label: "Panel", icon: LineChart }];
}

/**
 * Nav mobile del panel admin (bottom bar, consistente con el BottomNav del
 * colaborador). En desktop el panel usa el sidebar; esta barra sólo aparece en
 * `md:hidden` para que el admin NO se quede sin navegación en mobile.
 */
export function AdminBottomNav({
  role,
  className,
}: {
  role: UserRole | undefined;
  className?: string;
}) {
  const pathname = usePathname();
  const acting = useActingCompany();
  const items = itemsForRole(role, Boolean(acting));

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40 flex items-stretch border-t border-border bg-bg-raised",
        className,
      )}
    >
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href as Route}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-1 py-2.5 font-sans text-[11px] font-medium transition-colors",
              active ? "text-primary" : "text-fg-muted",
            )}
          >
            <Icon size={22} strokeWidth={1.75} />
            {item.label}
          </Link>
        );
      })}
      <Link
        href={"/home" as Route}
        className="flex flex-1 flex-col items-center justify-center gap-1 py-2.5 font-sans text-[11px] font-medium text-fg-muted transition-colors"
      >
        <ArrowLeft size={22} strokeWidth={1.75} />
        Salir
      </Link>
    </nav>
  );
}
