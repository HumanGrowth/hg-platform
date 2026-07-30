"use client";

import { ArrowRight, ChevronDown, FileText, RefreshCw } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import * as React from "react";

import { PillarMetaphor } from "@/components/modulos/PillarMetaphor";
import { UnitCardCompact } from "@/components/modulos/UnitCardCompact";
import { EmptyRing } from "@/components/EmptyRing";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Display } from "@/components/ui/display";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Progress } from "@/components/ui/progress";
import { apiGetMyResults, apiListModulosByPillar } from "@/lib/api";
import { radarValuesFromResults } from "@/lib/assessment-utils";
import type { Dimension } from "@/lib/dimensions";
import { pillarStyle } from "@/lib/pillars";
import type { LearningUnitFeedItem, PillarResult } from "@/lib/types";
import { cn, formatRelativeTime } from "@/lib/utils";

const LEVELS = ["L1", "L2", "L3", "L4"] as const;

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

export function DimensionDetail({ dimension }: { dimension: Dimension }) {
  const style = pillarStyle(dimension.pillar);
  const [results, setResults] = React.useState<PillarResult[] | null>(null);
  const [units, setUnits] = React.useState<LearningUnitFeedItem[]>([]);
  const [status, setStatus] = React.useState<"loading" | "error" | "ok">("loading");

  const load = React.useCallback(async () => {
    setStatus("loading");
    try {
      const [res, unitList] = await Promise.all([
        apiGetMyResults().then((r) => r.results).catch(() => [] as PillarResult[]),
        dimension.hasContent
          ? apiListModulosByPillar(dimension.pillar, undefined, 60).catch(() => [])
          : Promise.resolve([] as LearningUnitFeedItem[]),
      ]);
      setResults(res);
      setUnits(unitList);
      setStatus("ok");
    } catch {
      setStatus("error");
    }
  }, [dimension]);

  React.useEffect(() => {
    void load();
  }, [load]);

  // Score 0-100 de la dimensión (P6 = promedio P6A+P6B, ya resuelto en el util).
  const radarValues = results ? radarValuesFromResults(results) : {};
  const score = radarValues[dimension.pillar] ?? 0;
  // Resultado del assessment de esta dimensión (para state_label + fecha).
  const result =
    results?.find((r) => r.pillar_code === dimension.assessmentPillar) ??
    results?.find((r) => r.pillar_code.startsWith(dimension.pillar));
  const hasEvaluated = Boolean(result);

  return (
    <main className="mx-auto w-full max-w-app px-6 pb-16">
      {/* ── Header: metáfora + gradient del pilar (como UnitOpeningScreen) ── */}
      <header
        className="-mx-6 flex flex-col items-center gap-5 px-6 pb-10 pt-12 text-center"
        style={{
          background: `radial-gradient(120% 90% at 50% 0%, color-mix(in srgb, ${style.glow} 14%, var(--bg)) 0%, var(--bg) 62%)`,
        }}
      >
        <Link
          href={"/home" as Route}
          className="self-start font-sans text-sm font-semibold text-fg-muted hover:text-fg"
        >
          ← Volver
        </Link>
        <div
          className="flex h-28 w-28 items-center justify-center rounded-full"
          style={{
            color: style.glow,
            background: `color-mix(in srgb, ${style.glow} 8%, transparent)`,
            boxShadow: `0 0 32px 0 color-mix(in srgb, ${style.glow} 28%, transparent)`,
          }}
        >
          <PillarMetaphor code={dimension.code} className="h-16 w-16" />
        </div>
        <div className="flex flex-col items-center gap-2">
          <Eyebrow accent>Dimensión</Eyebrow>
          <Display variant="display-2">{dimension.name}</Display>
          <p className="mt-1 max-w-prose text-md text-fg-muted">{dimension.description}</p>
        </div>
      </header>

      {status === "loading" && (
        <Card className="mt-6 flex items-center justify-center py-16">
          <EmptyRing label="Cargando tu dimensión…" />
        </Card>
      )}

      {status === "error" && (
        <Card className="mt-6 flex flex-col items-center gap-4 py-12 text-center">
          <p className="text-sm text-fg-muted">No pudimos cargar esta dimensión.</p>
          <Button variant="secondary" size="sm" onClick={() => void load()}>
            Reintentar
          </Button>
        </Card>
      )}

      {status === "ok" && (
        <>
          <ProgressHero
            dimension={dimension}
            score={score}
            result={result}
            hasEvaluated={hasEvaluated}
          />

          {dimension.hasContent ? (
            <LevelsSection units={units} />
          ) : (
            <Card className="mt-8 flex flex-col items-center gap-2 py-12 text-center">
              <p className="font-sans text-md font-semibold text-fg">
                Contenido próximamente para esta dimensión
              </p>
              <p className="max-w-sm text-sm text-fg-muted">
                Estamos preparando las unidades de {dimension.short.toLowerCase()}. Mientras tanto,
                podés reevaluar tu estado en esta dimensión.
              </p>
            </Card>
          )}

          <MaterialSection />
          <HistorySection dimension={dimension} result={result} />
        </>
      )}
    </main>
  );
}

