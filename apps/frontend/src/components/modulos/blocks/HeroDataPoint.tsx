"use client";

import * as React from "react";

import { useShouldAnimate } from "@/lib/motion/useShouldAnimate";
import { dimensionStyle } from "@/lib/dimension-styles";

interface Props {
  value: string;
  label: string;
  dimensionCode?: string;
  /** Plantilla Stat: reemplaza tamaño+color del número (default = look histórico,
   * color inline del pilar). */
  valueClassName?: string;
  /** Plantilla Stat: reemplaza el estilo del label (default = `text-fg-muted`). */
  labelClassName?: string;
}

/** Extrae el prefijo numérico de un value ("23%" → 23, "3 de cada 4" → 3). */
function leadingNumber(value: string): number | null {
  const m = /^(\d+(?:[.,]\d+)?)/.exec(value.trim());
  if (!m) return null;
  const n = Number.parseFloat(m[1].replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/**
 * Data-point destacado de un `text_evidence` (Sprint UI · TASK 5): número grande
 * en font display + color del pilar, con counter animation (0 → target). El
 * sufijo no numérico ("%", "x", " de cada 4") se mantiene fijo.
 */
export function HeroDataPoint({ value, label, dimensionCode, valueClassName, labelClassName }: Props) {
  const shouldAnimate = useShouldAnimate();
  const color = dimensionStyle(dimensionCode).glow;
  const target = leadingNumber(value);
  const isInteger = target !== null && Number.isInteger(target);

  const [display, setDisplay] = React.useState(() => (shouldAnimate && target !== null ? 0 : target));

  React.useEffect(() => {
    if (!shouldAnimate || target === null) {
      setDisplay(target);
      return;
    }
    const duration = 800;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setDisplay(target * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else setDisplay(target);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [shouldAnimate, target]);

  // Reconstruye el value mostrando el número animado + el sufijo original.
  const rendered =
    target === null || display === null
      ? value
      : value.replace(
          /^(\d+(?:[.,]\d+)?)/,
          isInteger ? String(Math.round(display)) : display.toFixed(1).replace(".", ","),
        );

  return (
    <div className="flex flex-col gap-1 py-2">
      <span
        className={valueClassName ?? "font-display text-6xl leading-none sm:text-7xl"}
        style={valueClassName ? undefined : { color }}
        aria-label={`${value} — ${label}`}
      >
        {rendered}
      </span>
      <span className={labelClassName ?? "font-heading text-sm font-medium text-fg-muted"}>{label}</span>
    </div>
  );
}
