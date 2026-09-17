"use client";

import { LogOut, ShieldCheck, Sparkles, UserCog } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";

import { isActive, sideNavItemsForRole } from "@/components/nav/items";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useTheme } from "@/components/theme/ThemeProvider";
import { Avatar } from "@/components/ui/avatar";
import { apiLogout } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { getPageHeader } from "@/lib/glass/page-headers";
import { cn } from "@/lib/utils";

/**
 * SpatialCanvas — shell REAL que reemplaza SideNav + TopBar + BottomNav
 * (la app es siempre glassmorphic, light o dark). Referencia visual original:
 * HG/Artifacts/Renovación glassmorphic HG/SpatialCanvas.dc.html — runtime
 * propio en React, no se porta el runtime del .dc.html.
 *
 * Revisión (feedback de producto): se retiró el switch Focus/Insight/
 * Overview y "Reorganizar con IA" — el top bar ahora muestra el título +
 * descripción REAL de la página activa (lib/glass/page-headers.ts),
 * aplicado a TODA la app, no solo /home. Se retiró también el Command
 * Center (⌘K) — vuelve más adelante como el asistente de IA real; por
 * ahora el dock solo resalta el ícono de "Modo admin" como placeholder.
 *
 * Lo que es real: navegación (dock flotante, mismos destinos que
 * sideNavItemsForRole), sesión (menú de usuario: editar perfil, modo
 * admin, tema, logout).
 */
export function SpatialCanvas({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme } = useTheme();
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);
  const [menuOpen, setMenuOpen] = React.useState(false);

  const navItems = React.useMemo(() => sideNavItemsForRole(user), [user]);
  const isOrgAdmin = user?.role === "admin" || user?.role === "superadmin";
  const header = getPageHeader(pathname);

  async function logout() {
    try {
      await apiLogout();
    } finally {
      clear();
      router.replace("/login");
    }
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Top floating bar — reemplaza TopBar. Título + descripción reales de
          la página activa (no un mode-switcher). */}
      <div className="pointer-events-none absolute inset-x-3 top-3 z-20 flex flex-wrap items-center justify-between gap-2.5 md:inset-x-6 md:top-5">
        <div className="glass-fill-strong pointer-events-auto flex min-w-0 items-center gap-3 rounded-2xl glass-edge border px-3 py-2 shadow-md">
          <Link href="/home" aria-label="Human Growth — inicio" className="flex shrink-0 items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={theme === "dark" ? "/isotype/isotype-blanco.svg" : "/isotype/isotype-oscuro.svg"}
              alt=""
              className="h-6 w-auto"
            />
          </Link>
          <div className="hidden h-5 w-px shrink-0 bg-border-subtle sm:block" aria-hidden />
          <div className="min-w-0">
            <p className="truncate font-heading text-[13.5px] font-medium leading-none text-fg">{header.title}</p>
            {header.description && (
              <p className="mt-0.5 truncate font-sans text-[11px] text-fg-muted">{header.description}</p>
            )}
          </div>
        </div>

        <div className="pointer-events-auto flex items-center gap-2.5">
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
                  {isOrgAdmin && (
                    <Link
                      href={"/admin/org" as Route}
                      role="menuitem"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 rounded-md px-3 py-2 font-sans text-sm text-fg glass-hover-bg"
                    >
                      <ShieldCheck size={16} strokeWidth={1.75} />
                      Modo admin
                    </Link>
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
        </div>
      </div>

      {/* Canvas — el contenido REAL de cada page (mismo children que antes). */}
      <main className="relative z-0 flex-1 overflow-y-auto px-3 pb-28 pt-24 md:px-8 md:pt-28">{children}</main>

      {/* Floating dock — reemplaza SideNav + BottomNav, misma navegación real.
          "Modo admin" queda resaltado: acá vivirá el asistente de IA. */}
      <div className="pointer-events-none fixed inset-x-0 bottom-5 z-20 flex justify-center px-3">
        {/* Dock solo íconos (sin texto) — puede usar el tier translúcido
            liviano (.glass-fill) para un look más "vidrio" auténtico; el
            contraste ya está garantizado por el color del ícono, no por
            texto sobre el fill (ver gate de contraste, no aplica acá). */}
        <div className="glass-fill pointer-events-auto flex items-center gap-1.5 rounded-2xl glass-edge border p-2 shadow-lg">
          {navItems.map((item) => {
            const active = isActive(pathname, item.href);
            const isAdminEntry = item.label === "Modo admin";
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href as Route}
                title={isAdminEntry ? `${item.label} · próximamente: asistente de IA` : item.label}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
                data-tour-id={`nav-${item.href.slice(1)}`}
                className={cn(
                  "relative inline-flex h-[46px] w-[46px] items-center justify-center rounded-2xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hg-amber",
                  isAdminEntry
                    ? "bg-hg-amber/20 shadow-[inset_0_0_0_1px_rgba(232,160,48,0.5)] hover:bg-hg-amber/28"
                    : active
                      ? "bg-hg-green-100/90 shadow-[inset_0_0_0_1px_rgba(74,122,84,0.35)]"
                      : "glass-hover-bg",
                )}
              >
                <Icon
                  size={19}
                  strokeWidth={1.8}
                  className={cn(isAdminEntry ? "text-hg-amber" : active ? "text-primary" : "text-fg-muted")}
                />
                {isAdminEntry && (
                  <span
                    className="absolute -right-1 -top-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-hg-amber text-[8px] text-hg-ink"
                    aria-hidden
                  >
                    <Sparkles size={9} strokeWidth={2.2} />
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
