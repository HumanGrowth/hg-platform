"use client";

import { PageHero } from "@/components/marketing/fx/PageHero";
import { useMarketingCopy } from "@/components/marketing/LanguageProvider";

export function PathsHero() {
  const c = useMarketingCopy().paths;
  return <PageHero eyebrow={c.pageEyebrow} title={c.pageTitle} subtitle={c.pageBody} />;
}
