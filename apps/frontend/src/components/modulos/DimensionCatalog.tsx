"use client";

import * as React from "react";

import { UnitCardCompact } from "@/components/modulos/UnitCardCompact";
import { Eyebrow } from "@/components/ui/eyebrow";
import { HexIcon } from "@/components/ui/hex-icon";
import { apiListModulosByPillar } from "@/lib/api";
import { DIMENSIONS } from "@/lib/modulos";
import type { LearningUnitFeedItem } from "@/lib/types";

/** Agrupa units por `pillar_number` (P1, P2, …) preservando el orden de llegada. */
function groupByPillar(units: LearningUnitFeedItem[]): Map<number, LearningUnitFeedItem[]> {
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
 * Catálogo agrupado por Dimensión → Pilar → Unidades (TASK 1). Hoy solo CP.
 * Cada dimensión se carga vía by-pillar (career path del DS) y se agrupa por el
 * `pillar_number` del código Drive.
 */
export function DimensionCatalog() {
  const [byDimension, setByDimension] = React.useState<Record<string, LearningUnitFeedItem[]>>({});
  const [status, setStatus] = React.useState<"loading" | "ok">("loading");

  React.useEffect(() => {
    let active = true;
    Promise.all(
      DIMENSIONS.map((d) => apiListModulosByPillar(d.pillar, undefined, 50).catch(() => [])),
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
      {dimensionsWithUnits.map((dim) => {
        const groups = groupByPillar(byDimension[dim.code]);
        return (
          <section key={dim.code} className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <HexIcon pillar={dim.pillar} size={36} />
              <div>
                <Eyebrow>Dimensión</Eyebrow>
                <h2 className="font-heading text-lg font-semibold text-fg">{dim.name}</h2>
              </div>
            </div>
            {[...groups.entries()].map(([pillarNum, units]) => (
              <div key={pillarNum} className="flex flex-col gap-2">
                <p className="font-sans text-micro font-semibold uppercase tracking-meta text-fg-muted">
                  Pilar {pillarNum}
                </p>
                <div className="flex flex-col gap-2">
                  {units.map((u) => (
                    <UnitCardCompact key={u.id} unit={u} />
                  ))}
                </div>
              </div>
            ))}
          </section>
        );
      })}
    </div>
  );
}
