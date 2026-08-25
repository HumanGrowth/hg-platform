"use client";

import { ArrowRight, ChevronDown, FileText, Lock, RefreshCw } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import * as React from "react";

import { DimensionMetaphor } from "@/components/modulos/DimensionMetaphor";
import { UnitCardCompact } from "@/components/modulos/UnitCardCompact";
import { EmptyRing } from "@/components/EmptyRing";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Display } from "@/components/ui/display";
import { Eyebrow } from "@/components/ui/eyebrow";
import { HexIcon } from "@/components/ui/hex-icon";
import { Progress } from "@/components/ui/progress";
import { apiGetMyResults, apiListModulosByDimension } from "@/lib/api";
import { radarValuesFromResults } from "@/lib/assessment-utils";
import type { Dimension } from "@/lib/dimensions";
import { dimensionStyle, subPillarName } from "@/lib/dimension-styles";
import type { LearningUnitFeedItem, DimensionResult } from "@/lib/types";
import { cn, formatRelativeTime } from "@/lib/utils";

/** El pilar AI (Foundation) siempre va último; el resto por orden natural. */
function pillarRank(code: string): number {
  return code === "AI" ? 1 : 0;
}

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
  const style = dimensionStyle(dimension.careerPath);
  const [results, setResults] = React.useState<DimensionResult[] | null>(null);
  const [units, setUnits] = React.useState<LearningUnitFeedItem[]>([]);
  const [status, setStatus] = React.useState<"loading" | "error" | "ok">("loading");

  const load = React.useCallback(async () => {
    setStatus("loading");
    try {
      const [res, unitList] = await Promise.all([
        apiGetMyResults().then((r) => r.results).catch(() => [] as DimensionResult[]),
        dimension.hasContent
          ? apiListModulosByDimension(dimension.careerPath, undefined, 50).catch(() => [])
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
  const score = radarValues[dimension.careerPath] ?? 0;
  // Resultado del assessment de esta dimensión (para state_label + fecha).
  const result =
    results?.find((r) => r.dimension_code === dimension.assessmentDimension) ??
    results?.find((r) => r.dimension_code.startsWith(dimension.careerPath));
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
          <DimensionMetaphor code={dimension.code} className="h-16 w-16" />
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
            <AreasSection dimension={dimension} units={units} />
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
  result: DimensionResult | undefined;
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
          href={`/onboarding/detail/${dimension.assessmentDimension}` as Route}
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

// ─────────────────────── Áreas de Crecimiento (por pilar) ───────────────────────

/** "L1" → "Nivel 1" (consistente con la página de Módulos). */
function levelLabel(code: string): string {
  return `Nivel ${code.replace(/^L/, "")}`;
}

function AreasSection({
  dimension,
  units,
}: {
  dimension: Dimension;
  units: LearningUnitFeedItem[];
}) {
  // Filtro por nivel data-driven: solo aparece si los units de ESTA dimensión
  // abarcan más de un nivel (hoy solo Carrera lo hace; se auto-adapta al contenido).
  const availableLevels = React.useMemo(
    () => [...new Set(units.map((u) => u.level_code))].sort(),
    [units],
  );
  const [level, setLevel] = React.useState<string | null>(null);
  const shownUnits = React.useMemo(
    () => (level ? units.filter((u) => u.level_code === level) : units),
    [units, level],
  );

  // Agrupamos por pillar_code (el "área de crecimiento" dentro de la dimensión).
  // El pilar AI (Foundation) siempre se lista último. Un área sin units en el
  // nivel filtrado desaparece sola (no entra al Map).
  const areas = React.useMemo(() => {
    const map = new Map<string, LearningUnitFeedItem[]>();
    for (const u of shownUnits) {
      const key = u.pillar_code ?? "";
      const arr = map.get(key) ?? [];
      arr.push(u);
      map.set(key, arr);
    }
    return [...map.entries()].sort(
      ([a], [b]) => pillarRank(a) - pillarRank(b) || a.localeCompare(b),
    );
  }, [shownUnits]);

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Eyebrow>Áreas de Crecimiento</Eyebrow>
        {availableLevels.length > 1 && (
          <div className="flex flex-wrap gap-2">
            <Chip active={level === null} onClick={() => setLevel(null)}>
              Todos
            </Chip>
            {availableLevels.map((l) => (
              <Chip key={l} active={level === l} onClick={() => setLevel(l)}>
                {levelLabel(l)}
              </Chip>
            ))}
          </div>
        )}
      </div>
      <div className="mt-4 flex flex-col gap-3">
        {areas.map(([pillarCode, areaUnits], i) => (
          <AreaGroup
            key={pillarCode}
            dimension={dimension}
            pillarCode={pillarCode}
            units={areaUnits}
            defaultOpen={i === 0}
          />
        ))}
      </div>
    </section>
  );
}

function AreaGroup({
  dimension,
  pillarCode,
  units,
  defaultOpen,
}: {
  dimension: Dimension;
  pillarCode: string;
  units: LearningUnitFeedItem[];
  defaultOpen: boolean;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  const areaName = subPillarName(units[0]?.dimension_code, pillarCode);
  // La insignia del área se desbloquea al completar todas sus unidades.
  const unlocked = units.length > 0 && units.every((u) => u.attempt_status === "completed");

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-bg-raised">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-bg-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hg-amber"
      >
        <span className="min-w-0 font-sans text-sm font-semibold text-fg">
          {areaName}
          <span className="ml-2 font-normal text-fg-muted">
            {units.length} {units.length === 1 ? "unidad" : "unidades"}
          </span>
        </span>
        <ChevronDown
          size={18}
          strokeWidth={2}
          className={cn("shrink-0 text-fg-muted transition-transform", open && "rotate-180")}
        />
      </button>
      {open && (
        <div className="flex flex-col gap-4 border-t border-border px-4 py-4">
          <AreaBadge dimension={dimension} areaName={areaName} unlocked={unlocked} />
          <div className="flex flex-col gap-2">
            {units.map((u) => (
              <UnitCardCompact key={u.id} unit={u} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Insignia aspiracional del área: se desbloquea al completar todas sus unidades. */
function AreaBadge({
  dimension,
  areaName,
  unlocked,
}: {
  dimension: Dimension;
  areaName: string;
  unlocked: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-bg-sunken px-4 py-3">
      <div
        className={cn(
          "relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border bg-surface-card",
          !unlocked && "opacity-45 grayscale",
        )}
      >
        <HexIcon pillar={dimension.careerPath} size={32} />
        {!unlocked && (
          <Lock
            size={14}
            strokeWidth={2}
            className="absolute -bottom-1 -right-1 rounded-full bg-bg-raised p-0.5 text-fg-muted"
          />
        )}
      </div>
      <div className="min-w-0">
        <p className="font-sans text-sm font-semibold text-fg">Insignia · {areaName}</p>
        <p className="text-xs text-fg-muted">
          {unlocked
            ? "¡Desbloqueada! Completaste todas las unidades de esta área."
            : "Completá todas las unidades de esta área para desbloquearla."}
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────── Material complementario ───────────────────────────

function MaterialSection() {
  // Schema listo; el contenido lo sube Andy después. Vacío por defecto.
  const material: {
    id: string;
    title: string;
    subtitle?: string;
    source: string;
    url: string;
    cover_image_url?: string;
  }[] = [];

  return (
    <section className="mt-10">
      <Eyebrow>Material complementario</Eyebrow>
      {material.length === 0 ? (
        <Card className="mt-4 flex items-center justify-center py-10">
          <p className="text-sm text-fg-muted">Todavía no hay material complementario.</p>
        </Card>
      ) : (
        // Mismas tarjetas que el blog de Perspectivas: cover + chip + título + meta.
        <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {material.map((m) => (
            <a
              key={m.id}
              href={m.url}
              target="_blank"
              rel="noreferrer"
              className="group flex flex-col overflow-hidden rounded-xl border border-border bg-bg-raised transition-shadow hover:shadow-md"
            >
              <div className="flex aspect-video w-full items-center justify-center overflow-hidden bg-bg-sunken">
                {m.cover_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.cover_image_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <FileText size={28} strokeWidth={1.5} className="text-fg-subtle" aria-hidden />
                )}
              </div>
              <div className="flex flex-1 flex-col p-5">
                <span className="mb-2 self-start rounded-full bg-bg-sunken px-2.5 py-0.5 text-xs font-medium text-fg-muted">
                  {m.source}
                </span>
                <h3 className="font-heading text-lg font-semibold leading-tight text-fg">
                  {m.title}
                </h3>
                {m.subtitle && <p className="mt-2 line-clamp-2 text-sm text-fg-muted">{m.subtitle}</p>}
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
  result: DimensionResult | undefined;
}) {
  // Hoy el backend expone sólo el último DimensionResult por dimensión (no un historial
  // completo). Mostramos la entrada actual; el timeline con las últimas 3-5
  // evaluaciones requiere un endpoint de historial (pendiente · TASK 6).
  return (
    <section className="mt-10">
      <Eyebrow>Historial de reevaluaciones</Eyebrow>
      {result ? (
        <ol className="mt-4 flex flex-col gap-2">
          <li className="flex items-start gap-4 rounded-lg border border-border bg-bg-raised px-4 py-3">
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden />
            <span className="min-w-0 flex-1 font-sans text-sm font-medium text-fg">
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
            href={`/onboarding/detail/${dimension.assessmentDimension}` as Route}
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
