import { Linkedin } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { getCopy } from "@/lib/i18n";

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
      <span aria-disabled="true" className={`cursor-not-allowed opacity-60 ${className}`}>
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

/** Footer simplificado (item 27): 3 filas · 4 títulos sin sublistas. */
export default function Footer() {
  const c = getCopy("es").footer;
  return (
    <footer className="bg-surface-sunken px-8 pt-16 pb-10" style={{ borderTop: "1px solid var(--border)" }}>
      <div className="max-w-marketing mx-auto">
        {/* Fila 1 · 4 títulos */}
        <nav className="flex flex-wrap gap-x-10 gap-y-3 pb-8">
          {c.sections.map((s) => (
            <FooterLink
              key={s.title}
              href={s.href}
              className="font-heading text-sm font-semibold text-fg hover:text-primary"
            >
              {s.title}
            </FooterLink>
          ))}
        </nav>

        {/* Fila 2 · logo + tagline · socials */}
        <div className="flex flex-col gap-6 border-t border-border py-8 md:flex-row md:items-center md:justify-between">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo/nav/logo-nav-negro@2x.png"
              srcSet="/logo/nav/logo-nav-negro@1x.png 1x, /logo/nav/logo-nav-negro@2x.png 2x, /logo/nav/logo-nav-negro@3x.png 3x"
              alt="Human Growth"
              className="h-9 w-auto"
            />
            <p className="body-sm mt-3 max-w-[280px] text-hg-charcoal">{c.tagline}</p>
          </div>
          <div className="flex items-center gap-5">
            <a
              href={c.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn Human Growth"
              className="text-hg-charcoal hover:text-fg"
            >
              <Linkedin size={20} strokeWidth={1.75} />
            </a>
            <a href={`mailto:${c.email}`} className="text-sm text-hg-charcoal hover:text-fg">
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
