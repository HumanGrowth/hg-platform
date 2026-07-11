"use client";

import Link from "next/link";
import { useCallback, useState } from "react";

import { useMarketingCopy } from "@/components/marketing/LanguageProvider";
import { MotionSection } from "@/components/motion/MotionSection";
import { BrandSawWave } from "@/components/motion/BrandSawWave";
import { BubbleField } from "@/components/motion/BubbleField";
import { DecoLayer } from "@/components/motion/DecoLayer";
import { Display } from "@/components/ui/display";
import { Eyebrow } from "@/components/ui/eyebrow";

const SCREENS = [
  { src: "/marketing/platform/01-home-dashboard.png", alt: "Home de la app" },
  { src: "/marketing/platform/05-home-with-real-states.png", alt: "Home con estados reales de progreso" },
  { src: "/marketing/platform/01-onboarding-welcome.png", alt: "Onboarding del colaborador" },
  { src: "/marketing/platform/04-admin-org-tendencias.png", alt: "Dashboard de tendencias para RRHH" },
];

/** Sección producto en home: stack de screens de la app → /plataforma (decisión G). */
export function ProductStack() {
  const c = useMarketingCopy().productStack;
  const [activeIndex, setActiveIndex] = useState(0);

  const rotateStack = useCallback((direction: 1 | -1) => {
    setActiveIndex((prev) => {
      const next = (prev + direction + SCREENS.length) % SCREENS.length;
      return next;
    });
  }, []);

  return (
    <section className="landing-flow-section max-w-marketing mx-auto px-8">
      <DecoLayer>
        <BrandSawWave width={320} teeth={8} height={18} rotation={15} top="12%" right="8%" color="var(--hg-gold)" opacity={0.3} speed={0.1} />
        <BubbleField seed={6} count={4} />
      </DecoLayer>
      <MotionSection as="div" className="grid items-center gap-12 md:grid-cols-2">
      <div>
        <Eyebrow accent className="mb-6">
          {c.eyebrow}
        </Eyebrow>
        <Display as="h2" variant="display-3" className="mb-6">
          {c.title}
        </Display>
        <p className="body-lg mb-6 text-fg-muted">{c.body}</p>
        <Link href="/plataforma" className="font-semibold text-primary hover:text-primary-hover">
          {c.cta}
        </Link>
      </div>

      <div
        className="relative h-[320px] sm:h-[380px]"
        onWheel={(e) => {
          if (Math.abs(e.deltaY) < 8) return;
          rotateStack(e.deltaY > 0 ? 1 : -1);
        }}
      >
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-transparent via-[var(--hg-cream)]/40 to-transparent" />
        {SCREENS.map((s, i) => {
          const distance = (i - activeIndex + SCREENS.length) % SCREENS.length;
          const hidden = distance > 2;

          return (
            <button
              type="button"
              key={s.src}
              className="absolute overflow-hidden rounded-lg border border-border bg-[var(--hg-cream)] shadow-md transition-all duration-300"
              style={{
                top: "50%",
                left: "50%",
                width: "86%",
                height: "240px",
                zIndex: SCREENS.length - distance,
                padding: "12px",
                transform: `translate(calc(-50% + ${distance * 8}px), calc(-50% + ${distance * 22}px)) scale(${1 - distance * 0.04})`,
                opacity: hidden ? 0 : 1 - distance * 0.16,
                pointerEvents: hidden ? "none" : "auto",
              }}
              aria-label={`Ver pantalla ${i + 1}: ${s.alt}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.src} alt={s.alt} className="h-full w-full object-cover" />
            </button>
          );
        })}

        <div className="absolute -bottom-10 left-0 flex items-center gap-3 sm:-bottom-12">
          <button
            type="button"
            className="h-8 w-8 rounded-full border border-border text-sm text-fg-muted transition-colors hover:border-primary hover:text-primary"
            onClick={() => rotateStack(-1)}
            aria-label="Pantalla anterior"
          >
            &lt;
          </button>
          <button
            type="button"
            className="h-8 w-8 rounded-full border border-border text-sm text-fg-muted transition-colors hover:border-primary hover:text-primary"
            onClick={() => rotateStack(1)}
            aria-label="Siguiente pantalla"
          >
            &gt;
          </button>
          <div className="flex items-center gap-2">
            {SCREENS.map((screen, i) => (
              <button
                type="button"
                key={screen.src}
                onClick={() => setActiveIndex(i)}
                className="h-2 w-2 rounded-full transition-all"
                style={{
                  background: i === activeIndex ? "var(--primary)" : "var(--border)",
                  transform: i === activeIndex ? "scale(1.2)" : "scale(1)",
                }}
                aria-label={`Ir a pantalla ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
      </MotionSection>
    </section>
  );
}
