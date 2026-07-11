"use client";

import { BrandCircle } from "@/components/motion/BrandCircle";

interface BubbleSpec {
  size: number;
  top: string;
  left?: string;
  right?: string;
  color: string;
  opacity: number;
  speed: number;
  floatAmplitude: number;
  floatDuration: number;
}

const PALETTE = ["var(--hg-green-100)", "var(--hg-sage)", "var(--hg-gold)"] as const;

/**
 * PRNG determinístico (mulberry32): mismo output en server y cliente para un
 * `seed` dado — evita el hydration mismatch que Math.random() causaría.
 */
function mulberry32(seed: number) {
  let s = seed;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildBubbles(seed: number, count: number): BubbleSpec[] {
  const rand = mulberry32(seed);
  return Array.from({ length: count }, (_, i): BubbleSpec => {
    const fromLeft = rand() > 0.5;
    const edgeOffset = `${Math.round(-6 + rand() * 26)}%`;
    return {
      size: Math.round(14 + rand() * 34),
      top: `${Math.round(4 + rand() * 82)}%`,
      ...(fromLeft ? { left: edgeOffset } : { right: edgeOffset }),
      color: PALETTE[(seed + i) % PALETTE.length],
      opacity: 0.12 + rand() * 0.16,
      speed: 0.05 + rand() * 0.08,
      floatAmplitude: 5 + rand() * 9,
      floatDuration: 5 + rand() * 4,
    };
  });
}

interface BubbleFieldProps {
  /** Semilla determinística — usar un valor distinto por sección para variar el patrón. */
  seed: number;
  count?: number;
}

/**
 * Campo de burbujas decorativas chicas (detalle menor, no protagonista) —
 * reemplaza el círculo grande único de motion-v1/v2 en todas las secciones
 * salvo el CTA final ("Empezá hoy" conserva su círculo de firma grande, por
 * pedido explícito). Cada burbuja es un <BrandCircle/> chico con su propio
 * parallax + float, ya perf-gateado por useInView; posiciones/tamaños
 * determinísticos vía seed (sin Math.random) para que SSR y cliente coincidan.
 */
export function BubbleField({ seed, count = 4 }: BubbleFieldProps) {
  const bubbles = buildBubbles(seed, count);
  return (
    <>
      {bubbles.map((b, i) => (
        <BrandCircle key={i} {...b} />
      ))}
    </>
  );
}
