"use client";

import { useEffect, useState } from "react";

import { useMarketingCopy } from "@/components/marketing/LanguageProvider";
import { useShouldAnimate } from "@/lib/motion/useShouldAnimate";

import { DIM_COLORS } from "./dim-colors";

/** Palabra que rota entre las 6 dimensiones, con el color de cada una. */
export function RotatingWord({ className }: { className?: string }) {
  const animate = useShouldAnimate();
  const words = useMarketingCopy().heroDimensions;
  const [i, setI] = useState(0);

  useEffect(() => {
    if (!animate) return;
    const id = setInterval(() => setI((v) => (v + 1) % words.length), 2200);
    return () => clearInterval(id);
  }, [animate, words.length]);

  return (
    <span className={className} aria-live="off">
      {/* grid overlay: reserva el ancho de la palabra más larga */}
      <span className="inline-grid align-bottom">
        {words.map((w, k) => (
          <span
            key={k}
            aria-hidden={k !== i}
            className="col-start-1 row-start-1 transition-all duration-500 ease-out"
            style={{
              color: DIM_COLORS[k],
              opacity: k === i ? 1 : 0,
              transform: k === i ? "translateY(0)" : "translateY(0.4em)",
              filter: k === i ? "none" : "blur(6px)",
            }}
          >
            {w}
          </span>
        ))}
      </span>
    </span>
  );
}
