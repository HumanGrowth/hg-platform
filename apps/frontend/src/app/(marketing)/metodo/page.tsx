import { CtaLink } from "@/components/marketing/fx/CtaLink";
import { PageHero } from "@/components/marketing/fx/PageHero";
import { Reveal, RevealGroup } from "@/components/marketing/fx/Reveal";
import { SectionHeader } from "@/components/marketing/fx/SectionHeader";
import { SpotlightCard } from "@/components/marketing/fx/SpotlightCard";
import { WordReveal } from "@/components/marketing/fx/WordReveal";
import HowItWorksTimeline from "@/components/marketing/HowItWorksTimeline";
import MarketingRadar from "@/components/marketing/MarketingRadar";
import { MethodDimensions } from "@/components/marketing/MethodDimensions";
import { MethodSteps } from "@/components/marketing/MethodSteps";
import { getCopy } from "@/lib/i18n";

const c = getCopy("es").method;

export const metadata = {
  title: c.meta.title,
  description: c.meta.description,
};

const SECTION = "mx-auto w-full max-w-marketing px-5 py-16 md:px-8 md:py-24";

export default function MetodoPage() {
  return (
    <div className="landing-flow">
      <PageHero eyebrow={c.hero.eyebrow} title={c.hero.title} subtitle={c.hero.subtitle} />

      {/* Un sistema, no seis módulos */}
      <section className={SECTION}>
        <Reveal variant="scale">
          <div className="glass-surface-strong p-8 sm:p-12">
            <p className="eyebrow eyebrow-accent mb-4">{c.system.eyebrow}</p>
            <WordReveal
              text={c.system.title}
              as="h2"
              className="display m-0 max-w-[720px] text-3xl leading-none text-fg sm:text-5xl"
            />
            <p className="mt-5 max-w-[720px] text-lg leading-relaxed text-fg-muted">{c.system.body}</p>
            <RevealGroup className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4" step={0.08}>
              {c.system.substrates.map((s) => (
                <div key={s.name} className="border-t-2 border-primary pt-4">
                  <h3 className="font-heading text-md font-semibold text-fg">{s.name}</h3>
                  <p className="mt-2 text-sm leading-[1.55] text-fg-muted">{s.body}</p>
                </div>
              ))}
            </RevealGroup>
          </div>
        </Reveal>
      </section>

      {/* Metodología · 5 etapas */}
      <section className={SECTION}>
        <SectionHeader eyebrow={c.steps.eyebrow} title={c.steps.title} subtitle={c.steps.body} />
        <MethodSteps items={c.steps.items} />
      </section>

      {/* Las 6 dimensiones */}
      <section className={SECTION}>
        <SectionHeader
          eyebrow={c.dimensionsHeading.eyebrow}
          title={c.dimensionsHeading.title}
          subtitle={c.dimensionsHeading.body}
        />
        <MethodDimensions pillars={c.pillars} />
      </section>

      {/* Radar back-to-back con las dimensiones (decisión K) */}
      <MarketingRadar />

      {/* Rigor y límites */}
      <section className={SECTION}>
        <SectionHeader eyebrow={c.rigor.eyebrow} title={c.rigor.title} subtitle={c.rigor.body} />
        <RevealGroup className="grid grid-cols-1 gap-5 md:grid-cols-3" step={0.1}>
          {c.rigor.points.map((p) => (
            <SpotlightCard key={p.title} className="h-full p-6">
              <h3 className="font-heading text-md font-semibold text-fg">{p.title}</h3>
              <p className="mt-2 text-sm leading-[1.55] text-fg-muted">{p.body}</p>
            </SpotlightCard>
          ))}
        </RevealGroup>
      </section>

      {/* Journey de producto · consistente con el home (item 22) */}
      <HowItWorksTimeline />

      {/* CTA final */}
      <section className={SECTION}>
        <Reveal variant="scale">
          <div className="glass-surface relative flex flex-col items-start gap-6 overflow-hidden rounded-[32px] border border-hg-amber/35 p-8 sm:p-14">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-20 -top-24 h-80 w-80 rounded-full opacity-50 blur-3xl"
              style={{ background: "radial-gradient(circle, rgba(232,83,10,0.5), transparent 70%)" }}
            />
            <WordReveal
              text={c.cta.title}
              as="h2"
              className="display relative m-0 max-w-[620px] text-3xl leading-none text-fg sm:text-5xl"
            />
            <p className="relative max-w-[520px] text-lg leading-relaxed text-fg-muted">{c.cta.body}</p>
            <CtaLink href="/contacto" className="relative">
              {c.cta.button}
            </CtaLink>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
