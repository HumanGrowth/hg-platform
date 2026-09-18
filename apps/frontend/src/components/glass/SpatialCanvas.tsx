"use client";

import { LogOut, ShieldCheck, Sparkles, UserCog, Users } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";

import { isActive, sideNavItemsForRole, type NavItem } from "@/components/nav/items";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useTheme } from "@/components/theme/ThemeProvider";
import { Avatar } from "@/components/ui/avatar";
import { apiLogout } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { getPageHeader, isModulePlayback } from "@/lib/glass/page-headers";
import { cn } from "@/lib/utils";

// Perfil, equipo y modo admin se agrupan en UN botón del dock que despliega
// una lista (el dock completo con 8 íconos era demasiado ancho). "Modo admin"
// se identifica por label: su href cambia según el rol.
const GROUP_HREFS = new Set(["/perfil", "/team"]);
function isGroupItem(item: NavItem): boolean {
  return GROUP_HREFS.has(item.href) || item.label === "Modo admin";
}

function DockLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isActive(pathname, item.href);
  const Icon = item.icon;
  return (
    <Link
      href={item.href as Route}
      title={item.label}
      aria-label={item.label}
      aria-current={active ? "page" : undefined}
      data-tour-id={`nav-${item.href.slice(1)}`}
      className={cn(
        "relative inline-flex h-[46px] w-[46px] items-center justify-center rounded-2xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hg-amber",
        active ? "bg-hg-green-100/90 shadow-[inset_0_0_0_1px_rgba(74,122,84,0.35)]" : "glass-hover-bg",
      )}
    >
      <Icon size={19} strokeWidth={1.8} className={cn(active ? "text-primary" : "text-fg-muted")} />
    </Link>
  );
}

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
  const [groupOpen, setGroupOpen] = React.useState(false);

  const navItems = React.useMemo(() => sideNavItemsForRole(user), [user]);
  const isOrgAdmin = user?.role === "admin" || user?.role === "superadmin";
  const primaryItems = navItems.filter((i) => !isGroupItem(i));
  const groupItems = navItems.filter(isGroupItem);
  const groupActive = groupItems.some((i) => isActive(pathname, i.href));
  const hasAdminEntry = groupItems.some((i) => i.label === "Modo admin");

  // Cerrar el desplegable al navegar y con Esc.
  React.useEffect(() => {
    setGroupOpen(false);
  }, [pathname]);
  React.useEffect(() => {
    if (!groupOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setGroupOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [groupOpen]);
  const header = getPageHeader(pathname);
  const playing = isModulePlayback(pathname);

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
          la página activa (no un mode-switcher). Se oculta durante la
          reproducción de un módulo: pisaba el header/botón de cierre del
          player. */}
      {!playing && (
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
      )}

      {/* Canvas — el contenido REAL de cada page (mismo children que antes). */}
      <main
        className={cn(
          "relative z-0 flex-1 overflow-y-auto px-3 pb-[calc(6.5rem+env(safe-area-inset-bottom))] md:px-8",
          playing ? "pt-3 md:pt-4" : "pt-24 md:pt-28",
        )}
      >
        {children}
      </main>

      {/* Floating dock — reemplaza SideNav + BottomNav, misma navegación real.
          Los ítems de gestión personal (perfil / equipo / modo admin) viven en
          un solo botón que despliega una lista. */}
      <div className="pointer-events-none fixed inset-x-0 bottom-[max(1.25rem,calc(env(safe-area-inset-bottom)+0.5rem))] z-20 flex justify-center px-3">
        <div className="pointer-events-auto relative">
          {/* La lista es HERMANA del dock (no hija): un backdrop-filter dentro
              de otro backdrop-filter no ve el fondo de la página (backdrop
              root) — ver "one backdrop-filter per stack" en glass.css. */}
          {groupOpen && groupItems.length > 1 && (
            <>
              <div className="fixed inset-0 -z-10" onClick={() => setGroupOpen(false)} aria-hidden />
              <div
                id="dock-group-menu"
                role="menu"
                className="glass-modal absolute bottom-full right-0 z-10 mb-3 w-60 max-w-[calc(100vw-1.5rem)] p-2"
              >
                {groupItems.map((item) => {
                  const active = isActive(pathname, item.href);
                  const isAdminEntry = item.label === "Modo admin";
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href as Route}
                      role="menuitem"
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2.5 font-sans text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hg-amber",
                        isAdminEntry
                          ? "bg-hg-amber/15 text-fg shadow-[inset_0_0_0_1px_rgba(232,160,48,0.45)]"
                          : active
                            ? "bg-hg-green-100/90 text-primary shadow-[inset_0_0_0_1px_rgba(74,122,84,0.35)]"
                            : "glass-hover-bg text-fg",
                      )}
                    >
                      <Icon size={17} strokeWidth={1.8} className={isAdminEntry ? "text-hg-amber" : active ? "text-primary" : "text-fg-muted"} />
                      <span className="flex-1">{item.label}</span>
                      {isAdminEntry && <Sparkles size={13} strokeWidth={2} className="text-hg-amber" aria-hidden />}
                    </Link>
                  );
                })}
              </div>
            </>
          )}

          {/* Dock solo íconos (sin texto) — tier translúcido liviano
              (.glass-fill); el contraste lo da el color del ícono. */}
          <div className="glass-fill flex items-center gap-1.5 rounded-2xl glass-edge border p-2 shadow-lg">
            {primaryItems.map((item) => (
              <DockLink key={item.href} item={item} pathname={pathname} />
            ))}
            {groupItems.length === 1 && <DockLink item={groupItems[0]} pathname={pathname} />}
            {groupItems.length > 1 && (
              <button
                type="button"
                title="Perfil, equipo y administración"
                aria-label="Perfil, equipo y administración"
                aria-haspopup="menu"
                aria-expanded={groupOpen}
                aria-controls="dock-group-menu"
                data-tour-id="nav-perfil"
                onClick={() => setGroupOpen((v) => !v)}
                className={cn(
                  "relative inline-flex h-[46px] w-[46px] items-center justify-center rounded-2xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hg-amber",
                  groupOpen || groupActive
                    ? "bg-hg-green-100/90 shadow-[inset_0_0_0_1px_rgba(74,122,84,0.35)]"
                    : "glass-hover-bg",
                )}
              >
                <Users
                  size={19}
                  strokeWidth={1.8}
                  className={groupOpen || groupActive ? "text-primary" : "text-fg-muted"}
                />
                {hasAdminEntry && (
                  <span
                    className="absolute -right-1 -top-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-hg-amber text-hg-ink"
                    aria-hidden
                  >
                    <Sparkles size={9} strokeWidth={2.2} />
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
