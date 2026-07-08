"use client";

import Link from "next/link";

import { useMarketingCopy } from "@/components/marketing/LanguageProvider";
import { MotionSection } from "@/components/motion/MotionSection";
import { Display } from "@/components/ui/display";
import { Eyebrow } from "@/components/ui/eyebrow";

// TODO(Andrés): pasar screenshots reales de la app (1200×750) a
// public/marketing/screens/ y poner HAS_SCREENS = true (web-v3-10).
const HAS_SCREENS = false;

const SCREENS = [
  { src: "/marketing/screens/screen-home.png", alt: "Home de la app" },
  { src: "/marketing/screens/screen-perfil.png", alt: "Perfil del colaborador" },
  { src: "/marketing/screens/screen-modulos.png", alt: "Módulos de aprendizaje" },
  { src: "/marketing/screens/screen-team.png", alt: "Dashboard del equipo" },
];

/** Sección producto en home: stack de screens de la app → /plataforma (decisión G). */
export function ProductStack() {
  const c = useMarketingCopy().productStack;
  return (
    <section className="landing-flow-section max-w-marketing mx-auto px-8">
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

      <div className="relative h-[320px] sm:h-[380px]">
        {SCREENS.map((s, i) => (
          <div
            key={s.src}
            className="absolute overflow-hidden rounded-lg border border-border bg-surface-card shadow-md"
            style={{
              top: `${i * 32}px`,
              left: `${i * 24}px`,
              width: "80%",
              zIndex: SCREENS.length - i,
            }}
          >
            {HAS_SCREENS ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={s.src} alt={s.alt} className="h-auto w-full" />
            ) : (
              <div
                aria-label={s.alt}
                className="aspect-video w-full bg-hg-linen"
              />
            )}
          </div>
        ))}
      </div>
      </MotionSection>
    </section>
  );
}
