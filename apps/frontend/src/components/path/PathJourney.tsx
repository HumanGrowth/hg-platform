"use client";

import { ArrowRight, Check, Clock } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import * as React from "react";

import { buttonVariants } from "@/components/ui/button";
import { HexIcon } from "@/components/ui/hex-icon";
import { apiGetMyPath } from "@/lib/api";
import { DIMENSIONS_META } from "@/lib/dimension-styles";
import type { MyPath, PathStep } from "@/lib/types";
import { cn } from "@/lib/utils";

const DOT: Record<string, string> = Object.fromEntries(DIMENSIONS_META.map((p) => [p.id, p.dot]));

function dimensionName(code: string): string {
  return DIMENSIONS_META.find((p) => p.id === code)?.name ?? code;
}

function stepHref(s: PathStep): Route {
  return `/modulos/${s.slug}` as Route;
}

function minutesLabel(s: PathStep): string | null {
  return s.estimated_minutes ? `${s.estimated_minutes} min` : null;
}

export function PathJourney() {
  const [status, setStatus] = React.useState<"loading" | "error" | "ok">("loading");
  const [data, setData] = React.useState<MyPath | null>(null);

  const load = React.useCallback(async () => {
    setStatus("loading");
    try {
      setData(await apiGetMyPath());
      setStatus("ok");
    } catch {
      setStatus("error");
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  if (status === "loading") {
    return <div className="mt-8 h-40 animate-pulse rounded-xl bg-bg-sunken" />;
  }
  if (status === "error") {
    return (
      <div className="mt-8 rounded-lg border border-border bg-bg-raised p-8 text-center">
        <p className="mb-3 font-sans text-sm font-semibold text-fg">No pudimos cargar tu ruta.</p>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-md bg-primary px-5 py-2 font-sans text-sm font-semibold text-white hover:bg-primary-hover"
        >
          Reintentar
        </button>
      </div>
    );
  }
  if (!data) return null;

  const { next_step, upcoming, completed_this_level, total_this_level, current_level } = data;
  const pct = total_this_level > 0 ? Math.round((completed_this_level / total_this_level) * 100) : 0;

  return (
    <div className="mt-8 flex flex-col gap-8">
      {/* Próximo paso */}
      {next_step ? (
        <section className="motion-safe:animate-fade-in overflow-hidden rounded-2xl border border-border bg-bg-raised">
          <div className={cn("h-1.5 w-full", DOT[next_step.career_path_code] ?? "bg-primary")} aria-hidden />
          <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <p className="font-sans text-micro uppercase tracking-meta text-fg-muted">Tu próximo paso</p>
              <h2 className="mt-2 line-clamp-2 font-display text-2xl leading-tight text-fg sm:text-3xl">
                {next_step.title}
              </h2>
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-fg-muted">
                <span className="font-medium text-fg">{dimensionName(next_step.career_path_code)}</span>
                <span>· {next_step.level_code}</span>
                {minutesLabel(next_step) && (
                  <span className="inline-flex items-center gap-1">
                    · <Clock size={14} strokeWidth={1.75} /> {minutesLabel(next_step)}
                  </span>
                )}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-4">
              <HexIcon pillar={next_step.career_path_code} size={56} className="hidden sm:block" />
              <Link
                href={stepHref(next_step)}
                className={cn(buttonVariants({ size: "lg" }), "shrink-0")}
              >
                Continuar tu ruta
                <ArrowRight size={18} strokeWidth={1.75} />
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border border-dashed border-border bg-bg-raised p-8 text-center">
          <p className="font-sans text-md font-semibold text-fg">¡Completaste todo lo disponible!</p>
          <p className="mt-1 text-sm text-fg-muted">Estamos preparando nuevos módulos para tu ruta.</p>
        </section>
      )}

      {/* Progreso del nivel */}
      {current_level && total_this_level > 0 && (
        <section>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-sans font-semibold text-fg">
              Nivel {current_level.replace("L", "")}
            </span>
            <span className="text-fg-muted">
              {completed_this_level} / {total_this_level} completadas
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-bg-sunken">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-700 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
        </section>
      )}

      {/* Timeline de próximos pasos */}
      {upcoming.length > 0 && (
        <section>
          <p className="mb-3 font-sans text-micro uppercase tracking-meta text-fg-muted">Sigue en tu ruta</p>
          <ol className="flex flex-col">
            {upcoming.map((s, i) => (
              <li key={s.unit_id} className="motion-safe:animate-fade-in flex gap-4">
                <div className="flex flex-col items-center">
                  <span className={cn("mt-1.5 h-3 w-3 shrink-0 rounded-full", DOT[s.career_path_code] ?? "bg-fg-subtle")} />
                  {i < upcoming.length - 1 && <span className="my-1 w-px flex-1 bg-border" aria-hidden />}
                </div>
                <Link
                  href={stepHref(s)}
                  className="mb-3 min-w-0 flex-1 rounded-lg border border-border bg-bg-raised px-4 py-3 transition-shadow hover:shadow-md"
                >
                  <p className="line-clamp-1 font-sans text-sm font-semibold text-fg">{s.title}</p>
                  <p className="mt-0.5 text-xs text-fg-muted">
                    {dimensionName(s.career_path_code)} · {s.level_code}
                    {minutesLabel(s) ? ` · ${minutesLabel(s)}` : ""}
                  </p>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Progreso por dimensión */}
      {data.dimensions_progress.length > 0 && (
        <section>
          <p className="mb-3 font-sans text-micro uppercase tracking-meta text-fg-muted">Tus 6 dimensiones</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {data.dimensions_progress.map((d) => {
              const dpct = d.total > 0 ? Math.round((d.completed / d.total) * 100) : 0;
              return (
                <div key={d.career_path_code} className="rounded-lg border border-border bg-bg-raised p-4">
                  <div className="flex items-center gap-2">
                    <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", DOT[d.career_path_code] ?? "bg-fg-subtle")} />
                    <span className="line-clamp-1 font-sans text-sm font-semibold text-fg">{d.name}</span>
                    {d.total > 0 && d.completed === d.total && (
                      <Check size={14} strokeWidth={2} className="ml-auto text-success" />
                    )}
                  </div>
                  <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-bg-sunken">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${dpct}%` }} />
                  </div>
                  <p className="mt-2 text-xs text-fg-muted">
                    {d.total === 0 ? "Próximamente" : `${d.completed} / ${d.total} completadas`}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
