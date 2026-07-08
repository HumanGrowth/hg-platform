import Link from "next/link";

import HowItWorksTimeline from "@/components/marketing/HowItWorksTimeline";
import MarketingRadar from "@/components/marketing/MarketingRadar";
import { MethodPillars } from "@/components/marketing/MethodPillars";
import { MethodSteps } from "@/components/marketing/MethodSteps";
import { getCopy } from "@/lib/i18n";

const c = getCopy("es").method;

export const metadata = {
  title: c.meta.title,
  description: c.meta.description,
};

export default function MetodoPage() {
  return (
    <>
      {/* Hero */}
      <section className="max-w-marketing mx-auto px-8 pt-36 pb-16">
        <div className="eyebrow eyebrow-accent mb-6">{c.hero.eyebrow}</div>
        <h1 className="display text-fg m-0 text-[56px] leading-[0.95] sm:text-[80px] lg:text-[96px]">
          {c.hero.title}
        </h1>
        <p className="mt-8 max-w-[680px] text-[20px] leading-[1.5] text-hg-charcoal">
          {c.hero.subtitle}
        </p>
      </section>

      {/* Un sistema, no seis módulos */}
      <section className="max-w-marketing mx-auto px-8 py-20">
        <div className="rounded-2xl bg-surface-sunken p-8 sm:p-12">
          <div className="eyebrow eyebrow-accent mb-4">{c.system.eyebrow}</div>
          <h2 className="display m-0 max-w-[720px] text-3xl text-fg sm:text-4xl">
            {c.system.title}
          </h2>
          <p className="mt-5 max-w-[720px] text-[18px] leading-[1.55] text-hg-charcoal">
            {c.system.body}
          </p>
          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {c.system.substrates.map((s) => (
              <div key={s.name} className="border-t-2 border-primary pt-4">
                <h3 className="font-heading text-md font-semibold text-fg">{s.name}</h3>
                <p className="mt-2 text-sm leading-[1.55] text-hg-charcoal">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Metodología · 5 etapas */}
      <section className="max-w-marketing mx-auto px-8 pb-20">
        <div className="eyebrow eyebrow-accent mb-4">{c.steps.eyebrow}</div>
        <h2 className="display m-0 max-w-[720px] text-3xl text-fg sm:text-4xl">{c.steps.title}</h2>
        <p className="mt-4 mb-10 max-w-[620px] text-[18px] leading-[1.5] text-hg-charcoal">
          {c.steps.body}
        </p>
        <MethodSteps items={c.steps.items} />
      </section>

      {/* Los 6 pilares · accordion */}
      <section className="max-w-marketing mx-auto px-8 pb-20">
        <div className="eyebrow eyebrow-accent mb-4">{c.pillarsHeading.eyebrow}</div>
        <h2 className="display m-0 max-w-[720px] text-3xl text-fg sm:text-4xl">
          {c.pillarsHeading.title}
        </h2>
        <p className="mt-4 mb-10 max-w-[620px] text-[18px] leading-[1.5] text-hg-charcoal">
          {c.pillarsHeading.body}
        </p>
        <MethodPillars
          pillars={c.pillars}
          structureLabel={c.structureLabel}
          latamLabel={c.latamLabel}
        />
      </section>

      {/* Radar ilustrativo */}
      <MarketingRadar />

      {/* Rigor y límites */}
      <section className="max-w-marketing mx-auto px-8 pb-20">
        <div className="eyebrow eyebrow-accent mb-4">{c.rigor.eyebrow}</div>
        <h2 className="display m-0 max-w-[760px] text-3xl text-fg sm:text-4xl">{c.rigor.title}</h2>
        <p className="mt-5 mb-10 max-w-[720px] text-[18px] leading-[1.55] text-hg-charcoal">
          {c.rigor.body}
        </p>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {c.rigor.points.map((p) => (
            <div key={p.title} className="rounded-lg border border-border bg-surface-card p-6">
              <h3 className="font-heading text-md font-semibold text-fg">{p.title}</h3>
              <p className="mt-2 text-sm leading-[1.55] text-hg-charcoal">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Fuentes */}
      <section className="max-w-marketing mx-auto px-8 pb-24">
        <div className="eyebrow mb-3">{c.sources.eyebrow}</div>
        <h2 className="display m-0 mb-8 text-2xl text-fg">{c.sources.title}</h2>
        <ol className="grid grid-cols-1 gap-x-10 gap-y-2 md:grid-cols-2">
          {c.sources.items.map((ref, i) => (
            <li key={i} className="flex gap-3 text-sm leading-[1.5] text-fg-muted">
              <span className="font-mono text-xs text-fg-subtle">{i + 1}.</span>
              <span>{ref}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* Journey de producto · consistente con el home (item 22) */}
      <HowItWorksTimeline />

      {/* CTA final */}
      <section className="max-w-marketing mx-auto px-8 pb-32">
        <div className="flex flex-col items-start gap-6 rounded-2xl bg-hg-ink p-10 sm:p-14">
          <h2 className="display m-0 max-w-[620px] text-3xl text-hg-cream sm:text-4xl">
            {c.cta.title}
          </h2>
          <p className="max-w-[520px] text-[18px] leading-[1.5] text-hg-linen">{c.cta.body}</p>
          <Link
            href="/contacto"
            className="rounded-md bg-primary px-7 py-4 font-semibold text-white transition-colors hover:bg-primary-hover"
          >
            {c.cta.button} →
          </Link>
        </div>
      </section>
    </>
  );
}
