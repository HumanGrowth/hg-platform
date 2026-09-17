"use client";

import { ListChecks } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import * as React from "react";

import { apiGetMyResults } from "@/lib/api";
import { radarValuesFromResults } from "@/lib/assessment-utils";
import { getDimensionInsight, type DimensionInsight } from "@/lib/dimension-insights";
import { dimensionStyle } from "@/lib/dimension-styles";
import { DIMENSIONS, type Dimension } from "@/lib/dimensions";

/**
 * "Tus próximos pasos" — mismo lenguaje visual que el Fact del día de Inicio
 * (gradiente de marca + orbes), con los MISMOS consejos que
 * `/dimensiones/{code}` te muestra en "Tus próximos pasos" (getDimensionInsight).
 * Es la misma fuente que ve tu manager en el detalle de equipo, así que si te
 * pregunta "en qué estás enfocado", los dos están mirando lo mismo.
 */
export function NextStepsSpotlight() {
  const [entries, setEntries] = React.useState<{ dimension: Dimension; insight: DimensionInsight }[] | null>(
    null,
  );

  React.useEffect(() => {
    let alive = true;
    apiGetMyResults()
      .then(async ({ results }) => {
        if (!alive) return;
        const radar = results.length > 0 ? radarValuesFromResults(results) : {};
        const evaluated = DIMENSIONS.filter((d) =>
          results.some(
            (r) => r.dimension_code === d.assessmentDimension || r.dimension_code.startsWith(d.careerPath),
          ),
        );
        const rows = await Promise.all(
          evaluated.map(async (dimension) => ({
            dimension,
            insight: await getDimensionInsight({
              dimension,
              results,
              score: radar[dimension.careerPath] ?? 0,
            }),
          })),
        );
        if (alive) setEntries(rows.filter((r) => r.insight.tips.length > 0));
      })
      .catch(() => {
        if (alive) setEntries([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (!entries || entries.length === 0) return null;

  return (
    <section
      aria-label="Tus próximos pasos"
      className="motion-safe:animate-fade-up relative mt-8 overflow-hidden rounded-2xl border border-hg-green-700/40 bg-gradient-to-br from-hg-ink via-hg-green-700 to-hg-green p-6 text-hg-cream shadow-md sm:p-8"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full bg-hg-amber/25 blur-2xl motion-safe:animate-float"
      />
      <span
        aria-hidden
        style={{ animationDelay: "1.6s" }}
        className="pointer-events-none absolute -bottom-14 left-12 h-32 w-32 rounded-full bg-hg-gold/20 blur-2xl motion-safe:animate-float"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent motion-safe:animate-shimmer"
      />

      <div className="relative">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 font-sans text-micro font-semibold uppercase tracking-meta">
          <ListChecks size={14} strokeWidth={2} className="text-hg-amber" />
          Tus próximos pasos
        </div>
        <p className="mt-4 max-w-2xl text-balance font-display text-lg leading-snug sm:text-xl">
          A qué prestarle atención ahora, dimensión por dimensión.
        </p>
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {entries.slice(0, 4).map(({ dimension, insight }) => {
            const glow = dimensionStyle(dimension.careerPath).glow;
            return (
              <Link
                key={dimension.code}
                href={`/dimensiones/${dimension.code}` as Route}
                className="flex flex-col gap-2.5 rounded-lg border-l-[3px] bg-white/10 px-4 py-3.5 transition-colors hover:bg-white/15"
                style={{ borderLeftColor: glow }}
              >
                {/* Énfasis de dimensión: dot + label con el color del pilar,
                    separado del título (antes iban mezclados en una sola línea). */}
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className="inline-block h-2 w-2 shrink-0 rounded-full"
                    style={{ background: glow, boxShadow: `0 0 8px 0 ${glow}` }}
                  />
                  <span className="font-sans text-[11px] font-semibold uppercase tracking-meta text-hg-cream/70">
                    {dimension.short}
                  </span>
                </div>
                <p className="font-heading text-[15px] font-semibold leading-snug text-hg-cream">
                  {insight.headline}
                </p>
                {/* Acciones: lista con bullet + borde superior — separada
                    visualmente del título. */}
                <ul className="flex flex-col gap-1.5 border-t border-white/15 pt-2.5">
                  {insight.tips.slice(0, 2).map((tip) => (
                    <li key={tip} className="flex items-start gap-1.5 font-sans text-sm text-hg-cream/90">
                      <span aria-hidden className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-hg-amber" />
                      <span className="line-clamp-2">{tip}</span>
                    </li>
                  ))}
                </ul>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
