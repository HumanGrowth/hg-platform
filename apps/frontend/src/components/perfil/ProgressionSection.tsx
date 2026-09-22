"use client";

/**
 * "Tu nivel por dimensión" (TASK 6): nivel actual + completion 0-100 (mezcla de
 * aprendizaje + assessment; el feedback del manager es un gate de aprobación del
 * badge, no pesa en el %) por dimensión, con lo que falta para el próximo badge.
 * Lee GET /me/progression (dimension_level_progress).
 *
 * Es LA definición de "% de dimensión" de la app: /perfil la muestra al
 * colaborador y /team/[id] al manager (misma fuente, ver `ProgressionList`).
 */
import * as React from "react";

import { HgBadge } from "@/components/badges/HgBadge";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { apiGetProgression } from "@/lib/api";
import { levelBadgeMeta } from "@/lib/badge-kit/dimension-adapter";
import { dimensionShortName } from "@/lib/dimension-styles";
import type { DimensionProgression } from "@/lib/types";

export function ProgressionSection() {
  const [rows, setRows] = React.useState<DimensionProgression[] | null>(null);

  React.useEffect(() => {
    apiGetProgression()
      .then(setRows)
      .catch(() => setRows([]));
  }, []);

  if (rows === null) return null;

  return (
    <section className="mt-12" id="mi-nivel">
      <Eyebrow>Tu nivel por dimensión</Eyebrow>
      <p className="mt-1 text-sm text-fg-muted">
        Cada dimensión avanza por niveles. El % combina tu aprendizaje y tu evaluación; al llegar
        al 100% (y con la aprobación de tu manager, si tu empresa la usa) ganás el badge de ese
        nivel.
      </p>
      <ProgressionList rows={rows} />
    </section>
  );
}

/**
 * Tarjetas de nivel por dimensión. Solo dimensiones con algún avance (evita 6
 * barras en 0 para usuarios nuevos). Presentacional: la usan /perfil (propia) y
 * /team/[id] (vista del manager).
 */
export function ProgressionList({
  rows,
  perspective = "self",
}: {
  rows: DimensionProgression[];
  perspective?: "self" | "manager";
}) {
  const visible = rows.filter((r) => r.current_completion_pct > 0);
  if (visible.length === 0) return null;
  const learningOnly = perspective === "manager" && visible.some((r) => r.includes_assessment === false);

  return (
    <>
      {learningOnly && (
        <p className="mt-2 text-xs text-fg-subtle">
          Solo se muestra el avance de aprendizaje: esta persona no autorizó compartir su evaluación.
        </p>
      )}
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
                <span className="flex items-center gap-2 font-sans text-sm font-semibold text-fg">
                  <HgBadge
                    dimension={r.dimension_code}
                    level={r.current_level_name ?? undefined}
                    rank={levelBadgeMeta(r.current_level_code ?? undefined).rank}
                    state="earned"
                    size={28}
                    compact
                  />
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
                  : `Falta ${Math.round(remaining)}% para el badge ${r.current_level_name ?? ""}.`}
              </p>
            </Card>
          );
        })}
      </div>
    </>
  );
}
