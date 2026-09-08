"use client";

import { ArrowRight, Compass, RefreshCw, Target } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import * as React from "react";

import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Progress } from "@/components/ui/progress";
import { getDimensionInsight, type DimensionInsight } from "@/lib/dimension-insights";
import type { Dimension } from "@/lib/dimensions";
import type { DimensionResult } from "@/lib/types";
import { cn, formatRelativeTime } from "@/lib/utils";

/** Count-up de 0 al valor final (respeta reduced-motion → salta al final). */
function useCountUp(target: number, durationMs = 900): number {
  const [value, setValue] = React.useState(0);
  React.useEffect(() => {
    if (typeof window === "undefined") {
      setValue(target);
      return;
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setValue(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setValue(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);
  return value;
}

/**
 * "Tu estado actual" de una dimensión: el número, qué significa el estado en el
 * que estás, qué dice tu score dentro de ese estado, y qué hacer ahora.
 *
 * El texto sale del provider `getDimensionInsight` (hoy templates en JSON,
 * mañana IA) — este componente no conoce el contenido, solo su forma.
 */
export function DimensionStateCard({
  dimension,
  score,
  results,
  result,
}: {
  dimension: Dimension;
  score: number;
  /** Todos los resultados del assessment (Estabilidad usa dos). */
  results: DimensionResult[];
  /** Resultado principal de esta dimensión — para la fecha de la última evaluación. */
  result: DimensionResult | undefined;
}) {
  const animated = useCountUp(score);
  const [insight, setInsight] = React.useState<DimensionInsight | null>(null);

  React.useEffect(() => {
    let active = true;
    void getDimensionInsight({ dimension, results, score }).then((i) => {
      if (active) setInsight(i);
    });
    return () => {
      active = false;
    };
  }, [dimension, results, score]);

  const evaluated = Boolean(result);

  return (
    <Card className="mt-6 flex flex-col gap-6 bg-bg-raised">
      {/* Score + estado + CTA */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Eyebrow>Tu estado actual</Eyebrow>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-mono text-5xl font-semibold tabular-nums text-fg">{animated}</span>
            <span className="text-lg text-fg-muted">/ 100</span>
          </div>
          {insight && (
            <p
              className={cn(
                "mt-1 text-sm font-semibold",
                insight.evaluated ? "text-primary" : "text-fg-muted",
              )}
            >
              {insight.headline}
            </p>
          )}
        </div>
        <Link
          href={`/onboarding/detail/${dimension.assessmentDimension}` as Route}
          className={cn(buttonVariants({ size: "lg" }), "shrink-0 self-start")}
        >
          <RefreshCw size={18} strokeWidth={1.75} />
          {evaluated ? "Reevaluar" : "Evaluar"}
        </Link>
      </div>

      <Progress value={score} label={`Progreso ${dimension.name}`} />

      {insight && (
        <div className="flex flex-col gap-5">
          {/* Qué significa tu estado */}
          {insight.meaning && (
            <section>
              <h3 className="font-sans text-sm font-semibold text-fg">Qué significa</h3>
              <p className="mt-1 max-w-prose text-sm text-fg-muted">{insight.meaning}</p>
            </section>
          )}

          {/* Estabilidad: dos instrumentos, dos estados. */}
          {insight.parts.length > 0 && (
            <section className="grid gap-3 sm:grid-cols-2">
              {insight.parts.map((p) => (
                <div key={p.code} className="rounded-lg bg-bg-sunken px-4 py-3">
                  <p className="font-sans text-sm font-semibold text-fg">
                    {p.name} · <span className="text-primary">{p.stateLabel}</span>
                  </p>
                  {p.meaning && <p className="mt-1 text-sm text-fg-muted">{p.meaning}</p>}
                </div>
              ))}
            </section>
          )}

          {/* Qué dice tu score dentro de ese estado */}
          {insight.scoreInsight && (
            <section>
              <h3 className="font-sans text-sm font-semibold text-fg">Tu score en contexto</h3>
              <p className="mt-1 max-w-prose text-sm text-fg-muted">{insight.scoreInsight}</p>
            </section>
          )}

          {/* Lo que ya calcula el motor de assessment (Carrera: cuello de botella). */}
          {insight.suggestedNextStep && (
            <section className="flex items-start gap-3 rounded-lg bg-bg-sunken px-4 py-3">
              <Target size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-primary" aria-hidden />
              <div className="min-w-0">
                <h3 className="font-sans text-sm font-semibold text-fg">Tu foco ahora</h3>
                <p className="mt-0.5 text-sm text-fg-muted">{insight.suggestedNextStep}</p>
              </div>
            </section>
          )}

          {/* Consejos concretos */}
          {insight.tips.length > 0 && (
            <section>
              <h3 className="font-sans text-sm font-semibold text-fg">Tus próximos pasos</h3>
              <ul className="mt-2 flex flex-col gap-2">
                {insight.tips.map((tip) => (
                  <li key={tip} className="flex items-start gap-2 text-sm text-fg-muted">
                    <Compass
                      size={15}
                      strokeWidth={1.75}
                      className="mt-0.5 shrink-0 text-fg-subtle"
                      aria-hidden
                    />
                    <span className="min-w-0">{tip}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        {result ? (
          <p className="text-xs text-fg-muted">
            Última evaluación · {formatRelativeTime(result.derived_at)}
          </p>
        ) : (
          <span />
        )}
        <Link
          href={"/path" as Route}
          className="inline-flex items-center gap-1 font-sans text-sm font-semibold text-primary hover:underline"
        >
          Ver mi ruta
          <ArrowRight size={16} strokeWidth={1.75} />
        </Link>
      </div>
    </Card>
  );
}
