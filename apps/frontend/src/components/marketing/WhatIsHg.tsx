"use client";

import { RevealGroup } from "@/components/marketing/fx/Reveal";
import { SectionHeader } from "@/components/marketing/fx/SectionHeader";
import { SpotlightCard } from "@/components/marketing/fx/SpotlightCard";
import { useMarketingCopy } from "@/components/marketing/LanguageProvider";

/**
 * "¿Cómo funciona HG?" (item 26 · Copy A). Tres cards: Qué es / Qué hace /
 * Cómo funciona. Vende las 4 etapas como visión completa del producto.
 */
export default function WhatIsHg() {
  const { eyebrow, title, cards } = useMarketingCopy().whatIsHg;

  return (
    <section className="mx-auto w-full max-w-marketing px-5 py-16 md:px-8 md:py-24">
      <SectionHeader eyebrow={eyebrow} title={title} />
      <RevealGroup className="grid grid-cols-1 gap-5 md:grid-cols-3" step={0.1}>
        {cards.map((card, i) => (
          <SpotlightCard key={card.title} className="flex h-full flex-col gap-3 p-8">
            <span className="display text-5xl leading-none text-fg/15">{String(i + 1).padStart(2, "0")}</span>
            <h3 className="font-heading text-lg font-semibold text-fg">{card.title}</h3>
            <p className="body-sm leading-relaxed text-fg-muted">{card.body}</p>
          </SpotlightCard>
        ))}
      </RevealGroup>
    </section>
  );
}
