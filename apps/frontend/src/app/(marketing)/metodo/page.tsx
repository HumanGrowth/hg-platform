import Link from "next/link";

import { HeroWatermark } from "@/components/marketing/HeroWatermark";
import { BrandSawWave } from "@/components/motion/BrandSawWave";
import { BubbleField } from "@/components/motion/BubbleField";
import { DecoLayer } from "@/components/motion/DecoLayer";
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
    <div className="landing-flow">
      {/* Hero */}
      <section className="landing-flow-section landing-flow-hero relative max-w-marketing mx-auto px-8">
        <DecoLayer>
          <BubbleField seed={21} count={5} />
        </DecoLayer>
        <div className="eyebrow eyebrow-accent mb-6">{c.hero.eyebrow}</div>
        <h1 className="display text-fg m-0 text-[56px] leading-[0.95] sm:text-[80px] lg:text-[96px]">
          {c.hero.title}
        </h1>
        <p className="mt-8 max-w-[680px] text-[20px] leading-[1.5] text-hg-charcoal">
          {c.hero.subtitle}
        </p>
      </section>

      {/* Un sistema, no seis módulos */}
      <section className="landing-flow-section relative max-w-marketing mx-auto px-8">
        <DecoLayer>
          <BrandSawWave width={220} teeth={6} height={16} rotation={-8} top="6%" right="6%" color="var(--hg-gold)" opacity={0.28} speed={0.08} />
        </DecoLayer>
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
      <section className="landing-flow-section relative max-w-marketing mx-auto px-8">
        <DecoLayer>
          <BubbleField seed={22} count={4} />
        </DecoLayer>
        <div className="eyebrow eyebrow-accent mb-4">{c.steps.eyebrow}</div>
        <h2 className="display m-0 max-w-[720px] text-3xl text-fg sm:text-4xl">{c.steps.title}</h2>
        <p className="mt-4 mb-10 max-w-[620px] text-[18px] leading-[1.5] text-hg-charcoal">
          {c.steps.body}
        </p>
        <MethodSteps items={c.steps.items} />
      </section>

      {/* Los 6 pilares */}
      <section className="landing-flow-section max-w-marketing mx-auto px-8">
        <DecoLayer>
          <BrandSawWave width={300} teeth={8} height={18} rotation={-12} bottom="6%" right="4%" color="var(--hg-gold)" opacity={0.3} speed={0.1} />
          <BubbleField seed={23} count={4} />
        </DecoLayer>
        <div className="eyebrow eyebrow-accent mb-4">{c.pillarsHeading.eyebrow}</div>
        <h2 className="display m-0 max-w-[720px] text-3xl text-fg sm:text-4xl">
          {c.pillarsHeading.title}
        </h2>
        <p className="mt-4 mb-10 max-w-[620px] text-[18px] leading-[1.5] text-hg-charcoal">
          {c.pillarsHeading.body}
        </p>
        <MethodPillars pillars={c.pillars} />
      </section>

      {/* Radar back-to-back con los pilares (decisión K) */}
      <MarketingRadar />

      {/* Rigor y límites */}
      <section className="landing-flow-section relative max-w-marketing mx-auto px-8 pb-20">
        <DecoLayer>
          <BrandSawWave width={180} teeth={5} height={16} rotation={10} top="4%" left="2%" color="var(--hg-sage)" opacity={0.28} speed={0.08} />
          <BubbleField seed={24} count={3} />
        </DecoLayer>
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

      {/* Journey de producto · consistente con el home (item 22) */}
      <HowItWorksTimeline />

      {/* CTA final */}
      <section className="landing-flow-section relative max-w-marketing mx-auto px-8">
        <DecoLayer>
          <BrandSawWave width={200} teeth={5} height={16} rotation={-15} bottom="6%" right="2%" color="var(--hg-gold)" opacity={0.3} speed={0.08} />
        </DecoLayer>
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
    </div>
  );
}
