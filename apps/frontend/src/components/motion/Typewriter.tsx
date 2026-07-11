"use client";

import { m, useInView } from "framer-motion";
import { createElement, useEffect, useRef, useState } from "react";

import { useShouldAnimate } from "@/lib/motion/useShouldAnimate";

type TypewriterTag = "span" | "p" | "h1" | "h2" | "h3" | "div";

interface TypewriterProps {
  text: string;
  /** ms por caracter. */
  speed?: number;
  /** ms antes de arrancar, una vez en viewport. */
  delay?: number;
  className?: string;
  as?: TypewriterTag;
  /** Muestra un cursor parpadeante mientras escribe. */
  keepCursor?: boolean;
}

/**
 * Escribe `text` letra por letra al entrar en viewport (motion-v2-06 ·
 * decisión F). a11y: aria-label lleva el texto completo (el lector de
 * pantalla no espera la animación); el texto visible es aria-hidden.
 * Reduced motion / SSR → texto completo desde el arranque (sin FOUC, SEO OK).
 */
export function Typewriter({
  text,
  speed = 18,
  delay = 0,
  className,
  as = "span",
  keepCursor = true,
}: TypewriterProps) {
  const shouldAnimate = useShouldAnimate();
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -10% 0px" });
  const [display, setDisplay] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!shouldAnimate || !inView) return;
    let i = 0;
    let raf = 0;
    let last = 0;
    const startTimer = setTimeout(() => {
      const tick = (now: number) => {
        if (i >= text.length) {
          setDone(true);
          return;
        }
        if (now - last >= speed) {
          i += 1;
          setDisplay(text.slice(0, i));
          last = now;
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, delay);

    return () => {
      clearTimeout(startTimer);
      cancelAnimationFrame(raf);
    };
  }, [shouldAnimate, inView, text, speed, delay]);

  if (!shouldAnimate) {
    return createElement(as, { className }, text);
  }

  return createElement(
    as,
    { ref, className, "aria-label": text },
    <span aria-hidden>{display}</span>,
    keepCursor && !done ? (
      <m.span
        aria-hidden
        className="ml-0.5 inline-block w-[2px] bg-current align-[-0.1em]"
        style={{ height: "0.9em" }}
        animate={{ opacity: [1, 1, 0, 0] }}
        transition={{ duration: 1, repeat: Infinity, times: [0, 0.5, 0.5, 1], ease: "linear" }}
      />
    ) : null,
  );
}
