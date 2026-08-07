"use client";

import { ArrowLeft, Building2, Calendar, LineChart, Newspaper } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

import { isActive } from "./items";

interface AdminNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  superadminOnly?: boolean;
}

const ADMIN_ITEMS: AdminNavItem[] = [
  { href: "/admin/org", label: "Panel", icon: LineChart },
  { href: "/admin/orgs", label: "Orgs", icon: Building2, superadminOnly: true },
  { href: "/admin/events", label: "Eventos", icon: Calendar, superadminOnly: true },
  { href: "/admin/perspectivas", label: "Contenido", icon: Newspaper, superadminOnly: true },
];

/**
 * Nav mobile del panel admin (bottom bar, consistente con el BottomNav del
 * colaborador). En desktop el panel usa el sidebar; esta barra sólo aparece en
 * `md:hidden` para que el admin NO se quede sin navegación en mobile.
 */
export function AdminBottomNav({
  isSuperadmin,
  className,
}: {
  isSuperadmin: boolean;
  className?: string;
}) {
  const pathname = usePathname();
  const items = ADMIN_ITEMS.filter((i) => isSuperadmin || !i.superadminOnly);

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
