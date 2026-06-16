"use client";

import { Radar, type RadarValues } from "./Radar";

/** Versión 120×120 sin etiquetas — para sidebar y Home. */
export function MiniRadar({ values }: { values: RadarValues }) {
  const hasData = Object.keys(values).length > 0;
  return <Radar values={values} state={hasData ? "complete" : "empty"} size="mini" />;
}
