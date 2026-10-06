"use client";

import { LogOut, ShieldCheck, UserCog } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Avatar } from "@/components/ui/avatar";
import { apiLogout } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";

/**
 * Chip de usuario (avatar + menú: tema, editar info, modo admin/colaborador,
 * logout). Compartido por el shell de colaborador y el de admin: en admin el
 * chip se mantiene y el atajo cambia a "Modo colaborador".
 */
export function UserMenu({ adminMode = false }: { adminMode?: boolean }) {
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
    <div className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((v) => !v)}
        className="glass-fill-strong rounded-full glass-edge border shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hg-amber"
      >
        <Avatar name={user?.full_name ?? "?"} size="md" />
      </button>
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
          <div role="menu" className="glass-modal absolute right-0 z-50 mt-2 w-56 p-2">
            <div className="px-3 py-2">
              <p className="truncate font-sans text-sm font-semibold text-fg">{user?.full_name}</p>
              <p className="truncate font-sans text-xs text-fg-muted">{user?.email}</p>
            </div>
            <div className="my-1 border-t border-border-subtle" />
            <ThemeToggle variant="menu-item" className="glass-hover-bg" />
            <div className="my-1 border-t border-border-subtle" />
            <Link
              href={"/perfil/editar" as Route}
              role="menuitem"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2 rounded-md px-3 py-2 font-sans text-sm text-fg glass-hover-bg"
            >
              <UserCog size={16} strokeWidth={1.75} />
              Editar mi información
            </Link>
            {adminMode ? (
              <Link
                href={"/home" as Route}
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 rounded-md px-3 py-2 font-sans text-sm text-fg glass-hover-bg"
              >
                <ShieldCheck size={16} strokeWidth={1.75} />
                Modo colaborador
              </Link>
            ) : (
              isOrgAdmin && (
              <Link
                href={"/admin/org" as Route}
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 rounded-md px-3 py-2 font-sans text-sm text-fg glass-hover-bg"
              >
                <ShieldCheck size={16} strokeWidth={1.75} />
                Modo admin
              </Link>
              )
            )}
            <div className="my-1 border-t border-border-subtle" />
            <button
              type="button"
              role="menuitem"
              onClick={() => void logout()}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 font-sans text-sm text-danger glass-hover-bg"
            >
              <LogOut size={16} strokeWidth={1.75} />
              Cerrar sesión
            </button>
          </div>
        </>
      )}
    </div>
  );
}
