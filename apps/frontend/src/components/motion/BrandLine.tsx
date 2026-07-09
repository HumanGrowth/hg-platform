"use client";

import { m, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

import { useShouldAnimate } from "@/lib/motion/useShouldAnimate";

interface BrandLineProps {
  /** Largo en px. */
  length: number;
  thickness?: number;
  /** Rotación en grados. */
  rotation?: number;
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
  /** Color (default var(--hg-gold)). */
  color?: string;
  opacity?: number;
  /** Factor de parallax · 0.1-0.2 sutil (decisión D). */
  speed?: number;
  zIndex?: number;
  className?: string;
}

/**
 * @deprecated use BrandSawWave — reemplazada en motion-v2-03 (decisión C).
 * Se mantiene en el árbol hasta el cleanup final (motion-v2-07); sin
 * callsites activos tras la migración.
 *
 * Línea decorativa de marca con parallax leve (motion-04). En el modo animado
 * la rotación se pasa como motion value (rotate) para componer con el parallax
 * (y) sin pisar el transform. aria-hidden + pointer-events:none.
 */
export function BrandLine({
  length,
  thickness = 2,
  rotation = 0,
  top,
  left,
  right,
  bottom,
  color = "var(--hg-gold)",
  opacity = 0.3,
  speed = 0.1,
  zIndex = -1,
  className,
}: BrandLineProps) {
  const shouldAnimate = useShouldAnimate();
  const ref = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], [`${-speed * 80}px`, `${speed * 80}px`]);

  const base: React.CSSProperties = {
    position: "absolute",
    width: `${length}px`,
    height: `${thickness}px`,
    background: color,
    transformOrigin: "center",
    opacity,
    top,
    left,
    right,
    bottom,
    zIndex,
    pointerEvents: "none",
  };

  if (!shouldAnimate) {
    return (
      <div
        aria-hidden
        className={className}
        style={{ ...base, transform: `rotate(${rotation}deg)` }}
        ref={ref}
      />
    );
  }

  return (
    <m.div
      aria-hidden
      className={className}
      style={{ ...base, y, rotate: rotation }}
      ref={ref}
    />
  );
}
