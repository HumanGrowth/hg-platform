/* eslint-disable @next/next/no-img-element */
import { ArrowLeft, Building2, LineChart } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { AdminGate } from "@/components/AdminGate";
import { BetaBanner } from "@/components/BetaBanner";
import { SessionGate } from "@/components/SessionGate";
import { Eyebrow } from "@/components/ui/eyebrow";

// Panel interno de HG. SessionGate (sesión) + AdminGate (rol superadmin).
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <BetaBanner />
      <SessionGate>
        <AdminGate>
          <div className="flex flex-1">
            <aside className="hidden w-60 shrink-0 flex-col gap-6 border-r border-border bg-bg-raised px-5 py-6 md:flex">
              <Link href="/home" aria-label="Volver a la app">
                <img src="/brand/logo-color.svg" alt="Human Growth" className="h-7 w-auto" />
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
                  <Link
                    href={"/admin/orgs" as Route}
                    className="flex items-center gap-2 rounded-md px-3 py-2 font-sans text-sm font-medium text-fg hover:bg-bg-sunken"
                  >
                    <Building2 size={16} strokeWidth={1.75} />
                    Organizaciones
                  </Link>
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
            <div className="flex-1">{children}</div>
          </div>
        </AdminGate>
      </SessionGate>
    </div>
  );
}
