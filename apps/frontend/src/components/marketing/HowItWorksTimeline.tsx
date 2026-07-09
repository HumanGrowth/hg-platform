"use client";

import { m, type Variants } from "framer-motion";
import type { ReactNode } from "react";

import { useMarketingCopy } from "@/components/marketing/LanguageProvider";
import { MotionSection } from "@/components/motion/MotionSection";
import { useShouldAnimate } from "@/lib/motion/useShouldAnimate";
import { Display } from "@/components/ui/display";
import { Eyebrow } from "@/components/ui/eyebrow";

const HOP_STAGGER = 0.15;

const hopVariants: Variants = {
  hidden: { y: 0, opacity: 0 },
  visible: (index: number) => ({
    y: [0, -12, 0],
    opacity: 1,
    transition: {
      delay: index * HOP_STAGGER,
      y: { type: "spring", bounce: 0.5, duration: 0.7 },
      opacity: { duration: 0.2, delay: index * HOP_STAGGER },
    },
  }),
};

const textVariants: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    // El texto aparece después del hop del número (decisión E, motion-v2-05).
    transition: { duration: 0.3, delay: index * HOP_STAGGER + 0.2 },
  }),
};

/** Número circular que "hopea" en secuencia al entrar en viewport. */
function HopNumber({ index, className, children }: { index: number; className: string; children: ReactNode }) {
  const shouldAnimate = useShouldAnimate();
  if (!shouldAnimate) {
    return <div className={className}>{children}</div>;
  }
  return (
    <m.div
      className={className}
      custom={index}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      variants={hopVariants}
    >
      {children}
    </m.div>
  );
}

/**
 * Texto del step, aparece con fade tras el hop del número. Siempre envuelve
 * en un bloque real (nunca Fragment) — en mobile el wrapper agrupa h3+p como
 * un solo flex item junto al número; un Fragment los desparramaría como
 * items sueltos en el flex row.
 */
function HopText({ index, children }: { index: number; children: ReactNode }) {
  const shouldAnimate = useShouldAnimate();
  if (!shouldAnimate) {
    return <div>{children}</div>;
  }
  return (
    <m.div
      custom={index}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      variants={textVariants}
    >
      {children}
    </m.div>
  );
}

/**
 * "Cómo funciona" — línea de tiempo horizontal 1→4 (items 12-13).
 * Reemplaza el grid de WhatWeOffer. Desktop: 4 columnas con conector.
 * Mobile: stack vertical con el número a la izquierda. Los números hopean en
 * secuencia al entrar en viewport (motion-v2-05 · decisión E).
 */
export default function HowItWorksTimeline() {
  const c = useMarketingCopy();
  const { eyebrow, title, steps } = c.howItWorks;

  return (
    <section className="landing-flow-section max-w-marketing mx-auto px-8">
      <MotionSection as="div">
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
        {steps.map((s, i) => (
          <div key={s.n} className="relative flex flex-col gap-4">
            <HopNumber
              index={i}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-primary font-heading text-lg font-bold text-white"
            >
              {s.n}
            </HopNumber>
            <HopText index={i}>
              <h3 className="font-heading text-lg font-semibold text-fg">{s.title}</h3>
              <p className="body-sm mt-2 text-hg-charcoal">{s.body}</p>
            </HopText>
          </div>
        ))}
      </div>

      {/* Mobile: stack vertical */}
      <div className="flex flex-col gap-8 md:hidden">
        {steps.map((s, i) => (
          <div key={s.n} className="flex gap-4">
            <HopNumber
              index={i}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary font-heading text-base font-bold text-white"
            >
              {s.n}
            </HopNumber>
            <HopText index={i}>
              <h3 className="font-heading text-lg font-semibold text-fg">{s.title}</h3>
              <p className="body-sm mt-1 text-hg-charcoal">{s.body}</p>
            </HopText>
          </div>
        ))}
      </div>
      </MotionSection>
    </section>
  );
}
