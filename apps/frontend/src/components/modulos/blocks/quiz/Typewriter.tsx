"use client";

import * as React from "react";

import { useShouldAnimate } from "@/lib/motion/useShouldAnimate";
import { cn } from "@/lib/utils";

interface Props {
  text: string;
  className?: string;
  /** ms por carácter (default 18). */
  speed?: number;
}

/**
 * Revela `text` como máquina de escribir (Sprint UI · TASK 7) para el feedback
 * del quiz. Con reduced-motion muestra el texto completo de una. El texto
 * completo se expone siempre a screen-readers (sr-only) — la capa animada es
 * puramente visual (`aria-hidden`).
 */
export function Typewriter({ text, className, speed = 18 }: Props) {
  const shouldAnimate = useShouldAnimate();
  const [count, setCount] = React.useState(() => (shouldAnimate ? 0 : text.length));

  React.useEffect(() => {
    if (!shouldAnimate) {
      setCount(text.length);
      return;
    }
    setCount(0);
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const n = Math.min(text.length, Math.floor((now - start) / speed));
      setCount(n);
      if (n < text.length) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, speed, shouldAnimate]);

  return (
    <span className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden className={cn(count < text.length && "after:animate-pulse after:content-['▍']")}>
        {text.slice(0, count)}
      </span>
    </span>
  );
}
