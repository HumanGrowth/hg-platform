"use client";

import * as React from "react";

import type { StreakDay } from "@/lib/types";

const MONTHS_ES = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

/** "2026-06" → "jun '26". */
export function formatMonthShort(iso: string): string {
  const [y, m] = iso.split("-");
  const idx = Number(m) - 1;
  const name = MONTHS_ES[idx] ?? m;
  return `${name} '${y.slice(2)}`;
}

/** "2026-06-08" → "8 jun". */
export function formatDayShort(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return `${d.getDate()} ${MONTHS_ES[d.getMonth()]}`;
}

export interface StreakSummary {
  activeDays: number;
  longestStreak: number;
  currentStreak: number;
}

export function getStreakSummary(streak: StreakDay[]): StreakSummary {
  let longest = 0;
  let run = 0;
  let activeDays = 0;
  for (const d of streak) {
    if (d.has_activity) {
      activeDays += 1;
      run += 1;
      longest = Math.max(longest, run);
    } else {
      run = 0;
    }
  }
  // current streak = racha que termina en el último día (más reciente)
  let current = 0;
  for (let i = streak.length - 1; i >= 0; i -= 1) {
    if (streak[i].has_activity) current += 1;
    else break;
  }
  return { activeDays, longestStreak: longest, currentStreak: current };
}

// Accesibilidad / WCAG AA (verificado manualmente, jun 2026):
//   - El color NUNCA es el único portador de significado: cada widget incluye una
//     <table> sr-only con los datos exactos + tooltips con texto, y los heatmaps
//     llevan una leyenda "menos → más".
//   - Texto sobre fondos: fg (#1A1A1A) y fg-muted (warm-600) sobre cream/bg-raised
//     superan 4.5:1 (AA texto normal).
//   - Las celdas/barras de color son decorativas (los datos se leen de la tabla),
//     por lo que no requieren ratio de texto; aun así la escala mantiene saltos
//     perceptibles en escala de grises (test "achromatopsia" en DevTools).
//   - Animaciones desactivadas bajo prefers-reduced-motion (ver usePrefersReducedMotion
//     + safety net global en globals.css).
//
// Clases Tailwind literales (necesarias para que el JIT las incluya). 5 niveles
// de intensidad sobre pillar-p1 + cream-200 para "sin actividad".
const SCALE = [
  "bg-surface-sunken",
  "bg-pillar-p1/30",
  "bg-pillar-p1/50",
  "bg-pillar-p1/70",
  "bg-pillar-p1",
] as const;

/** Devuelve la clase de fondo según intensidad relativa (0..max). */
export function widgetColorScale(value: number, max: number): string {
  if (value <= 0 || max <= 0) return SCALE[0];
  const ratio = value / max;
  if (ratio <= 0.25) return SCALE[1];
  if (ratio <= 0.5) return SCALE[2];
  if (ratio <= 0.75) return SCALE[3];
  return SCALE[4];
}

/** Detecta `prefers-reduced-motion: reduce` y reacciona a cambios. */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}
