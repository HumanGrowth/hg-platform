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
  Newspaper,
  Upload,
  Users2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import * as React from "react";

import { ActingAsBanner } from "@/components/admin/ActingAsBanner";
import { BetaBanner } from "@/components/BetaBanner";
import { AdminBottomNav } from "@/components/nav/AdminBottomNav";
import { SessionGate } from "@/components/SessionGate";
import { Eyebrow } from "@/components/ui/eyebrow";
import { useActingCompany } from "@/lib/acting-company";
import { useAuthStore } from "@/lib/auth-store";

// Panel interno de HG. SessionGate protege la sesión; el rol se valida por
// página (OrgAdminGate en /admin/org, SuperadminGate en /admin/orgs) — FU-12.
// Opciones exclusivas de superadmin — agrupadas en UN desplegable (M2·3), en
// vez de sueltas en el nav general.
const SUPERADMIN_ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/admin/companies", label: "Empresas", icon: Building2 },
  { href: "/admin/areas", label: "Áreas de contenido", icon: Layers },
  { href: "/admin/orgs", label: "Organizaciones", icon: Building2 },
  { href: "/admin/events", label: "Eventos", icon: Calendar },
  { href: "/admin/perspectivas", label: "Perspectivas", icon: Newspaper },
  { href: "/admin/empresa/importar", label: "Importar", icon: Upload },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const acting = useActingCompany();
  const isSuperadmin = user?.role === "superadmin";
  const isOrgAdmin = user?.role === "admin" || isSuperadmin;
  // Los links de gestión de empresa se muestran al company_admin siempre; al
  // superadmin solo cuando eligió una empresa (contexto acting-company).
  const showCompanyLinks = user?.role === "company_admin" || (isSuperadmin && Boolean(acting));
  const [superOpen, setSuperOpen] = React.useState(true);

  return (
    // Shell de altura fija: el sidebar queda fijo y SOLO el <main> scrollea (igual
    // que el layout del colaborador). Antes usaba min-h-screen → toda la página
    // scrolleaba y el nav se desfasaba en páginas largas.
    <div className="flex h-screen flex-col overflow-hidden">
      <BetaBanner />
      <SessionGate>
        <div className="flex min-h-0 flex-1">
          <aside className="hidden h-full w-60 shrink-0 flex-col gap-6 overflow-y-auto border-r border-border bg-bg-raised px-5 py-6 md:flex">
            <Link href="/home" aria-label="Volver a la app">
              <img src="/logo/nav/logo-nav-negro@2x.png" alt="Human Growth" className="h-7 w-auto" />
            </Link>
            <div>
              <Eyebrow className="mb-3">Panel HG</Eyebrow>
              <nav className="flex flex-col gap-1">
                {/* Orden (M2·2): Dashboard (datos de la empresa) → Organización
                    (gestión de miembros). El route /admin/org es el panel de
                    datos; /admin/empresa/miembros gestiona los miembros. */}
                {isOrgAdmin && (
                  <Link
                    href={"/admin/org" as Route}
                    className="flex items-center gap-2 rounded-md px-3 py-2 font-sans text-sm font-medium text-fg hover:bg-bg-sunken"
                  >
                    <LineChart size={16} strokeWidth={1.75} />
                    Dashboard
                  </Link>
                )}
                {/* Superadmin: rótulo de la empresa que está gestionando. */}
                {isSuperadmin && acting && (
                  <p className="px-3 pb-1 pt-2 font-sans text-xs text-fg-muted">
                    Gestionando: <span className="font-semibold text-fg">{acting.name}</span>
                  </p>
                )}
                {showCompanyLinks && (
                  <Link
                    href={"/admin/empresa" as Route}
                    className="flex items-center gap-2 rounded-md px-3 py-2 font-sans text-sm font-medium text-fg hover:bg-bg-sunken"
                  >
                    <Building2 size={16} strokeWidth={1.75} />
                    Empresa
                  </Link>
                )}
                {showCompanyLinks && (
                  <Link
                    href={"/admin/empresa/organizaciones" as Route}
                    className="flex items-center gap-2 rounded-md px-3 py-2 font-sans text-sm font-medium text-fg hover:bg-bg-sunken"
                  >
                    <Boxes size={16} strokeWidth={1.75} />
                    Organización
                  </Link>
                )}
                {showCompanyLinks && (
                  <Link
                    href={"/admin/empresa/miembros" as Route}
                    className="flex items-center gap-2 rounded-md px-3 py-2 font-sans text-sm font-medium text-fg hover:bg-bg-sunken"
                  >
                    <Users2 size={16} strokeWidth={1.75} />
                    Miembros
                  </Link>
                )}
                {/* M2·3: TODAS las opciones exclusivas de superadmin en UN solo
                    desplegable, en vez de sueltas en el nav. */}
                {isSuperadmin && (
                  <div className="mt-1">
                    <button
                      type="button"
                      onClick={() => setSuperOpen((v) => !v)}
                      aria-expanded={superOpen}
                      className="flex w-full items-center justify-between rounded-md px-3 py-2 font-sans text-xs font-semibold uppercase tracking-meta text-fg-muted hover:bg-bg-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hg-amber"
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
                        {SUPERADMIN_ITEMS.map((item) => {
                          const Icon = item.icon;
                          return (
                            <Link
                              key={item.href}
                              href={item.href as Route}
                              className="flex items-center gap-2 rounded-md px-3 py-2 font-sans text-sm font-medium text-fg hover:bg-bg-sunken"
                            >
                              <Icon size={16} strokeWidth={1.75} />
                              {item.label}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </nav>
            </div>
            <Link
              href="/home"
              className="mt-auto flex items-center gap-2 rounded-md px-3 py-2 font-sans text-sm font-medium text-fg-muted hover:bg-bg-sunken hover:text-fg"
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
