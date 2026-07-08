"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { useMarketingCopy } from "@/components/marketing/LanguageProvider";
import { GROWTH_PATHS, type PillarId } from "@/lib/growth-paths";
import { PILLARS, pillarShortName } from "@/lib/pillars";

import { PathCard } from "./PathCard";

/**
 * Filtro dinámico de rutas por dimensión (fuente única `GROWTH_PATHS`, la misma
 * del catálogo /paths). Vive en /perspectivas (web-v2-14). El heading lo pone el
 * hero de la página; acá solo van los pills + la grilla filtrada en vivo.
 */
/** @deprecated Sin consumidores desde web-v3-11: /perspectivas ahora usa PerspectivasFilter (content types CMS). */
export function FeaturedPaths() {
  const c = useMarketingCopy();
  const [pillar, setPillar] = useState<PillarId | "all">("all");

  const shown = useMemo(
    () => (pillar === "all" ? GROWTH_PATHS : GROWTH_PATHS.filter((p) => p.pillar === pillar)),
    [pillar],
  );

  const chip = (active: boolean) =>
    `px-3.5 py-2 rounded-full text-[13px] font-medium cursor-pointer transition-colors border ${
      active
        ? "bg-hg-ink text-hg-cream border-transparent"
        : "bg-transparent text-hg-charcoal border-border-strong hover:bg-bg-sunken"
    }`;

  return (
    <section className="max-w-marketing mx-auto px-8 pb-32">
      <div className="mb-10 flex flex-wrap gap-2">
        <button type="button" className={chip(pillar === "all")} onClick={() => setPillar("all")}>
          Todas
        </button>
        {PILLARS.map((p) => (
          <button
            key={p.id}
            type="button"
            className={chip(pillar === p.id)}
            onClick={() => setPillar(p.id)}
          >
            {pillarShortName(p.id)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {shown.map((p) => (
          <PathCard key={p.title} path={p} cohortLabel={c.paths.cohort} />
        ))}
      </div>

      <div className="mt-10">
        <Link href="/paths" className="font-semibold text-primary hover:text-primary-hover">
          Ver todas las rutas →
        </Link>
      </div>
    </section>
  );
}
