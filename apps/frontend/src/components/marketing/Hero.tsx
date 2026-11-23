"use client";

import { CountUp } from "@/components/marketing/fx/CountUp";
import { CtaLink } from "@/components/marketing/fx/CtaLink";
import { Reveal } from "@/components/marketing/fx/Reveal";
import { RotatingWord } from "@/components/marketing/fx/RotatingWord";
import { WordReveal } from "@/components/marketing/fx/WordReveal";
import { useMarketingCopy } from "@/components/marketing/LanguageProvider";
import { DIM_COLORS } from "@/components/marketing/fx/dim-colors";
import { PhotoFrame } from "@/components/marketing/people/PhotoFrame";
import { BrowserFrame, PhoneFrame } from "@/components/marketing/platform/DeviceFrames";
import { showHumanize } from "@/lib/flags";

/**
 * Hero del home. Engagement: titular cinético, palabra rotativa entre las 6
 * dimensiones, CTAs magnéticos, contadores que cuentan al entrar y mockups
 * de producto que flotan.
 */
export default function Hero() {
  const copy = useMarketingCopy();
  const c = copy.hero;
  const humanize = showHumanize();

  return (
    <section className="mx-auto w-full max-w-marketing px-5 pb-16 pt-32 text-center md:px-8 md:pb-24 md:pt-40">
      <Reveal>
        <p className="eyebrow eyebrow-accent mb-6 flex justify-center">{c.eyebrow}</p>
      </Reveal>
      <WordReveal
        text={`${c.titleLine1} ${c.titleLine2}`}
        as="h1"
        className="display mx-auto my-0 max-w-[1100px] text-[44px] leading-[0.96] text-fg sm:text-6xl lg:text-[88px]"
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

      {humanize ? (
        /* Foto de ambientación + captura mobile montada sobre la foto, y los
           tres datos del hero apoyados sobre el borde inferior (plan v1.2, D1). */
        <Reveal variant="scale" delay={0.6} className="relative mx-auto mt-14 w-full max-w-[1100px] text-left">
          <div className="relative pb-[30%] pr-[14%] md:pb-0 md:pr-0">
            <PhotoFrame
              photo="hero-equipo"
              alt={copy.humanize.hero.photoAlt}
              sizes="(min-width: 1100px) 900px, (min-width: 768px) 82vw, 86vw"
              priority
              className="aspect-[16/10] md:w-[82%]"
            />
            <div className="fx-float absolute right-0 top-[10%] z-10 w-[30%] md:right-[6%] md:top-[6%] md:w-[23%] md:max-w-[250px]">
              <PhoneFrame shot="mob-home" alt={copy.alts.mobHome} eager />
            </div>
          </div>
          <HeroStats className="relative z-20 mt-4 md:-mt-14 md:ml-[4%] md:w-[64%]" />
          <p className="mt-4 text-xs font-medium text-fg-muted">{copy.humanize.sampleData}</p>
        </Reveal>
      ) : (
        <>
          {/* Mockups flotando */}
          <Reveal variant="scale" delay={0.6} className="relative mx-auto mt-14 hidden h-[790px] w-full max-w-[1100px] md:block">
            <div className="fx-float-slow absolute left-0 top-0 w-[90%]">
              <BrowserFrame shot="desk-home" alt={copy.alts.deskHome} height={1180} />
            </div>
            <div className="fx-float absolute right-0 top-[150px] w-[21%] min-w-[190px]">
              <PhoneFrame shot="mob-modulo" alt={copy.alts.mobModulo} eager />
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
        </>
      )}
    </section>
  );
}

/**
 * Los tres datos del hero (6 dimensiones · 5 min · 3 vistas) en un solo panel
 * que se apoya sobre la foto: número grande, etiqueta debajo y, en las
 * dimensiones, los seis colores.
 */
function HeroStats({ className }: { className?: string }) {
  const stats = useMarketingCopy().heroStats;
  return (
    <dl className={`glass-surface-strong m-0 grid grid-cols-3 divide-x divide-border rounded-2xl shadow-xl ${className ?? ""}`}>
      {stats.map((s, i) => (
        <div key={s.label} className="flex flex-col gap-1.5 px-3 py-4 md:px-6 md:py-5">
          <dt className="order-2 text-xs leading-snug text-fg-muted md:text-sm">{s.label}</dt>
          <dd className="order-1 m-0 flex items-end gap-2">
            <span className="display text-[34px] leading-none text-fg md:text-[52px]">
              <CountUp to={s.value} suffix={s.suffix} />
            </span>
            {i === 0 ? (
              <span className="mb-1.5 hidden gap-1 sm:flex" aria-hidden>
                {DIM_COLORS.map((col) => (
                  <span key={col} className="h-2 w-2 rounded-full md:h-2.5 md:w-2.5" style={{ background: col }} />
                ))}
              </span>
            ) : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}