// ─────────────────────────── Progress hero ───────────────────────────

function ProgressHero({
  dimension,
  score,
  result,
  hasEvaluated,
}: {
  dimension: Dimension;
  score: number;
  result: PillarResult | undefined;
  hasEvaluated: boolean;
}) {
  const animated = useCountUp(score);
  return (
    <Card className="mt-6 flex flex-col gap-5 bg-bg-raised">
      <div className="flex items-end justify-between gap-4">
        <div>
          <Eyebrow>Tu estado actual</Eyebrow>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-mono text-5xl font-semibold text-fg tabular-nums">{animated}</span>
            <span className="text-lg text-fg-muted">/ 100</span>
          </div>
          {result ? (
            <p className="mt-1 text-sm font-semibold text-primary">{result.state_label}</p>
          ) : (
            <p className="mt-1 text-sm text-fg-muted">Todavía no evaluaste esta dimensión</p>
          )}
        </div>
        <Link
          href={`/onboarding/detail/${dimension.assessmentPillar}` as Route}
          className={cn(buttonVariants({ size: "lg" }), "shrink-0")}
        >
          <RefreshCw size={18} strokeWidth={1.75} />
          {hasEvaluated ? "Reevaluar" : "Evaluar"}
        </Link>
      </div>
      <Progress value={score} label={`Progreso ${dimension.name}`} />
      {result && (
        <p className="text-xs text-fg-muted">
          Última evaluación · {formatRelativeTime(result.derived_at)}
        </p>
      )}
    </Card>
  );
}

// ─────────────────────────── Niveles + units ───────────────────────────

function LevelsSection({ units }: { units: LearningUnitFeedItem[] }) {
  const byLevel = React.useMemo(() => {
    const map = new Map<string, LearningUnitFeedItem[]>();
    for (const u of units) {
      const arr = map.get(u.level_code) ?? [];
      arr.push(u);
      map.set(u.level_code, arr);
    }
    return map;
  }, [units]);

  return (
    <section className="mt-10">
      <Eyebrow>Unidades por nivel</Eyebrow>
      <div className="mt-4 flex flex-col gap-3">
        {LEVELS.map((level) => (
          <LevelGroup key={level} level={level} units={byLevel.get(level) ?? []} />
        ))}
      </div>
    </section>
  );
}

