"use client";

import Image from "next/image";

import { Reveal } from "@/components/marketing/fx/Reveal";
import { useMarketingCopy } from "@/components/marketing/LanguageProvider";
import { Typewriter } from "@/components/motion/Typewriter";
import { QuoteMark } from "@/components/ui/brand";
import { showHumanize } from "@/lib/flags";

/** Quote fundador con dato Deloitte 2024 (item 6). */
export default function Quote() {
  const c = useMarketingCopy();
  if (showHumanize()) return <QuotePortrait />;
  return (
    <section className="mx-auto w-full max-w-[1000px] px-5 py-16 md:px-8 md:py-24">
      <Reveal variant="scale">
        <div className="glass-surface-strong relative overflow-hidden p-8 text-left md:p-14">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-40 blur-3xl"
            style={{ background: "radial-gradient(circle, rgba(232,160,48,0.6), transparent 70%)" }}
          />
          <div className="eyebrow eyebrow-accent relative mb-7">{c.quote.eyebrow}</div>
          <QuoteMark size={72} tone="amber" className="relative mb-6" />

          <Typewriter
            as="p"
            text={c.quote.p1}
            speed={15}
            className="relative max-w-[820px] font-heading text-xl leading-snug text-fg md:text-2xl"
          />
          <p className="relative mt-4 font-heading text-2xl font-bold text-hg-orange md:text-3xl">
            {c.quote.ending}
          </p>

          <div className="relative mt-8 flex items-center gap-3.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/marketing/mentors/jorge.jpg"
              alt={c.quote.author}
              className="h-12 w-12 rounded-full object-cover ring-2 ring-hg-amber/60"
            />
            <div>
              <div className="font-bold">
                {c.quote.author}{" "}
                <span className="font-normal text-fg-muted">· {c.quote.authorTitle}</span>
              </div>
              <div className="body-xs mt-1 italic text-fg-subtle">{c.quote.source}</div>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/**
 * Formato nuevo (plan v1.2, D4): foto de perfil de Jorge en círculo, montada
 * sobre la esquina superior izquierda de la tarjeta (fuera de su borde), cita
 * en Poppins y "Hasta ahora." en Anton naranja. Mismo copy que el formato actual.
 */
function QuotePortrait() {
  const c = useMarketingCopy();
  return (
    <section className="mx-auto w-full max-w-[1040px] px-5 pb-16 pt-24 md:px-8 md:pb-24 md:pt-32">
      <Reveal variant="scale">
        <figure className="relative m-0">
          {/* La tarjeta recorta el glow; el retrato queda afuera para poder sobresalir. */}
          <div className="glass-surface-strong relative overflow-hidden px-6 pb-8 pt-24 md:px-14 md:pb-12 md:pt-14">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full opacity-40 blur-3xl"
              style={{ background: "radial-gradient(circle, rgba(232,160,48,0.6), transparent 70%)" }}
            />
            <blockquote className="relative m-0 flex flex-col gap-5 md:pl-[184px]">
              <p className="eyebrow eyebrow-accent m-0">{c.quote.eyebrow}</p>
              <p className="m-0 max-w-[46ch] font-heading text-xl font-medium leading-snug text-fg md:text-[26px] md:leading-[1.35]">
                {c.quote.p1}
              </p>
              <p className="display m-0 text-5xl leading-none text-hg-orange md:text-[56px]">{c.quote.ending}</p>
            </blockquote>
            <figcaption className="relative mt-8 flex flex-col gap-1 border-t border-border pt-5 md:ml-[184px]">
              <span className="font-heading text-base font-semibold text-fg">
                {c.quote.author} <span className="font-normal text-fg-muted">· {c.quote.authorTitle}</span>
              </span>
              <span className="body-xs italic text-fg-subtle">{c.quote.source}</span>
            </figcaption>
          </div>
          <div className="absolute -left-2 -top-16 h-36 w-36 overflow-hidden rounded-full shadow-2xl ring-4 ring-hg-amber md:-left-10 md:-top-20 md:h-[200px] md:w-[200px]">
            <Image
              src="/marketing/mentors/jorge-perfil.webp"
              alt={c.humanize.quote.portraitAlt}
              fill
              sizes="(min-width: 768px) 200px, 144px"
              className="object-cover"
            />
          </div>
        </figure>
      </Reveal>
    </section>
  );
}
