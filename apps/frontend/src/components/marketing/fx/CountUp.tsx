"use client";

import { useEffect, useState } from "react";

import { useShouldAnimate } from "@/lib/motion/useShouldAnimate";

import { useInView } from "./useInView";

/** Número que cuenta de 0 al valor final al entrar al viewport. */
export function CountUp({
  to,
  suffix = "",
  duration = 1400,
  className,
}: {
  to: number;
  suffix?: string;
  duration?: number;
  className?: string;
}) {
  const { ref, inView } = useInView<HTMLSpanElement>("0px 0px -10% 0px");
  const animate = useShouldAnimate();
  const [n, setN] = useState(animate ? 0 : to);

  useEffect(() => {
    if (!inView || !animate) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, animate, to, duration]);

  return (
    <span ref={ref} className={className} aria-label={`${to}${suffix}`}>
      <span aria-hidden>
        {n}
        {suffix}
      </span>
    </span>
  );
}
