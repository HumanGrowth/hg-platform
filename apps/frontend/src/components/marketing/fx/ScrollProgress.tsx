"use client";

import { useEffect, useRef } from "react";

import { DIM_COLORS } from "./dim-colors";

/** Barra fina de progreso de lectura, con el degradado de las 6 dimensiones. */
export function ScrollProgress() {
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const h = document.documentElement.scrollHeight - window.innerHeight;
      const p = h > 0 ? Math.min(1, window.scrollY / h) : 0;
      if (bar.current) bar.current.style.transform = `scaleX(${p})`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[70] h-[3px]">
      <div
        ref={bar}
        className="h-full origin-left"
        style={{
          transform: "scaleX(0)",
          background: `linear-gradient(90deg, ${DIM_COLORS.join(", ")})`,
        }}
      />
    </div>
  );
}
