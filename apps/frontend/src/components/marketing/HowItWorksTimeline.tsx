"use client";

import { useEffect, useRef, useState } from "react";

import { DIM_COLORS } from "@/components/marketing/fx/dim-colors";
import { Reveal } from "@/components/marketing/fx/Reveal";
import { SectionHeader } from "@/components/marketing/fx/SectionHeader";
import { useMarketingCopy } from "@/components/marketing/LanguageProvider";
import { cn } from "@/lib/utils";

/**
 * "Cómo funciona" — línea de tiempo 1→4. La línea se dibuja con el scroll y
 * cada paso se ilumina cuando la línea lo alcanza. Desktop horizontal, mobile
 * vertical.
 */
export default function HowItWorksTimeline() {
  const { eyebrow, title, steps } = useMarketingCopy().howItWorks;
  const box = useRef<HTMLDivElement>(null);
  const [p, setP] = useState(0);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = box.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const t = (vh * 0.75 - r.top) / (r.height + vh * 0.1);
      setP(Math.max(0, Math.min(1, t)));
    };
    const on = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => {
      window.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section className="mx-auto w-full max-w-marketing px-5 py-16 md:px-8 md:py-24">
      <SectionHeader eyebrow={eyebrow} title={title} />
      <div ref={box} className="relative">
        {/* Línea (desktop horizontal · mobile vertical) */}
        <div aria-hidden className="absolute left-6 top-6 hidden h-px w-[calc(100%-3rem)] bg-border md:block">
          <div
            className="fx-line-fill h-full"
            style={{ ["--p" as string]: p, background: `linear-gradient(90deg, ${DIM_COLORS.join(",")})` }}
          />
        </div>
        <div aria-hidden className="absolute bottom-6 left-[21px] top-6 w-px bg-border md:hidden">
          <div
            className="w-full origin-top"
            style={{
              transform: `scaleY(${p})`,
              background: `linear-gradient(${DIM_COLORS.join(",")})`,
              height: "100%",
            }}
          />
        </div>

        <ol className="relative m-0 grid list-none gap-8 p-0 md:grid-cols-4">
          {steps.map((s, i) => {
            const active = p >= (i + 0.35) / steps.length;
            return (
              <li key={s.n} className="flex gap-4 md:flex-col">
                <Reveal variant="scale" delay={i * 0.1}>
                  <div
                    className={cn(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-heading text-base font-bold transition-all duration-500 md:h-12 md:w-12 md:text-lg",
                      active ? "scale-110 text-white" : "glass-fill-strong text-fg-muted",
                    )}
                    style={active ? { background: DIM_COLORS[i], boxShadow: `0 0 0 6px ${DIM_COLORS[i]}33` } : undefined}
                  >
                    {s.n}
                  </div>
                </Reveal>
                <Reveal delay={i * 0.1 + 0.1}>
                  <h3 className="font-heading text-lg font-semibold text-fg">{s.title}</h3>
                  <p className="body-sm mt-1 text-fg-muted md:mt-2">{s.body}</p>
                </Reveal>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
