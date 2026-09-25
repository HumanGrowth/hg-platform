"use client";

import { useEffect, useState } from "react";

import { Reveal } from "@/components/marketing/fx/Reveal";
import { SectionHeader } from "@/components/marketing/fx/SectionHeader";
import { useMarketingCopy } from "@/components/marketing/LanguageProvider";
import { Radar } from "@/components/radar/Radar";
import type { RadarValues } from "@/components/radar/radar-model";

// Datos ilustrativos — NO llama al backend. Dos mallas (web-v3 decisión J):
// crecimiento (target aspiracional, verde) + estado actual.
const SAMPLE_CURRENT: RadarValues = { P1: 52, P2: 48, P3: 45, P4: 60, P5: 38, P6: 55 };
const SAMPLE_GROWTH: RadarValues = { P1: 90, P2: 90, P3: 90, P4: 90, P5: 90, P6: 90 };

/** Radar de marca (home + /metodo) con datos de ejemplo, en un panel glass. */
export default function MarketingRadar() {
  const c = useMarketingCopy();
  // recharts genera ids distintos en server y client → se monta solo en cliente.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <section className="mx-auto w-full max-w-marketing px-5 py-16 md:px-8 md:py-24">
      <SectionHeader eyebrow={c.marketingRadar.eyebrow} title={c.marketingRadar.title} align="center" />
      <Reveal variant="scale">
        <div className="glass-surface-strong mx-auto flex max-w-[640px] flex-col items-center p-6 text-center md:p-10">
          {/*
            Radar renderiza el chart de recharts a un tamaño fijo en px (440 para
            "large"); recharts fija width/height inline en wrapper y <svg>, así
            que en mobile desbordaba. Se lo hace responsive con un <style>
            scoped (una regla de stylesheet con !important, porque un inline
            style no se pisa con clases). El viewBox escala el dibujo entero.
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
            {mounted ? (
              <Radar values={SAMPLE_CURRENT} growth={SAMPLE_GROWTH} state="complete" size="large" />
            ) : (
              <div className="aspect-square w-full" aria-hidden />
            )}
          </div>
          <p className="body-sm max-w-[420px] text-fg-muted">{c.marketingRadar.caption}</p>
        </div>
      </Reveal>
    </section>
  );
}
