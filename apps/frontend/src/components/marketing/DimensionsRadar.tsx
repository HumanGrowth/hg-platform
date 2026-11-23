"use client";

import { DIM_COLORS } from "@/components/marketing/fx/dim-colors";
import { Reveal, RevealGroup } from "@/components/marketing/fx/Reveal";
import { SectionHeader } from "@/components/marketing/fx/SectionHeader";
import { useMarketingCopy } from "@/components/marketing/LanguageProvider";
import { SAMPLE_CURRENT, SampleRadar } from "@/components/marketing/MarketingRadar";
import type { RadarValues } from "@/components/radar/radar-model";
import { dimensionIconSrc } from "@/lib/dimension-styles";

type Item = { code: string; title: string; body: string };

/**
 * Las 6 dimensiones y el radar en una sola sección: lo que medimos a los
 * lados (P1–P3 a la izquierda, P4–P6 a la derecha) y el resultado en el
 * medio. Cada card lleva el valor de ejemplo de su eje en el radar.
 * id="dimensiones" es el destino del scroll del hero.
 */
export default function DimensionsRadar() {
  const copy = useMarketingCopy();
  const c = copy.sixDimensions;
  const left = c.items.slice(0, 3);
  const right = c.items.slice(3, 6);
  return (
    <section id="dimensiones" className="mx-auto w-full max-w-marketing scroll-mt-24 px-5 py-16 md:px-8 md:py-24">
      <SectionHeader eyebrow={c.eyebrow} title={c.title} subtitle={c.subtitle} align="center" />
      <div className="grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)_minmax(0,1fr)] lg:gap-8">
        <Reveal variant="scale" className="lg:order-2">
          <div className="glass-surface-strong mx-auto flex max-w-[520px] flex-col items-center gap-2 p-5 text-center md:p-8">
            <p className="eyebrow m-0">{copy.marketingRadar.eyebrow}</p>
            <SampleRadar />
            <p className="body-sm m-0 max-w-[360px] text-fg-muted">{copy.marketingRadar.caption}</p>
          </div>
        </Reveal>
        <DimColumn items={left} offset={0} className="lg:order-1" />
        <DimColumn items={right} offset={3} className="lg:order-3" />
      </div>
    </section>
  );
}

function DimColumn({ items, offset, className }: { items: Item[]; offset: number; className?: string }) {
  return (
    <RevealGroup className={`grid gap-4 sm:grid-cols-3 lg:grid-cols-1 ${className ?? ""}`} step={0.07}>
      {items.map((item, i) => (
        <DimCard key={item.code} item={item} color={DIM_COLORS[offset + i] ?? DIM_COLORS[0]} />
      ))}
    </RevealGroup>
  );
}

function DimCard({ item, color }: { item: Item; color: string }) {
  const src = dimensionIconSrc(item.code);
  const value = SAMPLE_CURRENT[item.code as keyof RadarValues] ?? 0;
  return (
    <article className="glass-surface group relative h-full overflow-hidden p-5">
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          aria-hidden
          className="pointer-events-none absolute -right-6 -top-4 w-28 select-none opacity-[0.10] transition-all duration-500 group-hover:-translate-y-1 group-hover:rotate-6 group-hover:opacity-[0.2]"
        />
      )}
      <div className="relative z-10 flex flex-col gap-2">
        <div className="flex items-center gap-2.5">
          <span className="h-3 w-3 flex-none rounded-full" style={{ background: color }} aria-hidden />
          <h3 className="m-0 font-heading text-lg font-semibold leading-tight text-fg">{item.title}</h3>
        </div>
        <p className="body-sm m-0 text-fg-muted">{item.body}</p>
        {/* Valor de ejemplo del mismo eje del radar (el radar ya expone los valores a lectores de pantalla). */}
        <div className="mt-1 flex items-center gap-2.5" aria-hidden>
          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-sunken">
            <span
              className="block h-full rounded-full transition-all duration-500"
              style={{ width: `${value}%`, background: color }}
            />
          </span>
          <span className="font-heading text-sm font-semibold tabular-nums text-fg">{value}</span>
        </div>
      </div>
    </article>
  );
}
