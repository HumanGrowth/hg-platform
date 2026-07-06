"use client";

import { Menu, X } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useEffect, useState } from "react";

import { LanguageToggle } from "@/components/marketing/LanguageToggle";
import { t } from "@/lib/i18n";

const LANG = "es" as const;

// El tab "Ciencia" apunta directo a /metodo (la página real); /ciencia mantiene
// su redirect 308 en next.config para enlaces viejos. (typedRoutes rechaza
// /ciencia porque ya no tiene page.tsx.)
const TABS: { label: string; href: Route }[] = [
  { label: t("nav.platform", LANG), href: "/plataforma" },
  { label: t("nav.science", LANG), href: "/metodo" },
  { label: t("nav.perspectives", LANG), href: "/perspectivas" },
  { label: t("nav.pricing", LANG), href: "/pricing" },
  { label: t("nav.blog", LANG), href: "/blog" },
];

/** Marketing top nav — 4 tabs + language toggle + drawer mobile (web-v2-08). */
export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener("scroll", on);
    return () => window.removeEventListener("scroll", on);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const linkCls =
    "text-sm font-medium text-fg cursor-pointer py-1.5 border-b border-transparent hover:border-hg-ink transition-colors";
  const ctaCls =
    "bg-primary text-white border-0 px-[18px] py-2.5 rounded-md font-semibold text-sm cursor-pointer hover:bg-primary-hover transition-colors";

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 h-16 transition-[background,border-color] duration-200"
      style={{
        background: scrolled ? "rgba(250,243,232,0.80)" : "transparent",
        backdropFilter: scrolled ? "blur(12px)" : "none",
        WebkitBackdropFilter: scrolled ? "blur(12px)" : "none",
        borderBottom: scrolled ? "1px solid var(--border)" : "1px solid transparent",
      }}
    >
      <div className="max-w-marketing mx-auto h-full px-8 flex items-center gap-8">
        <Link href="/" className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo/nav/logo-nav-negro@1x.png"
            srcSet="/logo/nav/logo-nav-negro@1x.png 1x, /logo/nav/logo-nav-negro@2x.png 2x, /logo/nav/logo-nav-negro@3x.png 3x"
            alt="Human Growth"
            className="h-8 w-auto"
          />
        </Link>

        {/* Desktop tabs */}
        <div className="hidden md:flex gap-7 ml-4">
          {TABS.map((tab) => (
            <Link key={tab.href} href={tab.href} className={linkCls}>
              {tab.label}
            </Link>
          ))}
        </div>

        <div className="flex-1" />

        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-4">
          <LanguageToggle />
          <Link href="/login" className={linkCls}>
            {t("nav.login", LANG)}
          </Link>
          <Link href="/contacto" className={ctaCls}>
            {t("nav.cta", LANG)}
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Abrir menú"
          className="md:hidden text-fg"
        >
          <Menu size={26} strokeWidth={1.75} />
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-hg-ink/40"
          />
          <div className="absolute right-0 top-0 flex h-full w-[82%] max-w-xs flex-col gap-6 bg-surface-page px-6 py-5 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="eyebrow">Menú</span>
              <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar menú">
                <X size={24} strokeWidth={1.75} className="text-fg" />
              </button>
            </div>

            <nav className="flex flex-col gap-4">
              {TABS.map((tab) => (
                <Link
                  key={tab.href}
                  href={tab.href}
                  onClick={() => setOpen(false)}
                  className="text-lg font-semibold text-fg"
                >
                  {tab.label}
                </Link>
              ))}
            </nav>

            <div className="border-t border-border pt-5 flex flex-col gap-4">
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="text-base font-medium text-fg"
              >
                {t("nav.login", LANG)}
              </Link>
              <Link href="/contacto" onClick={() => setOpen(false)} className={`${ctaCls} text-center`}>
                {t("nav.cta", LANG)}
              </Link>
              <LanguageToggle />
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
