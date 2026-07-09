"use client";

import { animate, m, useInView, useMotionValue, useScroll, useTransform } from "framer-motion";
import { useEffect, useRef } from "react";

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
  /** Factor de parallax · 0.1-0.2 sutil (decisión D del v1). */
  speed?: number;
  /** Amplitud de la oscilación flotante en px (decisión B, motion-v2). */
  floatAmplitude?: number;
  /** Duración de 1 ciclo de oscilación en segundos. */
  floatDuration?: number;
  zIndex?: number;
  className?: string;
}

/**
 * Círculo decorativo de marca (motion-v2-02): parallax de scroll + oscilación
 * vertical continua (float), compuestos en un solo motion value con
 * useTransform([a, b], combiner) — no hace falta anidar divs ni usar
 * useMotionTemplate. El float usa la API imperativa `animate()` sobre un
 * motion value (loop 0 → -amplitud → 0, repeat Infinity); no es una feature
 * de gesto de `m.*`, así que no infla el bundle de LazyMotion domAnimation.
 * aria-hidden + pointer-events:none. Estático bajo reduced motion (sin loop).
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
  floatAmplitude = 8,
  floatDuration = 6,
  zIndex = -1,
  className,
}: BrandCircleProps) {
  const shouldAnimate = useShouldAnimate();
  const ref = useRef<HTMLDivElement>(null);
  // Sin `once`: el loop arranca al entrar en viewport y se pausa al salir —
  // evita gastar el hilo principal en círculos fuera de pantalla (perf fix
  // motion-v2-07: 3 loops perpetuos desde el mount bajaban Lighthouse -4).
  const inView = useInView(ref, { margin: "0px 0px 200px 0px" });

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  // Parallax: de -speed*100 a +speed*100 (números, se combinan con el float
  // value abajo antes de convertirse a string px).
  const parallaxY = useTransform(scrollYProgress, [0, 1], [-speed * 100, speed * 100]);
  const floatY = useMotionValue(0);

  useEffect(() => {
    if (!shouldAnimate || !inView) return;
    const controls = animate(floatY, [0, -floatAmplitude, 0], {
      duration: floatDuration,
      repeat: Infinity,
      ease: "easeInOut",
    });
    return () => controls.stop();
  }, [shouldAnimate, inView, floatY, floatAmplitude, floatDuration]);

  const y = useTransform([parallaxY, floatY], ([p, f]: number[]) => `${p + f}px`);

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

  return <m.div aria-hidden className={className} style={{ ...style, y }} ref={ref} />;
}
