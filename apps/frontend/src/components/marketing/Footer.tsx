"use client";

import { BrandLogo } from "@/components/marketing/BrandLogo";
import { Instagram, Linkedin } from "lucide-react";
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
    <footer className="glass-fill-strong relative mt-8 px-8 pb-8 pt-14 text-fg">
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-[3px]"
        style={{ background: "linear-gradient(90deg,#e8530a,#c8a76e,#4a7a54,#a8c4a0,#7f9bb8,#e8a030)" }}
      />
      <div className="max-w-marketing mx-auto">
        {/* Fila 1 · 4 títulos */}
        <nav className="flex flex-wrap gap-x-10 gap-y-3 pb-8">
          {c.sections.map((s) => (
            <FooterLink
              key={s.title}
              href={s.href}
              className="font-heading text-sm font-semibold text-fg transition-colors hover:text-primary"
            >
              {s.title}
            </FooterLink>
          ))}
        </nav>

        {/* Fila 2 · logo + tagline · contacto */}
        <div className="flex flex-col gap-6 border-t border-border py-8 md:flex-row md:items-center md:justify-between">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <BrandLogo className="h-7 w-auto" />
            <p className="body-sm mt-4 max-w-[280px] text-fg-muted">{c.tagline}</p>
          </div>
          <div className="flex items-center gap-5">
            <a
              href={c.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn Human Growth"
              className="text-fg-muted transition-colors hover:text-primary"
            >
              <Linkedin size={20} strokeWidth={1.75} />
            </a>
            <a
              href={c.instagram}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram Human Growth"
              className="text-fg-muted transition-colors hover:text-primary"
            >
              <Instagram size={20} strokeWidth={1.75} />
            </a>
            <a
              href={`mailto:${c.email}`}
              className="text-sm text-fg-muted transition-colors hover:text-primary"
            >
              {c.email}
            </a>
          </div>
        </div>

        {/* Fila 3 · copyright + legal */}
        <div className="flex flex-col gap-3 border-t border-border pt-6 md:flex-row md:items-center md:justify-between">
          <div className="body-xs text-fg-muted">{c.rights}</div>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {c.legal.map((l) => (
              <FooterLink key={l.label} href={l.href} className="body-xs text-fg-muted">
                {l.label}
              </FooterLink>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
