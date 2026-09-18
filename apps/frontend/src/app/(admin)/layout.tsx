/* eslint-disable @next/next/no-img-element */
"use client";

import {
  ArrowLeft,
  Boxes,
  Building2,
  Calendar,
  ChevronDown,
  Layers,
  LineChart,
  Map,
  Newspaper,
  Users2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";

import { ActingAsBanner } from "@/components/admin/ActingAsBanner";
import { BetaBanner } from "@/components/BetaBanner";
import { AdminBottomNav } from "@/components/nav/AdminBottomNav";
import { isActive } from "@/components/nav/items";
import { SessionGate } from "@/components/SessionGate";
import { useTheme } from "@/components/theme/ThemeProvider";
import { Eyebrow } from "@/components/ui/eyebrow";
import { useActingCompany } from "@/lib/acting-company";
import { useAuthStore } from "@/lib/auth-store";
import { cn } from "@/lib/utils";

// Panel interno de HG. SessionGate protege la sesión; el rol se valida por
// página (OrgAdminGate en /admin/org, SuperadminGate en /admin/companies) — FU-12.
// Opciones exclusivas de superadmin — agrupadas en UN desplegable (M2·3), en
// vez de sueltas en el nav general.
const SUPERADMIN_ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/admin/companies", label: "Empresas", icon: Building2 },
  { href: "/admin/areas", label: "Áreas de contenido", icon: Layers },
  { href: "/admin/events", label: "Eventos", icon: Calendar },
  { href: "/admin/perspectivas", label: "Perspectivas", icon: Newspaper },
];

/**
 * Link del sidebar admin con estado activo (antes ningún link mostraba en qué
 * página estabas). `exact` para rutas raíz que son prefijo de otras
 * (/admin/empresa vs /admin/empresa/miembros) — sin él, ambos se marcarían.
 */
function AdminNavLink({
  href,
  icon: Icon,
  exact = false,
  children,
}: {
  href: string;
  icon: LucideIcon;
  exact?: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = exact ? pathname === href : isActive(pathname, href);
  return (
    <Link
      href={href as Route}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-2 rounded-xl px-3 py-2 font-sans text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hg-amber",
        active
          ? "bg-hg-green-100/90 text-primary shadow-[inset_0_0_0_1px_rgba(74,122,84,0.35)]"
          : "glass-hover-bg text-fg",
      )}
    >
      <Icon size={16} strokeWidth={1.75} />
      {children}
    </Link>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const { theme } = useTheme();
  const acting = useActingCompany();
  const isSuperadmin = user?.role === "superadmin";
  const isOrgAdmin = user?.role === "admin" || isSuperadmin;
  // Gestión de orgs/miembros: admin (rol unificado) y company_admin siempre; el
  // superadmin solo cuando eligió una empresa (contexto acting-company).
  const showOrgMgmt =
    user?.role === "admin" ||
    user?.role === "company_admin" ||
    (isSuperadmin && Boolean(acting));
  // La entidad Empresa (tier/billing/licencias) es superadmin-only, sobre la
  // empresa que está gestionando.
  const showEmpresaEntity = isSuperadmin && Boolean(acting);
  const [superOpen, setSuperOpen] = React.useState(true);

  return (
    // Shell de altura fija: el sidebar queda fijo y SOLO el <main> scrollea (igual
    // que el layout del colaborador). Antes usaba min-h-screen → toda la página
    // scrolleaba y el nav se desfasaba en páginas largas.
    <div className="flex h-dvh flex-col overflow-hidden">
      <BetaBanner />
      <SessionGate>
        <div className="flex min-h-0 flex-1 md:gap-3 md:p-3">
          {/* Sidebar flotante glass (mismo lenguaje que el dock de
              SpatialCanvas): panel con radio, borde de luz y sombra, con el
              fondo de blobs visible alrededor — antes era una columna plana
              pegada al borde con solo el fill translúcido. */}
          <aside className="glass-surface-strong hidden h-full w-60 shrink-0 flex-col gap-6 overflow-y-auto px-4 py-5 md:flex">
            <Link href="/home" aria-label="Volver a la app">
              <img
                src={theme === "dark" ? "/logo/nav/logo-nav-blanco@2x.png" : "/logo/nav/logo-nav-negro@2x.png"}
                alt="Human Growth"
                className="h-7 w-auto"
              />
            </Link>
            <div>
              <Eyebrow className="mb-3">Panel HG</Eyebrow>
              <nav className="flex flex-col gap-1">
                {/* Orden (M2·2): Dashboard (datos de la empresa) → Organización
                    (gestión de miembros). El route /admin/org es el panel de
                    datos; /admin/empresa/miembros gestiona los miembros. */}
                {isOrgAdmin && (
                  <AdminNavLink href="/admin/org" icon={LineChart}>Dashboard</AdminNavLink>
                )}
                {/* Superadmin: rótulo de la empresa que está gestionando. */}
                {isSuperadmin && acting && (
                  <p className="px-3 pb-1 pt-2 font-sans text-xs text-fg-muted">
                    Gestionando: <span className="font-semibold text-fg">{acting.name}</span>
                  </p>
                )}
                {showEmpresaEntity && (
                  <AdminNavLink href="/admin/empresa" icon={Building2} exact>Empresa</AdminNavLink>
                )}
                {showOrgMgmt && (
                  <AdminNavLink href="/admin/empresa/organizaciones" icon={Boxes}>Organización</AdminNavLink>
                )}
                {showOrgMgmt && (
                  <AdminNavLink href="/admin/empresa/miembros" icon={Users2}>Miembros</AdminNavLink>
                )}
                {showOrgMgmt && (
                  <AdminNavLink href="/admin/empresa/rutas" icon={Map}>Rutas</AdminNavLink>
                )}
                {/* M2·3: TODAS las opciones exclusivas de superadmin en UN solo
                    desplegable, en vez de sueltas en el nav. */}
                {isSuperadmin && (
                  <div className="mt-1">
                    <button
                      type="button"
                      onClick={() => setSuperOpen((v) => !v)}
                      aria-expanded={superOpen}
                      className="glass-hover-bg flex w-full items-center justify-between rounded-xl px-3 py-2 font-sans text-xs font-semibold uppercase tracking-meta text-fg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hg-amber"
                    >
                      Superadmin
                      <ChevronDown
                        size={14}
                        strokeWidth={2}
                        className={superOpen ? "rotate-180 transition-transform" : "transition-transform"}
                      />
                    </button>
                    {superOpen && (
                      <div className="mt-1 flex flex-col gap-1 border-l border-border pl-2">
                        {SUPERADMIN_ITEMS.map((item) => (
                          <AdminNavLink key={item.href} href={item.href} icon={item.icon}>
                            {item.label}
                          </AdminNavLink>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </nav>
            </div>
            <Link
              href="/home"
              className="glass-hover-bg mt-auto flex items-center gap-2 rounded-xl px-3 py-2 font-sans text-sm font-medium text-fg-muted hover:text-fg"
            >
              <ArrowLeft size={16} strokeWidth={1.75} />
              Volver a colaborador
            </Link>
          </aside>
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <ActingAsBanner />
            {/* `relative`: main es el containing block → cualquier elemento
                position:absolute queda contenido y clippeado por su scroll, y no
                extiende <html> (evita que un sr-only rebelde rompa el sticky). */}
            <main className="relative flex-1 overflow-y-auto pb-20 md:pb-0">{children}</main>
            <AdminBottomNav role={user?.role} className="md:hidden" />
          </div>
        </div>
      </SessionGate>
    </div>
  );
}
