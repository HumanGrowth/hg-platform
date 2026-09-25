"use client";

import { useMarketingCopy } from "@/components/marketing/LanguageProvider";
import { HugieOrb } from "@/components/marketing/HugieOrb";
import { BubbleField } from "@/components/motion/BubbleField";
import { DecoLayer } from "@/components/motion/DecoLayer";
import { MotionSection } from "@/components/motion/MotionSection";
import { Display } from "@/components/ui/display";
import { Eyebrow } from "@/components/ui/eyebrow";

/**
 * Teaser del coach virtual "Hugie" en el home. Solo comunica "próximamente":
 * sin fecha ni promesas de features. Arte: HugieOrb en reposo y celebrando
 * (Hugie.dc.html / Hugie - Identidad.dc.html).
 */
export function HugieTeaser() {
  const c = useMarketingCopy().hugie;
  return (
    <section id="hugie" className="landing-flow-section max-w-marketing mx-auto px-8">
      <DecoLayer>
        <BubbleField seed={9} count={4} />
      </DecoLayer>
      <MotionSection as="div" className="grid items-center gap-12 md:grid-cols-2">
        <div>
          <div className="mb-6 flex items-center gap-3">
            <Eyebrow accent>{c.eyebrow}</Eyebrow>
          </div>
          <Display as="h2" variant="display-3" className="mb-4">
            {c.title}
          </Display>
          <p className="mb-6 font-heading text-xl font-semibold text-primary">{c.tagline}</p>
          <p className="body-lg mb-4 text-fg-muted">{c.body}</p>
          <p className="glass-surface inline-block px-4 py-2 text-sm font-medium text-fg">{c.note}</p>
        </div>

        <div className="flex items-end justify-center gap-6 sm:gap-10">
          <figure className="flex w-[58%] flex-col items-center gap-3">
            <HugieOrb state="reposo" className="w-full" />
            <figcaption className="text-sm font-medium text-fg-muted">{c.states.reposo}</figcaption>
          </figure>
          <figure className="flex w-[36%] flex-col items-center gap-3">
            <HugieOrb state="celebrando" className="w-full" />
            <figcaption className="text-sm font-medium text-fg-muted">{c.states.celebrando}</figcaption>
          </figure>
        </div>
      </MotionSection>
    </section>
  );
}
