"use client";

import { CtaLink } from "@/components/marketing/fx/CtaLink";
import { PageHero } from "@/components/marketing/fx/PageHero";
import { RevealGroup } from "@/components/marketing/fx/Reveal";
import { SpotlightCard } from "@/components/marketing/fx/SpotlightCard";
import { useMarketingCopy } from "@/components/marketing/LanguageProvider";
import { showPricing } from "@/lib/flags";

export function ForTeamsContent() {
  const copy = useMarketingCopy();
  const c = copy.forTeams;
  const p = copy.forTeamsPage;
  return (
    <div className="landing-flow">
      <PageHero eyebrow={c.eyebrow} title={`${c.titleLine1} ${c.titleLine2}`} subtitle={c.body}>
        <div className="flex flex-wrap gap-3">
          <CtaLink href="/contacto">{p.ctaPrimary}</CtaLink>
          {showPricing() && (
            <CtaLink href="/pricing" variant="ghost" arrow={false}>
              {p.ctaSecondary}
            </CtaLink>
          )}
        </div>
      </PageHero>

      <section className="mx-auto w-full max-w-marketing px-5 pb-20 md:px-8 md:pb-28">
        <RevealGroup className="grid grid-cols-1 gap-5 md:grid-cols-2" step={0.1}>
          {p.valueProps.map((v, i) => (
            <SpotlightCard key={v.title} className="flex h-full flex-col gap-3 p-8">
              <span className="display text-5xl leading-none text-fg/15">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="display m-0 text-[32px] leading-[0.98] text-fg">{v.title}</h3>
              <p className="text-base leading-normal text-fg-muted">{v.body}</p>
            </SpotlightCard>
          ))}
        </RevealGroup>
      </section>
    </div>
  );
}
