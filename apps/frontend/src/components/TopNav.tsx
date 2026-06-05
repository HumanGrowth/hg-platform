"use client";

/* eslint-disable @next/next/no-img-element */
import { LogOut, ShieldCheck } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";

import { Avatar } from "@/components/ui/avatar";
import { apiLogout } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { cn } from "@/lib/utils";

// Cast a Route: /library y /profile se crean en FE-05; typedRoutes aún no las ve.
const LINKS: { href: Route; label: string }[] = [
  { href: "/home" as Route, label: "Inicio" },
  { href: "/library" as Route, label: "Biblioteca" },
  { href: "/profile" as Route, label: "Mi perfil" },
];

export function TopNav() {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);
  const [scrolled, setScrolled] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  async function logout() {
    try {
      await apiLogout();
    } finally {
      clear();
      router.replace("/login");
    }
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full border-b transition-colors duration-base ease-state",
        scrolled
          ? "border-border bg-[rgba(253,245,230,0.8)] backdrop-blur-[12px]"
          : "border-transparent bg-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-app items-center justify-between gap-6 px-6">
        <Link href="/home" aria-label="Human Growth — inicio">
          <img src="/brand/logo-color.svg" alt="Human Growth" className="h-8 w-auto" />
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {LINKS.map((l) => {
            const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "border-b-2 pb-0.5 font-sans text-sm font-semibold transition-colors duration-fast ease-state",
                  active
                    ? "border-orange-500 text-fg"
                    : "border-transparent text-fg-muted hover:text-fg",
                )}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="relative">
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
          >
            <Avatar name={user?.full_name ?? "?"} size="md" />
          </button>
          {menuOpen ? (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div
                role="menu"
                className="absolute right-0 z-50 mt-2 w-56 rounded-lg border border-border bg-bg-raised p-2 shadow-md"
              >
                <div className="px-3 py-2">
                  <p className="truncate font-sans text-sm font-semibold text-fg">
                    {user?.full_name}
                  </p>
                  <p className="truncate font-sans text-xs text-fg-muted">{user?.email}</p>
                </div>
                {user?.role === "superadmin" ? (
                  <Link
                    href={"/admin/orgs" as Route}
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 rounded-md px-3 py-2 font-sans text-sm text-fg hover:bg-bg-sunken"
                  >
                    <ShieldCheck size={16} strokeWidth={1.75} />
                    Panel de HG
                  </Link>
                ) : null}
                <button
                  type="button"
                  role="menuitem"
                  onClick={logout}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 font-sans text-sm text-fg hover:bg-bg-sunken"
                >
                  <LogOut size={16} strokeWidth={1.75} />
                  Cerrar sesión
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
}
