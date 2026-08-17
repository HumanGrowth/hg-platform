"use client";

/**
 * "Tu nivel por dimensión" (TASK 6): nivel actual + completion 0-100 (mezcla de
 * aprendizaje + assessment) por dimensión, con lo que falta para el próximo badge.
 * Lee GET /me/progression (dimension_level_progress).
 */
import * as React from "react";

import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { apiGetProgression } from "@/lib/api";
import { dimensionShortName } from "@/lib/dimension-styles";
import type { DimensionProgression } from "@/lib/types";

export function ProgressionSection() {
  const [rows, setRows] = React.useState<DimensionProgression[] | null>(null);

  React.useEffect(() => {
    apiGetProgression()
      .then(setRows)
      .catch(() => setRows([]));
  }, []);

  // Solo dimensiones con algún avance (evita 6 barras en 0 para users nuevos).
  const visible = (rows ?? []).filter((r) => r.current_completion_pct > 0);
  if (rows === null || visible.length === 0) return null;

  return (
    <section className="mt-12" id="mi-nivel">
      <Eyebrow>Tu nivel por dimensión</Eyebrow>
      <p className="mt-1 text-sm text-fg-muted">
        Cada dimensión avanza por niveles. El % combina tu aprendizaje y tu evaluación; al llegar al
        100% ganás el badge de ese nivel.
      </p>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {visible.map((r) => {
          const pct = Math.min(r.current_completion_pct, r.current_unlock_threshold);
          const ratio = r.current_unlock_threshold
            ? Math.round((pct / r.current_unlock_threshold) * 100)
            : 0;
          const remaining = Math.max(r.current_unlock_threshold - r.current_completion_pct, 0);
          const allEarned = r.levels.every((l) => l.earned);
          return (
            <Card key={r.dimension_code} className="flex flex-col gap-2 bg-bg-raised">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-sans text-sm font-semibold text-fg">
                  {dimensionShortName(r.dimension_code)}
                </span>
                <span className="text-xs text-fg-muted">
                  {r.current_level_name ?? "—"} · {Math.round(r.current_completion_pct)}%
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-bg-sunken">
                <div
                  className="h-full rounded-full bg-primary transition-[width]"
                  style={{ width: `${ratio}%` }}
                />
              </div>
              <p className="text-xs text-fg-subtle">
                {allEarned
                  ? "Nivel máximo alcanzado 🎉"
                  : `Te falta ${Math.round(remaining)}% para el badge ${r.current_level_name ?? ""}.`}
              </p>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
