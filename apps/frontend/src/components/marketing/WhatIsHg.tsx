import { Display } from "@/components/ui/display";
import { Eyebrow } from "@/components/ui/eyebrow";
import { getCopy } from "@/lib/i18n";

/**
 * "¿Cómo funciona HG?" (item 26 · Copy A). Tres cards: Qué es / Qué hace /
 * Cómo funciona. Vende las 4 etapas como visión completa del producto.
 */
export default function WhatIsHg() {
  const c = getCopy("es");
  const { eyebrow, title, cards } = c.whatIsHg;

  return (
    <section className="max-w-marketing mx-auto px-8 py-32">
      <div className="max-w-[760px] mb-14">
        <Eyebrow accent className="mb-4">
          {eyebrow}
        </Eyebrow>
        <Display as="h2" variant="display-3">
          {title}
        </Display>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {cards.map((card) => (
          <article
            key={card.title}
            className="flex flex-col gap-3 rounded-lg border border-border bg-surface-card p-8"
          >
            <h3 className="font-heading text-lg font-semibold text-fg">{card.title}</h3>
            <p className="body-sm leading-relaxed text-hg-charcoal">{card.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
