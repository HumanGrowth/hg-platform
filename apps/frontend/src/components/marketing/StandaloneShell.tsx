import Link from "next/link";
import type { ReactNode } from "react";

import { AmbientBackdrop } from "@/components/marketing/fx/AmbientBackdrop";
import { BrandLogo } from "@/components/marketing/BrandLogo";
import { MarketingThemeToggle } from "@/components/marketing/MarketingThemeToggle";

/**
 * Marco para páginas fuera del sitio público y de la app (login, invitación,
 * 404): fondo vivo glass, logo que cambia con el tema y toggle claro/oscuro.
 */
export function StandaloneShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col">
      <AmbientBackdrop />
      <header className="flex items-center justify-between px-5 py-5 md:px-10">
        <Link href="/" aria-label="Human Growth — inicio">
          <BrandLogo className="h-8 w-auto" />
        </Link>
        <MarketingThemeToggle />
      </header>
      <main className="flex flex-1 items-center">{children}</main>
    </div>
  );
}
