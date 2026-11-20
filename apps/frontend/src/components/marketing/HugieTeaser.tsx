"use client";

import { useState } from "react";

import { Reveal } from "@/components/marketing/fx/Reveal";
import { WordReveal } from "@/components/marketing/fx/WordReveal";
import { HugieChatPreview } from "@/components/marketing/hugie/HugieChatPreview";
import { HugieStates } from "@/components/marketing/hugie/HugieStates";
import { HugieOrb, type HugieState } from "@/components/marketing/HugieOrb";
import { useMarketingCopy } from "@/components/marketing/LanguageProvider";
import { Eyebrow } from "@/components/ui/eyebrow";
import { showHumanize } from "@/lib/flags";

/**
 * Teaser del coach virtual "Hugie" en el home. Solo comunica "próximamente":
 * sin fecha. Arte: orbe oficial v2 (HugieOrb).
 *
 * Con NEXT_PUBLIC_SHOW_HUMANIZE (plan v1.2, D3): el mismo texto + la fila de
 * 5 estados, y a la derecha la vista de chat en la app (imagen conceptual con
 * datos de ejemplo). Sin el flag: orbe en reposo y celebrando, como hasta hoy.
 */
export function HugieTeaser() {
  const c = useMarketingCopy().hugie;
  const humanize = showHumanize();
  const [state, setState] = useState<HugieState>("reposo");

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
          {humanize ? (
            <Reveal delay={0.25} className="mt-8">
              <HugieStates value={state} onChange={setState} />
            </Reveal>
          ) : null}
        </div>

        {humanize ? (
          <Reveal variant="scale" delay={0.1} className="min-w-0">
            <HugieChatPreview headerState={state} />
          </Reveal>
        ) : (
          <Reveal variant="scale" delay={0.1} className="flex items-end justify-center gap-6 sm:gap-10">
            <figure className="fx-float-slow m-0 flex flex-col items-center gap-3">
              <HugieOrb state="reposo" size="clamp(170px, 24vw, 300px)" />
              <figcaption className="text-sm font-medium text-fg-muted">{c.states.reposo}</figcaption>
            </figure>
            <figure className="fx-float m-0 flex flex-col items-center gap-3">
              <HugieOrb state="celebrando" size="clamp(110px, 15vw, 190px)" />
              <figcaption className="text-sm font-medium text-fg-muted">{c.states.celebrando}</figcaption>
            </figure>
          </Reveal>
        )}
      </div>
    </section>
  );
}
