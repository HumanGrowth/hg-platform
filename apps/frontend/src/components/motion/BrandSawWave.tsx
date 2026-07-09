"use client";

import { m, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

import { useShouldAnimate } from "@/lib/motion/useShouldAnimate";

interface BrandSawWaveProps {
  /** Ancho en px. */
  width: number;
  /** Alto/amplitud en px. */
  height?: number;
  /** Cantidad de dientes. */
  teeth?: number;
  thickness?: number;
  /** Rotación en grados. */
  rotation?: number;
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
  /** Color del trazo (default var(--hg-gold)). */
  color?: string;
  opacity?: number;
  /** Factor de parallax · 0.1-0.2 sutil. */
  speed?: number;
  zIndex?: number;
  className?: string;
}

/** Genera el path SVG de una onda dentada /\/\/\ (patrón inspirado en mosaic.svg). */
export function sawtoothPath(width: number, height: number, teeth: number): string {
  const step = width / teeth;
  const half = step / 2;
  let d = `M 0 ${height / 2}`;
  for (let i = 0; i < teeth; i++) {
    const x1 = i * step + half;
    const x2 = (i + 1) * step;
    d += ` L ${x1} 0 L ${x2} ${height / 2}`;
  }
  return d;
}

/**
 * Reemplaza a <BrandLine/> (motion-v2-03 · decisión C): onda dentada SVG que
 * se dibuja progresivamente al scrollear (draw-on-scroll con pathLength,
 * requiere el feature bundle domAnimation — ya activo desde PR #18, sin costo
 * de bundle adicional). Conserva el parallax vertical del BrandLine original.
 * aria-hidden + pointer-events:none. Reduced motion → trazo completo estático.
 */
export function BrandSawWave({
  width,
  height = 24,
  teeth = 8,
  thickness = 2,
  rotation = 0,
  top,
  left,
  right,
  bottom,
  color = "var(--hg-gold)",
  opacity = 0.5,
  speed = 0.1,
  zIndex = -1,
  className,
}: BrandSawWaveProps) {
  const shouldAnimate = useShouldAnimate();
  const ref = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  // Draw-on-scroll: se completa en la primera mitad del recorrido del elemento.
  const pathLength = useTransform(scrollYProgress, [0, 0.5], [0, 1]);
  const parallaxY = useTransform(scrollYProgress, [0, 1], [`${-speed * 80}px`, `${speed * 80}px`]);

  const path = sawtoothPath(width, height, teeth);

  const wrapperStyle: React.CSSProperties = {
    position: "absolute",
    width: `${width}px`,
    height: `${height}px`,
    transform: `rotate(${rotation}deg)`,
    transformOrigin: "center",
    top,
    left,
    right,
    bottom,
    zIndex,
    pointerEvents: "none",
    opacity,
  };

  if (!shouldAnimate) {
    return (
      <div aria-hidden className={className} style={wrapperStyle} ref={ref}>
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
          <path d={path} stroke={color} strokeWidth={thickness} fill="none" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  return (
    <m.div aria-hidden className={className} ref={ref} style={{ ...wrapperStyle, y: parallaxY }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <m.path
          d={path}
          stroke={color}
          strokeWidth={thickness}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ pathLength }}
        />
      </svg>
    </m.div>
  );
}
