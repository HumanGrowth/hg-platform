"use client";

import { Calendar, LogOut, ShieldCheck, UserCog, Users } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { apiLogout } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";

import { showTeam } from "./items";

export function MoreDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const user = useAuthStore((s) => s.user);
  const isAdminPlus = user?.role === "admin" || user?.role === "superadmin";

  async function logout() {
    try {
      await apiLogout();
    } finally {
      useAuthStore.getState().clear();
      window.location.href = "/login";
    }
  }

  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-40 bg-hg-ink/30" onClick={onClose} aria-hidden />
      <aside
        className="fixed bottom-0 right-0 top-0 z-50 flex w-72 flex-col gap-1 border-l border-border bg-bg-raised p-6"
        role="dialog"
        aria-label="Más opciones"
      >
        <div className="eyebrow mb-4">Más opciones</div>
        <Link
          href={"/eventos" as Route}
          onClick={onClose}
          className="flex items-center gap-3 rounded-md px-3 py-3 text-fg hover:bg-bg-sunken"
        >
          <Calendar size={18} strokeWidth={1.75} /> Eventos (live)
        </Link>
        {showTeam(user) && (
          <Link
            href={"/team" as Route}
            onClick={onClose}
            className="flex items-center gap-3 rounded-md px-3 py-3 text-fg hover:bg-bg-sunken"
          >
            <Users size={18} strokeWidth={1.75} /> Mi equipo
          </Link>
        )}
        {isAdminPlus && (
          <Link
            href={"/admin/org" as Route}
            onClick={onClose}
            className="flex items-center gap-3 rounded-md px-3 py-3 text-fg hover:bg-bg-sunken"
          >
            <ShieldCheck size={18} strokeWidth={1.75} /> Modo admin
          </Link>
        )}
        <Link
          href={"/perfil/editar" as Route}
          onClick={onClose}
          className="flex items-center gap-3 rounded-md px-3 py-3 text-fg hover:bg-bg-sunken"
        >
          <UserCog size={18} strokeWidth={1.75} /> Editar mi información
        </Link>
        <div className="mt-auto border-t border-border pt-4">
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-md px-3 py-3 text-danger hover:bg-bg-sunken"
          >
            <LogOut size={18} strokeWidth={1.75} /> Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  );
}
