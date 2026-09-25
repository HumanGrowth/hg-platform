"use client";

import { useMarketingCopy } from "@/components/marketing/LanguageProvider";
import { HugieOrb } from "@/components/marketing/HugieOrb";
import { Reveal } from "@/components/marketing/fx/Reveal";
import { WordReveal } from "@/components/marketing/fx/WordReveal";
import { Eyebrow } from "@/components/ui/eyebrow";

/**
 * Teaser del coach virtual "Hugie" en el home. Solo comunica "próximamente":
 * sin fecha ni promesas de features. Arte: HugieOrb en reposo y celebrando
 * (Hugie.dc.html / Hugie - Identidad.dc.html).
 */
export function HugieTeaser() {
  const c = useMarketingCopy().hugie;
  return (
    <section id="hugie" className="mx-auto w-full max-w-marketing px-5 py-16 md:px-8 md:py-24">
      <div className="grid items-center gap-12 md:grid-cols-2">
        <div>
          <Reveal className="mb-6 flex items-center gap-3">
            <Eyebrow accent>{c.eyebrow}</Eyebrow>
          </Reveal>
          <WordReveal text={c.title} as="h2" className="display mb-4 m-0 text-[36px] leading-[0.98] text-fg sm:text-5xl" />
          <Reveal delay={0.15}>
            <p className="mb-6 font-heading text-xl font-semibold text-primary">{c.tagline}</p>
            <p className="body-lg mb-4 text-fg-muted">{c.body}</p>
            <p className="glass-surface inline-block px-4 py-2 text-sm font-medium text-fg">{c.note}</p>
          </Reveal>
        </div>

        <Reveal variant="scale" delay={0.1} className="flex items-end justify-center gap-6 sm:gap-10">
          <figure className="fx-float-slow flex w-[58%] flex-col items-center gap-3">
            <HugieOrb state="reposo" className="w-full" />
            <figcaption className="text-sm font-medium text-fg-muted">{c.states.reposo}</figcaption>
          </figure>
          <figure className="fx-float flex w-[36%] flex-col items-center gap-3">
            <HugieOrb state="celebrando" className="w-full" />
            <figcaption className="text-sm font-medium text-fg-muted">{c.states.celebrando}</figcaption>
          </figure>
        </Reveal>
      </div>
    </section>
  );
}
