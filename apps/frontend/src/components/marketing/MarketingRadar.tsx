"use client";

import { useMarketingCopy } from "@/components/marketing/LanguageProvider";
import { Radar } from "@/components/radar/Radar";
import { BubbleField } from "@/components/motion/BubbleField";
import { DecoLayer } from "@/components/motion/DecoLayer";
import { MotionSection } from "@/components/motion/MotionSection";
import { Display } from "@/components/ui/display";
import { Eyebrow } from "@/components/ui/eyebrow";
import type { RadarValues } from "@/components/radar/radar-model";

// Datos ilustrativos — NO llama al backend. Dos mallas (web-v3 decisión J):
// crecimiento (target aspiracional, verde) + estado actual.
const SAMPLE_CURRENT: RadarValues = { P1: 52, P2: 48, P3: 45, P4: 60, P5: 38, P6: 55 };
const SAMPLE_GROWTH: RadarValues = { P1: 90, P2: 90, P3: 90, P4: 90, P5: 90, P6: 90 };

/** Radar de marca (home + /metodo) con datos de ejemplo. */
export default function MarketingRadar() {
  const c = useMarketingCopy();
  return (
    <section className="landing-flow-section relative max-w-marketing mx-auto px-8">
      <DecoLayer>
        <BubbleField seed={4} count={3} />
      </DecoLayer>
      <MotionSection as="div" className="flex flex-col items-center text-center">
        <Eyebrow accent className="mb-4">
          {c.marketingRadar.eyebrow}
        </Eyebrow>
        <Display as="h2" variant="display-3" className="mb-10">
          {c.marketingRadar.title}
        </Display>
        {/*
          Radar renderiza el chart de recharts a un tamaño fijo en px (440 para
          "large", ver SIZE_PX en Radar.tsx) — tanto .recharts-wrapper como el
          <svg> interno traen su propio inline style="width:440px;height:440px"
          (recharts), así que en mobile (viewport - px-8 < 440px) desbordaba
          el contenedor y recortaba las etiquetas del lado derecho. Se lo hace
          responsive acá (sin tocar Radar.tsx, que también usa /perfil y
          /onboarding/result — fuera de scope de marketing) con un <style>
          scoped (mismo patrón que PartnerMarquee): un inline style no se
          puede pisar con clases Tailwind normales, hace falta !important en
          una regla real de stylesheet. El viewBox interno de recharts escala
          el dibujo (incluidas las etiquetas) proporcionalmente.
        */}
        <style>{`
          .marketing-radar-scale { width: 100%; max-width: 440px; overflow: hidden; }
          .marketing-radar-scale .recharts-wrapper,
          .marketing-radar-scale svg {
            width: 100% !important;
            height: auto !important;
          }
        `}</style>
        <div className="marketing-radar-scale">
          <Radar values={SAMPLE_CURRENT} growth={SAMPLE_GROWTH} state="complete" size="large" />
        </div>
        <p className="body-sm max-w-[420px] text-fg-subtle">{c.marketingRadar.caption}</p>
      </MotionSection>
    </section>
  );
}
