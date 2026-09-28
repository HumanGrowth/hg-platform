"use client";

import { PageHero } from "@/components/marketing/fx/PageHero";
import { useMarketingCopy } from "@/components/marketing/LanguageProvider";

export function ContactHero() {
  const c = useMarketingCopy().contact;
  return <PageHero align="center" eyebrow={c.eyebrow} title={c.title} subtitle={c.subtitle} />;
}
