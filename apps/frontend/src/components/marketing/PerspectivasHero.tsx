"use client";

import { PageHero } from "@/components/marketing/fx/PageHero";
import { useMarketingCopy } from "@/components/marketing/LanguageProvider";

export function PerspectivasHero() {
  const c = useMarketingCopy().perspectives;
  return <PageHero eyebrow={c.eyebrow} title={c.title} subtitle={c.subtitle} />;
}
