"use client";

import { useMarketingCopy } from "@/components/marketing/LanguageProvider";
import { Radar } from "@/components/radar/Radar";
import { Display } from "@/components/ui/display";
import { Eyebrow } from "@/components/ui/eyebrow";
import type { RadarValues } from "@/components/radar/radar-model";

// Datos ilustrativos — NO llama al backend. Dos mallas (web-v3 decisión J):
// crecimiento (target aspiracional, verde) + estado actual.
const SAMPLE_CURRENT: RadarValues = { P1: 62, P2: 78, P3: 55, P4: 70, P5: 48, P6: 65 };
const SAMPLE_GROWTH: RadarValues = { P1: 90, P2: 90, P3: 90, P4: 90, P5: 90, P6: 90 };

/** Radar de marca (home + /metodo) con datos de ejemplo. */
export default function MarketingRadar() {
  const c = useMarketingCopy();
  return (
    <section className="landing-flow-section max-w-marketing mx-auto px-8">
      <div className="flex flex-col items-center text-center">
        <Eyebrow accent className="mb-4">
          {c.marketingRadar.eyebrow}
        </Eyebrow>
        <Display as="h2" variant="display-3" className="mb-10">
          {c.marketingRadar.title}
        </Display>
        <Radar values={SAMPLE_CURRENT} growth={SAMPLE_GROWTH} state="complete" size="large" />
        <p className="body-sm max-w-[420px] text-fg-subtle">{c.marketingRadar.caption}</p>
      </div>
    </section>
  );
}
