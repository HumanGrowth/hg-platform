"use client";

import * as React from "react";

import { apiSaveProgress } from "@/lib/api";
import type { CourseProgressPayload } from "@/lib/types";

/**
 * Acumula el último payload de progreso y lo envía con `apiSaveProgress` a lo
 * sumo cada `intervalMs` (default 5s). Hace flush inmediato si el watch_pct
 * cambió > 10 puntos (saltos grandes) y un flush final al desmontar.
 * Devuelve `report` (bufferea) y `flush` (envía ya) — p.ej. para beforeunload.
 */
export function useThrottledProgress(slug: string, intervalMs = 5000) {
  const latest = React.useRef<CourseProgressPayload | null>(null);
  const lastSentPct = React.useRef<number>(Number.NEGATIVE_INFINITY);

  const flush = React.useCallback(() => {
    const payload = latest.current;
    if (!payload) return;
    latest.current = null;
    lastSentPct.current = payload.watch_pct;
    void apiSaveProgress(slug, payload).catch(() => {});
  }, [slug]);

  const report = React.useCallback(
    (data: CourseProgressPayload) => {
      latest.current = data;
      if (Math.abs(data.watch_pct - lastSentPct.current) > 10) flush();
    },
    [flush],
  );

  React.useEffect(() => {
    const id = setInterval(flush, intervalMs);
    return () => {
      clearInterval(id);
      flush();
    };
  }, [flush, intervalMs]);

  return { report, flush };
}
