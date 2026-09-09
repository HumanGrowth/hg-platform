"use client";

import { Check } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import * as React from "react";

import { DimensionCatalog } from "@/components/modulos/DimensionCatalog";
import { UnitCardHero } from "@/components/modulos/UnitCardHero";
import { BadgeIcon } from "@/components/ui/badge-icon";
import { apiGetMyPath, apiListModulosByDimension } from "@/lib/api";
import { DIMENSIONS_META } from "@/lib/dimension-styles";
import type {
  LearningUnitFeedItem,
  MyPath,
  PathMilestone,
  PathStep,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { Eyebrow } from "../ui/eyebrow";

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

/** Hitos indexados por la unit tras la cual se intercalan. */
function groupMilestones(milestones: PathMilestone[]): Map<string, PathMilestone[]> {
  const map = new Map<string, PathMilestone[]>();
  for (const m of milestones) {
    const bucket = map.get(m.after_unit_id) ?? [];
    bucket.push(m);
    map.set(m.after_unit_id, bucket);
  }
  return map;
}

/**
 * Un hito en la línea de la ruta: la insignia que ganás al llegar a ese punto.
 * Se distingue de un paso — es una meta, no algo que se abre.
 */
function MilestoneRow({ milestone, last }: { milestone: PathMilestone; last: boolean }) {
  const unitsLabel =
    milestone.units_remaining === 1
      ? "1 módulo más"
      : `${milestone.units_remaining} módulos más`;
  return (
    <li className="motion-safe:animate-fade-in flex gap-4">
      <div className="flex flex-col items-center">
        <span className="mt-1.5 h-3 w-3 shrink-0 rotate-45 rounded-sm border-2 border-primary bg-bg" />
        {!last && <span className="my-1 w-px flex-1 bg-border" aria-hidden />}
      </div>
      <div className="mb-3 flex min-w-0 flex-1 items-center gap-4 rounded-lg border border-dashed border-primary/40 bg-primary/[0.04] px-4 py-3">
        <BadgeIcon
          iconUrl={milestone.badge_icon_url}
          name={milestone.badge_name}
          unlocked={false}
          size={30}
        />
        <div className="min-w-0">
          <p className="font-sans text-sm font-semibold text-fg">{milestone.title}</p>
          <p className="mt-0.5 text-xs text-fg-muted">
            A {unitsLabel} desbloqueás la insignia{" "}
            <span className="font-semibold text-fg">{milestone.badge_name}</span>
            {milestone.requires_assessment
              ? ". Esta insignia también toma en cuenta tu evaluación de la dimensión."
              : "."}
          </p>
        </div>
      </div>
    </li>
  );
}

export function PathJourney() {
  const [status, setStatus] = React.useState<"loading" | "error" | "ok">("loading");
  const [data, setData] = React.useState<MyPath | null>(null);
  // Tarjeta completa (thumbnail/poster) del next_step para el header. Se pide
  // por (dimensión, nivel) — la MISMA consulta que usó path_engine para elegir
  // next_step — así el slug SIEMPRE está en la respuesta: nunca cae a un
  // "hero" de otra unit (el desfase que había antes al usar /modulos/feed, que
  // elige su propio hero con lógica independiente).
  const [heroUnit, setHeroUnit] = React.useState<LearningUnitFeedItem | null>(null);

  const load = React.useCallback(async () => {
    setStatus("loading");
    try {
      const path = await apiGetMyPath();
      setData(path);
      const ns = path.next_step;
      setHeroUnit(
        ns
          ? await apiListModulosByDimension(ns.career_path_code, ns.level_code, 50)
              .then((units) => units.find((u) => u.slug === ns.slug) ?? null)
              .catch(() => null)
          : null,
      );
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
  const milestonesAfter = groupMilestones(data.milestones ?? []);

  // Marcas de hito sobre la barra de nivel: en qué % cae cada uno. Se usa
  // `sequence_position` (índice sobre la secuencia COMPLETA del nivel, no solo
  // los ~8 pasos de `upcoming`) — así aparece el checkpoint de CADA pilar en
  // curso, no solo el más cercano.
  const levelMilestoneMarkers =
    total_this_level > 0
      ? (data.milestones ?? []).map((m) => ({
          milestone: m,
          at: Math.min(100, ((completed_this_level + m.sequence_position + 1) / total_this_level) * 100),
        }))
      : [];



  return (
    <div className="mt-8 flex flex-col gap-8">
      {/* Tu módulo de hoy = siguiente de la ruta (header de Mi Ruta). Si next_step
          existe pero por lo que sea no se pudo resolver su tarjeta completa
          (transitorio), se muestra una versión mínima con el mismo link — nunca
          el estado de "completaste todo" mientras SÍ hay un próximo paso real. */}
      {heroUnit ? (
        <div className="motion-safe:animate-fade-in">
          <UnitCardHero unit={heroUnit} />
        </div>
      ) : next_step ? (
        <Link
          href={stepHref(next_step)}
          className="block rounded-lg border border-border bg-bg-raised p-6 transition-shadow hover:shadow-md"
        >
          <p className="font-sans text-micro uppercase tracking-meta text-primary">Tu módulo de hoy</p>
          <h2 className="mt-2 font-sans text-xl font-semibold text-fg">{next_step.title}</h2>
          <p className="mt-1 text-sm text-fg-muted">
            {dimensionName(next_step.career_path_code)} · {next_step.level_code}
          </p>
        </Link>
      ) : (
        <section className="rounded-2xl border border-dashed border-border bg-bg-raised p-8 text-center">
          <p className="font-sans text-md font-semibold text-fg">¡Completaste todo lo disponible!</p>
          <p className="mt-1 text-sm text-fg-muted">Estamos preparando nuevos módulos para tu ruta.</p>
        </section>
      )}

      {/* Progreso del nivel, con los hitos marcados sobre la barra (además de
          aparecer en la línea de "Sigue en tu ruta" más abajo). */}
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
          <div className="relative pt-3">
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-bg-sunken">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-700 ease-out"
                style={{ width: `${pct}%` }}
              />
            </div>
            {levelMilestoneMarkers.map(({ milestone, at }) => (
              <span
                key={milestone.badge_code}
                title={`${milestone.title} · ${milestone.badge_name}`}
                className="absolute top-0 h-3.5 w-3.5 -translate-x-1/2 rotate-45 rounded-[3px] border-2 border-primary bg-bg"
                style={{ left: `${at}%` }}
                aria-hidden
              />
            ))}
          </div>
          {levelMilestoneMarkers.length > 0 && (
            <p className="mt-2 text-xs text-fg-subtle">
              <span aria-hidden>◆</span> marca dónde ganás una insignia en este nivel.
            </p>
          )}
        </section>
      )}

      {/* Timeline de próximos pasos, con los hitos intercalados donde caen. */}
      {upcoming.length > 0 && (
        <section>
          <p className="mb-3 font-sans text-micro uppercase tracking-meta text-fg-muted">Sigue en tu ruta</p>
          <ol className="flex flex-col">
            {upcoming.map((s, i) => {
              const reached = milestonesAfter.get(s.unit_id) ?? [];
              const last = i === upcoming.length - 1 && reached.length === 0;
              return (
                <React.Fragment key={s.unit_id}>
                  <li className="motion-safe:animate-fade-in flex gap-4">
                    <div className="flex flex-col items-center">
                      <span className={cn("mt-1.5 h-3 w-3 shrink-0 rounded-full", DOT[s.career_path_code] ?? "bg-fg-subtle")} />
                      {!last && <span className="my-1 w-px flex-1 bg-border" aria-hidden />}
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
                  {reached.map((m, j) => (
                    <MilestoneRow
                      key={m.badge_code}
                      milestone={m}
                      last={i === upcoming.length - 1 && j === reached.length - 1}
                    />
                  ))}
                </React.Fragment>
              );
            })}
          </ol>
        </section>
      )}

      {/* Explorá por dimensión — el catálogo completo (vivía en Módulos, que
          ahora arranca directo tu siguiente módulo). Es también la puerta para
          repasar un módulo ya visto. */}
      <section>
        <Eyebrow>Explorá por dimensión</Eyebrow>
        <p className="mb-3 text-sm text-fg-muted">
          Todo el contenido, dimensión por dimensión. Entrá a cualquier módulo para verlo o repasarlo.
        </p>
        <DimensionCatalog progressByCareerPath={data.dimensions_progress} />
      </section>
    </div>
  );
}
