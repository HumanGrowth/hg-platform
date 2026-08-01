/* eslint-disable @next/next/no-img-element */
"use client";

import { ArrowLeft, Building2, Calendar, LineChart } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { ActingAsBanner } from "@/components/admin/ActingAsBanner";
import { BetaBanner } from "@/components/BetaBanner";
import { AdminBottomNav } from "@/components/nav/AdminBottomNav";
import { SessionGate } from "@/components/SessionGate";
import { Eyebrow } from "@/components/ui/eyebrow";
import { useAuthStore } from "@/lib/auth-store";

// Panel interno de HG. SessionGate protege la sesión; el rol se valida por
// página (OrgAdminGate en /admin/org, SuperadminGate en /admin/orgs) — FU-12.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const isSuperadmin = user?.role === "superadmin";

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
                <Link
                  href={"/admin/org" as Route}
                  className="flex items-center gap-2 rounded-md px-3 py-2 font-sans text-sm font-medium text-fg hover:bg-bg-sunken"
                >
                  <LineChart size={16} strokeWidth={1.75} />
                  Dashboard org
                </Link>
                {isSuperadmin && (
                  <>
                    <Link
                      href={"/admin/orgs" as Route}
                      className="flex items-center gap-2 rounded-md px-3 py-2 font-sans text-sm font-medium text-fg hover:bg-bg-sunken"
                    >
                      <Building2 size={16} strokeWidth={1.75} />
                      Organizaciones
                    </Link>
                    <Link
                      href={"/admin/events" as Route}
                      className="flex items-center gap-2 rounded-md px-3 py-2 font-sans text-sm font-medium text-fg hover:bg-bg-sunken"
                    >
                      <Calendar size={16} strokeWidth={1.75} />
                      Eventos
                    </Link>
                  </>
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
            <AdminBottomNav isSuperadmin={isSuperadmin} className="md:hidden" />
          </div>
        </div>
      </SessionGate>
    </div>
  );
}
