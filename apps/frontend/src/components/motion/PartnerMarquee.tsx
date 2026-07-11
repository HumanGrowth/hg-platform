"use client";

import { m } from "framer-motion";
import { useId, type ReactNode } from "react";

import { useShouldAnimate } from "@/lib/motion/useShouldAnimate";
import { cn } from "@/lib/utils";

interface PartnerMarqueeProps {
  /** Items del marquee (logos). */
  children: ReactNode[];
  /** Segundos para completar 1 ciclo. */
  speed?: number;
  direction?: "left" | "right";
  pauseOnHover?: boolean;
  className?: string;
}

/**
 * Carrusel lateral infinito (motion-v2-01 · decisión A). Loop seamless: los
 * children se duplican y el track anima de 0% a -50% (el segundo set queda
 * exactamente donde arrancó el primero, sin salto visible).
 *
 * Pause on hover vía CSS (`animation-play-state`), no vía prop de framer —
 * `whileHover` no anima estilos CSS puros como `animation-play-state`, así que
 * el loop corre en una keyframe CSS mientras framer solo controla la entrada.
 * Con reduced motion cae a un grid estático (sin duplicar, sin loop).
 */
export function PartnerMarquee({
  children,
  speed = 30,
  direction = "left",
  pauseOnHover = true,
  className,
}: PartnerMarqueeProps) {
  const shouldAnimate = useShouldAnimate();
  const reactId = useId();
  const animName = `partner-marquee-${reactId.replace(/[:]/g, "")}`;

  if (!shouldAnimate) {
    return (
      <div
        className={cn("flex flex-wrap items-center justify-center gap-x-10 gap-y-6", className)}
        role="region"
        aria-label="Partners"
      >
        {children}
      </div>
    );
  }

  const duplicated = [...children, ...children];
  const toX = direction === "left" ? "-50%" : "50%";

  return (
    <div
      className={cn(
        "relative w-[60vw] md:w-[40vw] overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]",
        className,
      )}
      role="region"
      aria-label="Partners"
    >
      {/* Keyframe scoped por instancia (id único) — animation-play-state se
          controla 100% en CSS para que :hover lo pause sin re-render de React. */}
      <style>{`
        @keyframes ${animName} {
          from { transform: translateX(0); }
          to { transform: translateX(${toX}); }
        }
        .${animName}-track {
          animation: ${animName} ${speed}s linear infinite;
        }
        ${pauseOnHover ? `.${animName}-wrap:hover .${animName}-track { animation-play-state: paused; }` : ""}
      `}</style>
      <div className={`${animName}-wrap`}>
        <m.div
          className={`${animName}-track flex w-max gap-16`}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
        >
          {duplicated.map((child, i) => (
            <div key={i} className="flex shrink-0 items-center" aria-hidden={i >= children.length}>
              {child}
            </div>
          ))}
        </m.div>
      </div>
    </div>
  );
}
