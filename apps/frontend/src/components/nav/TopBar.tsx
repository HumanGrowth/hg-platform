"use client";

import { LogOut, ShieldCheck, UserCog } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import { Avatar } from "@/components/ui/avatar";
import { apiLogout } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";

export function TopBar() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const isOrgAdmin = user?.role === "admin" || user?.role === "superadmin";

  async function logout() {
    try {
      await apiLogout();
    } finally {
      clear();
      router.replace("/login");
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between gap-4 border-b border-border bg-bg-raised px-4 md:px-6">
      {/* Logo: visible en mobile (la SideNav está oculta <md). */}
      <Link href="/home" aria-label="Human Growth — inicio" className="md:hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo-color.svg" alt="Human Growth" className="h-7 w-auto" />
      </Link>
      <div className="flex-1" />

      <div className="relative">
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
          className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange"
        >
          <Avatar name={user?.full_name ?? "?"} size="md" />
        </button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
            <div
              role="menu"
              className="absolute right-0 z-50 mt-2 w-56 rounded-lg border border-border bg-bg-raised p-2 shadow-md"
            >
              <div className="px-3 py-2">
                <p className="truncate font-sans text-sm font-semibold text-fg">{user?.full_name}</p>
                <p className="truncate font-sans text-xs text-fg-muted">{user?.email}</p>
              </div>

              <Link
                href={"/perfil/editar" as Route}
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 rounded-md px-3 py-2 font-sans text-sm text-fg hover:bg-bg-sunken"
              >
                <UserCog size={16} strokeWidth={1.75} />
                Editar mi información
              </Link>

              {isOrgAdmin && (
                <Link
                  href={"/admin/org" as Route}
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 rounded-md px-3 py-2 font-sans text-sm text-fg hover:bg-bg-sunken"
                >
                  <ShieldCheck size={16} strokeWidth={1.75} />
                  Modo admin
                </Link>
              )}

              <div className="my-1 border-t border-border" />

              <button
                type="button"
                role="menuitem"
                onClick={logout}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 font-sans text-sm text-danger hover:bg-bg-sunken"
              >
                <LogOut size={16} strokeWidth={1.75} />
                Cerrar sesión
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
