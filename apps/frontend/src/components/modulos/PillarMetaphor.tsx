import * as React from "react";

import { dimensionToPillar } from "@/lib/pillars";

/**
 * Ilustración-metáfora line-art por pilar (Sprint UI · TASK 10). Una por
 * dimensión, en `currentColor` (el color lo pone el contenedor con el hue del
 * pilar). Decorativa → `aria-hidden`. 120×120, stroke redondeado.
 */
const PATHS: Record<string, React.ReactNode> = {
  // P1 · Carrera e impacto → cohete (ascenso)
  P1: (
    <>
      <path d="M60 16c12 15 12 45 0 60-12-15-12-45 0-60Z" />
      <circle cx="60" cy="42" r="7" />
      <path d="M48 62 38 82l14-8M72 62l10 20-14-8" />
      <path d="M55 80q5 14 10 0" />
    </>
  ),
  // P2 · Propósito y significado → estrella (norte)
  P2: (
    <path d="M60 24 68.2 46.7 92.3 47.5 73.3 62.3 80 85.5 60 72 40 85.5 46.7 62.3 27.7 47.5 51.8 46.7Z" />
  ),
  // P3 · Relaciones y conexión → dos círculos enlazados
  P3: (
    <>
      <circle cx="46" cy="60" r="20" />
      <circle cx="74" cy="60" r="20" />
    </>
  ),
  // P4 · Salud y bienestar → brote
  P4: (
    <>
      <path d="M42 92q18-8 36 0" />
      <path d="M60 90V52" />
      <path d="M60 68c-14 0-18-12-18-18 10 0 18 6 18 16Z" />
      <path d="M60 60c14 0 18-12 18-18-10 0-18 6-18 16Z" />
    </>
  ),
  // P5 · Paz interior y claridad → ondas concéntricas
  P5: (
    <>
      <circle cx="60" cy="58" r="8" />
      <circle cx="60" cy="58" r="20" />
      <circle cx="60" cy="58" r="32" />
    </>
  ),
  // P6 · Estabilidad emocional y material → balanza
  P6: (
    <>
      <path d="M60 28v56" />
      <path d="M46 90h28" />
      <path d="M34 44h52" />
      <path d="M34 44 26 62h16Z" />
      <path d="M86 44 78 62h16Z" />
      <path d="M24 62q10 10 20 0M76 62q10 10 20 0" />
    </>
  ),
};

/**
 * Sólo los trazos de la metáfora (sin el `<svg>` contenedor) — para embeber la
 * metáfora dentro de otro SVG, ej. los vértices del radar (Sprint Tarde · TASK 6).
 */
export function PillarMetaphorPaths({ code }: { code: string }) {
  return <>{PATHS[dimensionToPillar(code)] ?? PATHS.P3}</>;
}

export function PillarMetaphor({ code, className }: { code: string; className?: string }) {
  const paths = PATHS[dimensionToPillar(code)] ?? PATHS.P3;
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      {paths}
    </svg>
  );
}
