"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

import { useShouldAnimate } from "@/lib/motion/useShouldAnimate";

interface BrandCircleProps {
  /** Diámetro en px. */
  size: number;
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
  /** Color de relleno (default var(--hg-green-100)). */
  color?: string;
  opacity?: number;
  /** Factor de parallax · 0.1-0.2 sutil (decisión D). */
  speed?: number;
  zIndex?: number;
  className?: string;
}

/**
 * Círculo decorativo de marca con parallax leve (motion-03). Formas extraídas
 * del patrón geométrico del Brand Book (decisión E). aria-hidden +
 * pointer-events:none — nunca interfiere con el contenido.
 */
export function BrandCircle({
  size,
  top,
  left,
  right,
  bottom,
  color = "var(--hg-green-100)",
  opacity = 0.5,
  speed = 0.15,
  zIndex = -1,
  className,
}: BrandCircleProps) {
  const shouldAnimate = useShouldAnimate();
  const ref = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  // Parallax: de -speed*100px a +speed*100px según el scroll del elemento.
  const y = useTransform(scrollYProgress, [0, 1], [`${-speed * 100}px`, `${speed * 100}px`]);

  const style: React.CSSProperties = {
    position: "absolute",
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: "50%",
    background: color,
    opacity,
    top,
    left,
    right,
    bottom,
    zIndex,
    pointerEvents: "none",
  };

  if (!shouldAnimate) {
    return <div aria-hidden className={className} style={style} ref={ref} />;
  }

  return <motion.div aria-hidden className={className} style={{ ...style, y }} ref={ref} />;
}
