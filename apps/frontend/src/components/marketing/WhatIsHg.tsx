"use client";

import { useMarketingCopy } from "@/components/marketing/LanguageProvider";
import { MotionSection } from "@/components/motion/MotionSection";
import { StaggerBounceGrid } from "@/components/motion/StaggerBounceGrid";
import { Display } from "@/components/ui/display";
import { Eyebrow } from "@/components/ui/eyebrow";

/**
 * "¿Cómo funciona HG?" (item 26 · Copy A). Tres cards: Qué es / Qué hace /
 * Cómo funciona. Vende las 4 etapas como visión completa del producto.
 */
export default function WhatIsHg() {
  const c = useMarketingCopy();
  const { eyebrow, title, cards } = c.whatIsHg;

  return (
    <section className="landing-flow-section max-w-marketing mx-auto px-8">
      <MotionSection as="div">
      <div className="max-w-[760px] mb-14">
        <Eyebrow accent className="mb-4">
          {eyebrow}
        </Eyebrow>
        <Display as="h2" variant="display-3">
          {title}
        </Display>
      </div>

      <StaggerBounceGrid className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {cards.map((card) => (
          <article
            key={card.title}
            className="flex flex-col gap-3 rounded-lg border border-border bg-surface-card p-8"
          >
            <h3 className="font-heading text-lg font-semibold text-fg">{card.title}</h3>
            <p className="body-sm leading-relaxed text-hg-charcoal">{card.body}</p>
          </article>
        ))}
      </StaggerBounceGrid>
      </MotionSection>
    </section>
  );
}
