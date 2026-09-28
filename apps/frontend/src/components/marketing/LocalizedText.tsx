"use client";

import { useEffect } from "react";

import { useMarketingT } from "@/components/marketing/LanguageProvider";

/** Texto por clave (dot-path) para usar desde server components. */
export function Tr({ k }: { k: string }) {
  const t = useMarketingT();
  return <>{t(k)}</>;
}

/** Sincroniza document.title con el idioma activo (el `metadata` del server queda como SEO en ES). */
export function DocTitle({ k }: { k: string }) {
  const t = useMarketingT();
  const title = t(k);
  useEffect(() => {
    document.title = title;
  }, [title]);
  return null;
}
