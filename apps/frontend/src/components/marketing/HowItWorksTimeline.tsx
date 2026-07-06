import { Display } from "@/components/ui/display";
import { Eyebrow } from "@/components/ui/eyebrow";
import { getCopy } from "@/lib/i18n";

/**
 * "Cómo funciona" — línea de tiempo horizontal 1→4 (items 12-13).
 * Reemplaza el grid de WhatWeOffer. Desktop: 4 columnas con conector.
 * Mobile: stack vertical con el número a la izquierda.
 */
export default function HowItWorksTimeline() {
  const c = getCopy("es");
  const { eyebrow, title, steps } = c.howItWorks;

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

      {/* Desktop: timeline horizontal con línea conectora */}
      <div className="relative hidden md:grid grid-cols-4 gap-8">
        <div
          className="absolute left-0 right-0 top-6 h-px bg-border"
          aria-hidden
        />
        {steps.map((s) => (
          <div key={s.n} className="relative flex flex-col gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary font-heading text-lg font-bold text-white">
              {s.n}
            </div>
            <h3 className="font-heading text-lg font-semibold text-fg">{s.title}</h3>
            <p className="body-sm text-hg-charcoal">{s.body}</p>
          </div>
        ))}
      </div>

      {/* Mobile: stack vertical */}
      <div className="flex flex-col gap-8 md:hidden">
        {steps.map((s) => (
          <div key={s.n} className="flex gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary font-heading text-base font-bold text-white">
              {s.n}
            </div>
            <div>
              <h3 className="font-heading text-lg font-semibold text-fg">{s.title}</h3>
              <p className="body-sm mt-1 text-hg-charcoal">{s.body}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
