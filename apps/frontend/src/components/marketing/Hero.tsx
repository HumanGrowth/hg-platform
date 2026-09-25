"use client";

import { CountUp } from "@/components/marketing/fx/CountUp";
import { CtaLink } from "@/components/marketing/fx/CtaLink";
import { Reveal } from "@/components/marketing/fx/Reveal";
import { RotatingWord } from "@/components/marketing/fx/RotatingWord";
import { WordReveal } from "@/components/marketing/fx/WordReveal";
import { useMarketingCopy } from "@/components/marketing/LanguageProvider";
import { BrowserFrame, PhoneFrame } from "@/components/marketing/platform/DeviceFrames";

/**
 * Hero del home. Engagement: titular cinético, palabra rotativa entre las 6
 * dimensiones, CTAs magnéticos, contadores que cuentan al entrar y mockups
 * de producto que flotan.
 */
export default function Hero() {
  const copy = useMarketingCopy();
  const c = copy.hero;

  return (
    <section className="mx-auto w-full max-w-marketing px-5 pb-16 pt-32 text-center md:px-8 md:pb-24 md:pt-40">
      <Reveal>
        <p className="eyebrow eyebrow-accent mb-6 flex justify-center">{c.eyebrow}</p>
      </Reveal>
      <WordReveal
        text={`${c.titleLine1} ${c.titleLine2}`}
        as="h1"
        className="display mx-auto m-0 max-w-[1100px] text-[44px] leading-[0.96] text-fg sm:text-6xl lg:text-[88px]"
      />
      <Reveal delay={0.35}>
        <p className="display mt-5 text-[28px] leading-none text-fg sm:text-4xl lg:text-5xl">
          {copy.heroRotating} <RotatingWord />
        </p>
      </Reveal>
      <Reveal delay={0.45}>
        <p className="mx-auto mt-6 max-w-[680px] text-lg leading-relaxed text-fg-muted md:text-xl">{c.bodyP1}</p>
      </Reveal>
      <Reveal delay={0.55} className="mt-9 flex flex-wrap items-center justify-center gap-3">
        <CtaLink href="/contacto">{c.ctaPrimary.replace(/\s*→$/, "")}</CtaLink>
        <CtaLink href="#dimensiones" variant="ghost" arrow={false}>
          {c.ctaSecondary}
        </CtaLink>
      </Reveal>
      <Reveal delay={0.65} className="mt-4">
        <p className="text-sm font-medium text-fg-muted">{c.socialProof}</p>
      </Reveal>

      {/* Mockups flotando */}
      <Reveal variant="scale" delay={0.6} className="relative mx-auto mt-14 hidden h-[790px] w-full max-w-[1100px] md:block">
        <div className="fx-float-slow absolute left-0 top-0 w-[90%]">
          <BrowserFrame shot="desk-home" alt="Inicio de la app: progreso por dimensión" height={1180} />
        </div>
        <div className="fx-float absolute right-0 top-[150px] w-[21%] min-w-[190px]">
          <PhoneFrame shot="mob-modulo" alt="Player de módulo en el teléfono" eager />
        </div>
      </Reveal>

      {/* Contadores */}
      <div className="mx-auto mt-12 grid max-w-[900px] gap-4 sm:grid-cols-3 md:mt-16">
        {copy.heroStats.map((s, i) => (
          <Reveal key={s.label} delay={i * 0.1} variant="scale">
            <div className="glass-surface-strong p-5 text-center">
              <div className="display text-5xl leading-none text-fg">
                <CountUp to={s.value} suffix={s.suffix} />
              </div>
              <p className="mt-2 text-sm text-fg-muted">{s.label}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
