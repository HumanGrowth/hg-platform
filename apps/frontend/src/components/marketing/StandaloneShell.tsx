import Link from "next/link";
import type { ReactNode } from "react";

import { AmbientBackdrop } from "@/components/marketing/fx/AmbientBackdrop";
import { BrandLogo } from "@/components/marketing/BrandLogo";
import { MarketingLanguageProvider } from "@/components/marketing/LanguageProvider";
import { MarketingThemeToggle } from "@/components/marketing/MarketingThemeToggle";

/**
 * Marco para páginas fuera del sitio público y de la app (login, invitación,
 * 404): fondo vivo glass, logo que cambia con el tema y toggle claro/oscuro.
 *
 * `MarketingThemeToggle` lee su copy de `useMarketingCopy`, que requiere
 * `MarketingLanguageProvider` — el `(marketing)/layout.tsx` lo pone para el
 * sitio público, pero este shell vive fuera de esa route group, así que lo
 * necesita acá también (si no, el toggle tira y la página entera 500-ea).
 */
export function StandaloneShell({ children }: { children: ReactNode }) {
  return (
    <MarketingLanguageProvider>
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
    </MarketingLanguageProvider>
  );
}
