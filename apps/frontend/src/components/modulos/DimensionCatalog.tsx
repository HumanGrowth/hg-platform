"use client";

import * as React from "react";

import { UnitCardCompact } from "@/components/modulos/UnitCardCompact";
import { Eyebrow } from "@/components/ui/eyebrow";
import { HexIcon } from "@/components/ui/hex-icon";
import { apiListModulosByDimension } from "@/lib/api";
import { DIMENSIONS, type DimensionMeta } from "@/lib/modulos";
import { subPillarName } from "@/lib/dimension-styles";
import type { LearningUnitFeedItem } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Agrupa units por `pillar_number` (P1, P2, …) preservando el orden de llegada. */
function groupByDimension(units: LearningUnitFeedItem[]): Map<number, LearningUnitFeedItem[]> {
  const groups = new Map<number, LearningUnitFeedItem[]>();
  for (const u of units) {
    const key = u.pillar_number ?? 0;
    const bucket = groups.get(key) ?? [];
    if (bucket.length === 0) groups.set(key, bucket);
    bucket.push(u);
  }
  return new Map([...groups.entries()].sort(([a], [b]) => a - b));
}

/**
 * Catálogo por Dimensión → Pilar → Unidades (TASK 1 · pulido). Master-detail:
 * las dimensiones en una columna a la izquierda; al elegir uno, sus módulos se
 * muestran a la derecha (en mobile: pilares como fila arriba, módulos debajo).
 * Hoy solo existe la dimensión CP; es extensible vía el registro DIMENSIONS.
 */
export function DimensionCatalog() {
  const [byDimension, setByDimension] = React.useState<Record<string, LearningUnitFeedItem[]>>({});
  const [status, setStatus] = React.useState<"loading" | "ok">("loading");

  React.useEffect(() => {
    let active = true;
    Promise.all(
      DIMENSIONS.map((d) => apiListModulosByDimension(d.pillar, undefined, 50).catch(() => [])),
    ).then((results) => {
      if (!active) return;
      const map: Record<string, LearningUnitFeedItem[]> = {};
      DIMENSIONS.forEach((d, i) => (map[d.code] = results[i]));
      setByDimension(map);
      setStatus("ok");
    });
    return () => {
      active = false;
    };
  }, []);

  if (status === "loading") return null; // el hero/feed ya muestra su propio loading

  const dimensionsWithUnits = DIMENSIONS.filter((d) => (byDimension[d.code]?.length ?? 0) > 0);
  if (dimensionsWithUnits.length === 0) return null;

  return (
    <div className="flex flex-col gap-10">
      {dimensionsWithUnits.map((dim) => (
        <DimensionSection key={dim.code} dim={dim} units={byDimension[dim.code]} />
      ))}
    </div>
  );
}

function DimensionSection({ dim, units }: { dim: DimensionMeta; units: LearningUnitFeedItem[] }) {
  const groups = React.useMemo(() => groupByDimension(units), [units]);
  const pillars = React.useMemo(() => [...groups.keys()], [groups]);
  const [selected, setSelected] = React.useState<number>(pillars[0] ?? 0);
  const current = groups.get(selected) ?? [];

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <HexIcon pillar={dim.pillar} size={36} />
        <div>
          <Eyebrow>Dimensión</Eyebrow>
          <h2 className="font-heading text-lg font-semibold text-fg">{dim.name}</h2>
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
        {/* Pilares — fila scrollable en mobile, columna a la izq en desktop. */}
        <div
          role="tablist"
          aria-label="Pilares"
          className="flex gap-2 overflow-x-auto pb-1 sm:w-48 sm:shrink-0 sm:flex-col sm:overflow-visible sm:pb-0"
        >
          {pillars.map((p) => {
            const active = p === selected;
            return (
              <button
                key={p}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setSelected(p)}
                className={cn(
                  "flex shrink-0 items-center justify-between gap-2 rounded-md border px-3 py-2 text-left font-sans text-sm transition-colors",
                  active
                    ? "border-primary bg-hg-green-100 font-semibold text-primary"
                    : "border-border text-fg-muted hover:bg-bg-sunken",
                )}
              >
                <span>{subPillarName(groups.get(p)?.[0]?.dimension_code, p)}</span>
                <span className="rounded-full bg-bg-sunken px-1.5 text-xs tabular-nums text-fg-subtle">
                  {groups.get(p)?.length ?? 0}
                </span>
              </button>
            );
          })}
        </div>

        {/* Módulos del pilar seleccionado. */}
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          {current.map((u) => (
            <UnitCardCompact key={u.id} unit={u} />
          ))}
        </div>
      </div>
    </section>
  );
}
