"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { GROWTH_PATHS, type PillarId } from "@/lib/growth-paths";
import { getCopy } from "@/lib/i18n";
import { PILLARS, pillarShortName } from "@/lib/pillars";

import { PathCard } from "./PathCard";

/**
 * "Nuevo este trimestre" (home). Los pills filtran las mismas rutas del catálogo
 * de "Rutas de Crecimiento" (fuente única `GROWTH_PATHS`) por dimensión, y la
 * grilla se recompone en vivo. Muestra hasta 3 rutas como teaser.
 */
export function FeaturedPaths() {
  const c = getCopy("es");
  const [pillar, setPillar] = useState<PillarId | "all">("all");

  const shown = useMemo(() => {
    const list =
      pillar === "all" ? GROWTH_PATHS : GROWTH_PATHS.filter((p) => p.pillar === pillar);
    return list.slice(0, 3);
  }, [pillar]);

  const chip = (active: boolean) =>
    `px-3.5 py-2 rounded-full text-[13px] font-medium cursor-pointer transition-colors border ${
      active
        ? "bg-hg-ink text-hg-cream border-transparent"
        : "bg-transparent text-hg-charcoal border-border-strong hover:bg-bg-sunken"
    }`;

  return (
    <section className="max-w-marketing mx-auto px-8 py-32">
      <div className="flex items-end justify-between mb-12 flex-wrap gap-4">
        <h2 className="display m-0 text-[40px] sm:text-[48px] lg:text-[56px]">{c.paths.heading}</h2>
        <div className="flex gap-2 flex-wrap">
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {shown.map((p, i) => (
          <PathCard key={p.title} path={{ ...p, dark: i === 1 }} cohortLabel={c.paths.cohort} />
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
