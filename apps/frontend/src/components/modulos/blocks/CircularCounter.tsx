"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

interface Props {
  /** caracteres escritos */
  current: number;
  /** mínimo requerido — el anillo se llena hasta acá */
  min: number;
  reached: boolean;
  size?: number;
}

/**
 * Contador circular de progreso de escritura (Sprint UI · TASK 8). Un anillo
 * SVG se llena de 0 → `min`; al llegar cambia a verde éxito. El número del
 * centro es el conteo actual. Sin animación propia (la transición del stroke es
 * CSS y suave) → reduced-motion safe.
 */
export function CircularCounter({ current, min, reached, size = 44 }: Props) {
  const stroke = 3;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = min > 0 ? Math.min(1, current / min) : 1;
  const offset = circ * (1 - pct);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-border" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          className={cn("transition-[stroke-dashoffset] duration-300 ease-out", reached ? "stroke-success" : "stroke-hg-amber")}
        />
      </svg>
      <span
        className={cn(
          "absolute inset-0 flex items-center justify-center font-sans text-xs font-semibold tabular-nums",
          reached ? "text-success" : "text-fg-muted",
        )}
      >
        {current}
      </span>
    </div>
  );
}
