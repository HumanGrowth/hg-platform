"use client";

import { Radar } from "./Radar";
import type { RadarValues } from "./radar-model";

/** Versión 120×120 sin etiquetas — para sidebar y Home. */
export function MiniRadar({ values }: { values: RadarValues }) {
  const hasData = Object.keys(values).length > 0;
  const label = hasData
    ? "Tu radar con 6 dimensiones de crecimiento"
    : "Tu radar — todavía sin datos de evaluación";
  return (
    <div role="img" aria-label={label}>
      <Radar values={values} state={hasData ? "complete" : "empty"} size="mini" />
    </div>
  );
}
