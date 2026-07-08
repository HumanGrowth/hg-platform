"use client";

import { Linkedin } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { useMarketingCopy } from "@/components/marketing/LanguageProvider";

// Link a "#" = placeholder visible pero no navegable (item 28 pendiente).
function FooterLink({
  href,
  children,
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  if (href === "#") {
    return (
      <span aria-disabled="true" className={`cursor-not-allowed opacity-50 ${className}`}>
        {children}
      </span>
    );
  }
  return (
    <Link href={href as Route} className={className}>
      {children}
    </Link>
  );
}

/**
 * Footer sobre banda verde de marca (Brand Book: "footers are almost always on
 * the green/dark band" — por eso el asset logo-footer solo existe en blanco).
 * 3 filas: títulos · logo+tagline+contacto · copyright+legal.
 */
export default function Footer() {
  const c = useMarketingCopy().footer;
  return (
    <footer className="bg-primary px-8 pt-14 pb-8 text-hg-cream">
      <div className="max-w-marketing mx-auto">
        {/* Fila 1 · 4 títulos */}
        <nav className="flex flex-wrap gap-x-10 gap-y-3 pb-8">
          {c.sections.map((s) => (
            <FooterLink
              key={s.title}
              href={s.href}
              className="font-heading text-sm font-semibold text-hg-cream transition-colors hover:text-white"
            >
              {s.title}
            </FooterLink>
          ))}
        </nav>

        {/* Fila 2 · logo + tagline · contacto */}
        <div className="flex flex-col gap-6 border-t border-white/15 py-8 md:flex-row md:items-center md:justify-between">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo/footer/logo-footer-blanco@1x.png"
              srcSet="/logo/footer/logo-footer-blanco@1x.png 1x, /logo/footer/logo-footer-blanco@2x.png 2x"
              alt="Human Growth"
              className="h-8 w-auto"
            />
            <p className="body-sm mt-4 max-w-[280px] text-hg-cream/80">{c.tagline}</p>
          </div>
          <div className="flex items-center gap-5">
            <a
              href={c.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn Human Growth"
              className="text-hg-cream/80 transition-colors hover:text-white"
            >
              <Linkedin size={20} strokeWidth={1.75} />
            </a>
            <a
              href={`mailto:${c.email}`}
              className="text-sm text-hg-cream/80 transition-colors hover:text-white"
            >
              {c.email}
            </a>
          </div>
        </div>

        {/* Fila 3 · copyright + legal */}
        <div className="flex flex-col gap-3 border-t border-white/15 pt-6 md:flex-row md:items-center md:justify-between">
          <div className="body-xs text-hg-cream/60">{c.rights}</div>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {c.legal.map((l) => (
              <FooterLink key={l.label} href={l.href} className="body-xs text-hg-cream/60">
                {l.label}
              </FooterLink>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
