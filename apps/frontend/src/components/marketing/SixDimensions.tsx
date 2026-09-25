"use client";

import { DIM_COLORS, hexToRgbTriplet } from "@/components/marketing/fx/dim-colors";
import { RevealGroup } from "@/components/marketing/fx/Reveal";
import { SectionHeader } from "@/components/marketing/fx/SectionHeader";
import { SpotlightCard } from "@/components/marketing/fx/SpotlightCard";
import { useMarketingCopy } from "@/components/marketing/LanguageProvider";
import { dimensionIconSrc } from "@/lib/dimension-styles";

/**
 * Las 6 dimensiones. Cada card tiene el foco de luz del color de su
 * dimensión, se inclina con el cursor y su barra de color crece en hover.
 * id="dimensiones" es el destino del scroll del hero.
 */
export default function SixDimensions() {
  const c = useMarketingCopy().sixDimensions;
  return (
    <section id="dimensiones" className="mx-auto w-full max-w-marketing scroll-mt-24 px-5 py-16 md:px-8 md:py-24">
      <SectionHeader eyebrow={c.eyebrow} title={c.title} subtitle={c.subtitle} />
      <RevealGroup className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3" step={0.07}>
        {c.items.map((item, i) => {
          const src = dimensionIconSrc(item.code);
          const color = DIM_COLORS[i] ?? DIM_COLORS[0];
          return (
            <SpotlightCard key={item.code} glow={hexToRgbTriplet(color)} className="group min-h-[220px] p-8">
              {src && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={src}
                  alt=""
                  aria-hidden
                  className="pointer-events-none absolute -right-8 -top-4 w-48 select-none opacity-[0.10] transition-all duration-500 group-hover:-translate-y-1 group-hover:rotate-6 group-hover:opacity-[0.22] md:w-56"
                />
              )}
              <div className="relative z-10">
                <div
                  className="h-2 w-12 rounded-full transition-all duration-500 group-hover:w-24"
                  style={{ background: color }}
                />
                <h3 className="mt-4 font-heading text-xl font-semibold text-fg">{item.title}</h3>
                <p className="body-sm mt-2 max-w-[24rem] text-fg-muted">{item.body}</p>
              </div>
            </SpotlightCard>
          );
        })}
      </RevealGroup>
    </section>
  );
}
