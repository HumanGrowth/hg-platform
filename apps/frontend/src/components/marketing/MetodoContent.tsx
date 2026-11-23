"use client";

import { CtaLink } from "@/components/marketing/fx/CtaLink";
import { DIM_COLORS } from "@/components/marketing/fx/dim-colors";
import { PageHero } from "@/components/marketing/fx/PageHero";
import { Reveal, RevealGroup } from "@/components/marketing/fx/Reveal";
import { SectionHeader } from "@/components/marketing/fx/SectionHeader";
import { SpotlightCard } from "@/components/marketing/fx/SpotlightCard";
import { WordReveal } from "@/components/marketing/fx/WordReveal";
import { useMarketingCopy } from "@/components/marketing/LanguageProvider";
import HowItWorksTimeline from "@/components/marketing/HowItWorksTimeline";
import MarketingRadar from "@/components/marketing/MarketingRadar";
import { MethodDimensions } from "@/components/marketing/MethodDimensions";
import { MethodSteps } from "@/components/marketing/MethodSteps";
import { PhotoFrame } from "@/components/marketing/people/PhotoFrame";
import { showHumanize } from "@/lib/flags";

const SECTION = "mx-auto w-full max-w-marketing px-5 py-16 md:px-8 md:py-24";

export function MetodoContent() {
  const copy = useMarketingCopy();
  const c = copy.method;
  // Plan v1.2 (D7): /metodo se humaniza de forma aditiva; ningún texto cambia.
  const humanize = showHumanize();
  const h = copy.humanize.method;
  return (
    <div className="landing-flow">
      <PageHero
        eyebrow={c.hero.eyebrow}
        title={c.hero.title}
        subtitle={c.hero.subtitle}
        aside={
          humanize ? (
            <div className="relative pb-6">
              <PhotoFrame
                photo="equipo-sala-postit"
                alt={h.heroAlt}
                sizes="(min-width: 768px) 45vw, 92vw"
                priority
                className="aspect-[4/3]"
              />
              <div className="glass-surface-strong absolute bottom-0 left-4 flex items-center gap-3 rounded-full px-4 py-2.5">
                <span className="flex gap-1.5" aria-hidden>
                  {DIM_COLORS.map((col) => (
                    <span key={col} className="h-2.5 w-2.5 rounded-full" style={{ background: col }} />
                  ))}
                </span>
                <span className="font-heading text-sm font-semibold text-fg">{h.heroChip}</span>
              </div>
            </div>
          ) : undefined
        }
      />

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
        {humanize ? (
          <div className="mb-12 grid items-center gap-8 md:grid-cols-2 md:gap-12">
            <SectionHeader eyebrow={c.steps.eyebrow} title={c.steps.title} subtitle={c.steps.body} className="mb-0" />
            <Reveal variant="scale" delay={0.1}>
              <figure className="relative m-0 pb-6">
                <PhotoFrame
                  photo="dia-4-pizarra"
                  alt={h.stepsAlt}
                  sizes="(min-width: 768px) 45vw, 92vw"
                  className="aspect-[16/10]"
                />
                <figcaption className="glass-surface-strong absolute inset-x-4 bottom-0 px-4 py-3 text-sm font-medium text-fg">
                  {h.stepsCaption}
                </figcaption>
              </figure>
            </Reveal>
          </div>
        ) : (
          <SectionHeader eyebrow={c.steps.eyebrow} title={c.steps.title} subtitle={c.steps.body} />
        )}
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
        {humanize ? (
          <div className="mb-12 grid items-center gap-8 md:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] md:gap-12">
            <SectionHeader eyebrow={c.rigor.eyebrow} title={c.rigor.title} subtitle={c.rigor.body} className="mb-0" />
            <Reveal variant="scale" delay={0.1}>
              <PhotoFrame
                photo="dia-2-colegas"
                alt={h.rigorAlt}
                sizes="(min-width: 768px) 40vw, 92vw"
                className="aspect-[16/10]"
              />
            </Reveal>
          </div>
        ) : (
          <SectionHeader eyebrow={c.rigor.eyebrow} title={c.rigor.title} subtitle={c.rigor.body} />
        )}
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