function LevelGroup({ level, units }: { level: string; units: LearningUnitFeedItem[] }) {
  const hasContent = units.length > 0;
  const [open, setOpen] = React.useState(hasContent);

  // Dentro del nivel, agrupar por pilar_number (subcategoría).
  const byPillar = React.useMemo(() => {
    const map = new Map<number, LearningUnitFeedItem[]>();
    for (const u of units) {
      const key = u.pillar_number ?? 0;
      const arr = map.get(key) ?? [];
      arr.push(u);
      map.set(key, arr);
    }
    return [...map.entries()].sort(([a], [b]) => a - b);
  }, [units]);

  if (!hasContent) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-border bg-bg-raised px-5 py-4 opacity-50">
        <span className="font-sans text-sm font-semibold text-fg">Nivel {level.slice(1)}</span>
        <span className="rounded-full bg-bg-sunken px-3 py-1 text-xs font-semibold text-fg-muted">
          Próximamente
        </span>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-bg-raised">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-bg-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hg-amber"
      >
        <span className="font-sans text-sm font-semibold text-fg">
          Nivel {level.slice(1)}
          <span className="ml-2 font-normal text-fg-muted">
            {units.length} {units.length === 1 ? "unidad" : "unidades"}
          </span>
        </span>
        <ChevronDown
          size={18}
          strokeWidth={2}
          className={cn("text-fg-muted transition-transform", open && "rotate-180")}
        />
      </button>
      {open && (
        <div className="flex flex-col gap-4 border-t border-border px-4 py-4">
          {byPillar.map(([pillarNumber, pillarUnits]) => (
            <div key={pillarNumber} className="flex flex-col gap-2">
              {byPillar.length > 1 && (
                <p className="px-1 font-sans text-xs font-semibold uppercase tracking-meta text-fg-subtle">
                  Pilar {pillarNumber}
                </p>
              )}
              {pillarUnits.map((u) => (
                <UnitCardCompact key={u.id} unit={u} />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────── Material complementario ───────────────────────────

function MaterialSection() {
  // Schema listo; el contenido lo sube Andy después. Vacío por defecto.
  const material: { id: string; title: string; source: string; url: string }[] = [];

  return (
    <section className="mt-10">
      <Eyebrow>Material complementario</Eyebrow>
      {material.length === 0 ? (
        <Card className="mt-4 flex items-center justify-center py-10">
          <p className="text-sm text-fg-muted">Todavía no hay material complementario.</p>
        </Card>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {material.map((m) => (
            <a
              key={m.id}
              href={m.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 rounded-lg border border-border bg-bg-raised p-4 transition-shadow hover:shadow-md"
            >
              <FileText size={20} strokeWidth={1.75} className="shrink-0 text-primary" />
              <div className="min-w-0">
                <p className="line-clamp-1 font-sans text-sm font-semibold text-fg">{m.title}</p>
                <p className="text-xs text-fg-muted">{m.source}</p>
              </div>
            </a>
          ))}
        </div>
      )}
    </section>
  );
}

// ─────────────────────────── Historial de reevaluaciones ───────────────────────────

function HistorySection({
  dimension,
  result,
}: {
  dimension: Dimension;
  result: PillarResult | undefined;
}) {
  // Hoy el backend expone sólo el último PillarResult por pilar (no un historial
  // completo). Mostramos la entrada actual; el timeline con las últimas 3-5
  // evaluaciones requiere un endpoint de historial (pendiente · TASK 6).
  return (
    <section className="mt-10">
      <Eyebrow>Historial de reevaluaciones</Eyebrow>
      {result ? (
        <ol className="mt-4 flex flex-col gap-2">
          <li className="flex items-center gap-4 rounded-lg border border-border bg-bg-raised px-4 py-3">
            <span className="h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden />
            <span className="min-w-0 flex-1 truncate font-sans text-sm font-medium text-fg">
              {result.state_label}
            </span>
            <span className="shrink-0 text-xs text-fg-muted">
              {formatRelativeTime(result.derived_at)}
            </span>
          </li>
        </ol>
      ) : (
        <Card className="mt-4 flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-sm text-fg-muted">Todavía no reevaluaste esta dimensión.</p>
          <Link
            href={`/onboarding/detail/${dimension.assessmentPillar}` as Route}
            className="inline-flex items-center gap-1 font-sans text-sm font-semibold text-primary"
          >
            Hacé tu primera evaluación
            <ArrowRight size={16} strokeWidth={1.75} />
          </Link>
        </Card>
      )}
    </section>
  );
}
