"use client";

import { ArrowRight, Compass, Lightbulb, RefreshCw, Sparkles, Target, TrendingUp } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import * as React from "react";

import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { getDimensionInsight, type DimensionInsight } from "@/lib/dimension-insights";
import { dimensionStyle } from "@/lib/dimension-styles";
import type { Dimension } from "@/lib/dimensions";
import type { DimensionResult } from "@/lib/types";
import { cn, formatRelativeTime } from "@/lib/utils";

/** Iconos de los consejos, rotando: da variedad visual sin que cada tip repita
 * el mismo pictograma. El orden no tiene significado semántico. */
const TIP_ICONS = [Compass, Lightbulb, Sparkles];

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
  const style = dimensionStyle(dimension.careerPath);

  return (
    <Card className="mt-6 flex flex-col gap-6 bg-bg-raised">
      {/* Score (anillo) + estado + CTA */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <ScoreRing score={animated} color={style.glow} />
          <div className="min-w-0">
            <Eyebrow>Tu estado actual</Eyebrow>
            {insight && (
              <p
                className={cn(
                  "mt-1 font-sans text-md font-semibold",
                  insight.evaluated ? "text-fg" : "text-fg-muted",
                )}
              >
                {insight.headline}
              </p>
            )}
          </div>
        </div>
        <Link
          href={`/onboarding/detail/${dimension.assessmentDimension}` as Route}
          className={cn(buttonVariants({ size: "lg" }), "shrink-0 self-start")}
        >
          <RefreshCw size={18} strokeWidth={1.75} />
          {evaluated ? "Reevaluar" : "Evaluar"}
        </Link>
      </div>

      {/* Escalera de estados: dónde cae tu estado en la escala completa de la
          dimensión. Estabilidad muestra las dos (resiliencia + finanzas). */}
      {insight && insight.evaluated && (
        <div className="flex flex-col gap-2">
          {insight.parts.length > 0 ? (
            insight.parts.map((p) => (
              <StateLadder
                key={p.code}
                label={p.name}
                index={p.stateIndex}
                total={p.stateTotal}
                color={style.glow}
              />
            ))
          ) : (
            <StateLadder
              label={dimension.short}
              index={insight.stateIndex}
              total={insight.stateTotal}
              color={style.glow}
            />
          )}
        </div>
      )}

      {insight && (
        <div className="flex flex-col gap-5">
          {/* Qué significa tu estado */}
          {insight.meaning && (
            <section
              className="rounded-lg border-l-[3px] px-4 py-3"
              style={{ borderColor: style.glow, background: `color-mix(in srgb, ${style.glow} 6%, transparent)` }}
            >
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
            <section className="flex items-start gap-3">
              <TrendingUp
                size={18}
                strokeWidth={1.75}
                className="mt-0.5 shrink-0"
                style={{ color: style.glow }}
                aria-hidden
              />
              <div className="min-w-0">
                <h3 className="font-sans text-sm font-semibold text-fg">Tu score en contexto</h3>
                <p className="mt-1 max-w-prose text-sm text-fg-muted">{insight.scoreInsight}</p>
              </div>
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
                {insight.tips.map((tip, i) => {
                  const TipIcon = TIP_ICONS[i % TIP_ICONS.length];
                  return (
                    <li key={tip} className="flex items-start gap-2 text-sm text-fg-muted">
                      <TipIcon
                        size={15}
                        strokeWidth={1.75}
                        className="mt-0.5 shrink-0"
                        style={{ color: style.glow }}
                        aria-hidden
                      />
                      <span className="min-w-0">{tip}</span>
                    </li>
                  );
                })}
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

// ─────────────────────────── Anillo de score ───────────────────────────

/** Anillo de progreso 0-100 con el número dentro — reemplaza el número plano
 * de antes. `color` es el glow de la dimensión (var CSS), igual que el resto
 * de la identidad visual de cada pilar. */
function ScoreRing({ score, color, size = 96 }: { score: number; color: string; size?: number }) {
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.min(100, Math.max(0, score)) / 100);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 700ms ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-2xl font-semibold tabular-nums text-fg">{score}</span>
        <span className="text-[10px] text-fg-subtle">/ 100</span>
      </div>
    </div>
  );
}

// ─────────────────────────── Escalera de estados ───────────────────────────

/** Fila de marcas — una por estado posible de la escala — con la tuya
 * resaltada. Da una referencia visual inmediata de "cuánto camino queda",
 * algo que el número solo no comunica. */
function StateLadder({
  label,
  index,
  total,
  color,
}: {
  label: string;
  /** Posición 0-based de tu estado actual. */
  index: number;
  total: number;
  color: string;
}) {
  if (total <= 1) return null;
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-20 shrink-0 truncate text-xs text-fg-muted">{label}</span>
      <div className="flex flex-1 items-center gap-1.5">
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className="h-1.5 flex-1 rounded-full transition-colors"
            style={{
              background: i <= index ? color : "var(--border)",
              opacity: i === index ? 1 : i < index ? 0.55 : 1,
            }}
          />
        ))}
      </div>
      <span className="w-10 shrink-0 text-right font-mono text-xs text-fg-subtle">
        {index + 1}/{total}
      </span>
    </div>
  );
}
