"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { t } from "@/lib/i18n";

const LANG = "es" as const;

/**
 * Marketing top nav — porteado del lovable (TanStack → next/link, react-i18next
 * → stub t()). El lang switcher queda oculto hasta tener EN navegable.
 */
export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener("scroll", on);
    return () => window.removeEventListener("scroll", on);
  }, []);

  const linkCls =
    "text-sm font-medium text-fg cursor-pointer py-1.5 border-b border-transparent hover:border-hg-ink transition-colors";

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
        <div className="hidden md:flex gap-7 ml-4">
          <Link href="/paths" className={linkCls}>
            {t("nav.paths", LANG)}
          </Link>
          <Link href="/for-teams" className={linkCls}>
            {t("nav.forTeams", LANG)}
          </Link>
          <Link href="/ciencia" className={linkCls}>
            La Ciencia
          </Link>
          <Link href="/pricing" className={linkCls}>
            {t("nav.pricing", LANG)}
          </Link>
        </div>
        <div className="flex-1" />
        <Link href="/contacto" className={`${linkCls} mr-2 hidden sm:inline`}>
          Solicitar unirse
        </Link>
        <Link href="/login" className={`${linkCls} mr-1 hidden sm:inline`}>
          {t("nav.login", LANG)}
        </Link>
        <Link
          href="/contacto"
          className="bg-primary text-white border-0 px-[18px] py-2.5 rounded-md font-semibold text-sm cursor-pointer hover:bg-primary-hover transition-colors"
        >
          Conversemos
        </Link>
      </div>
    </nav>
  );
}
