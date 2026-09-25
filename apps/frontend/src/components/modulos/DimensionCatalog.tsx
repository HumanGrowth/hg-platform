"use client";

import { Lock } from "lucide-react";
import * as React from "react";

import { UnitCardCompact } from "@/components/modulos/UnitCardCompact";
import { Chip } from "@/components/ui/chip";
import { HexIcon } from "@/components/ui/hex-icon";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiListModulosByDimension } from "@/lib/api";
import { levelBadgeMeta } from "@/lib/badge-kit/dimension-adapter";
import { DIMENSIONS, type DimensionMeta } from "@/lib/modulos";
import {
  DIMENSIONS_META,
  dimensionShortName,
  subPillarName,
} from "@/lib/dimension-styles";
import type { LearningUnitFeedItem, PathDimensionProgress } from "@/lib/types";
import { cn } from "@/lib/utils";

/** El pilar AI (Foundation) siempre va último; el resto por orden natural. */
function pillarRank(code: string): number {
  return code === "AI" ? 1 : 0;
}

/** Niveles del modelo (L1–L3): se muestran todos, los que aún no tienen contenido
 * publicado quedan deshabilitados ("Próximamente"). */
const LEVEL_CODES = ["L1", "L2", "L3"] as const;

function levelLabel(code: string): string {
  const title = levelBadgeMeta(code).title;
  return `Nivel ${code.replace(/^L/i, "")}${title ? ` · ${title}` : ""}`;
}

/** Agrupa units por `pillar_code` ("P1", "P2", "AI"…). AI se lista de último. */
function groupByDimension(units: LearningUnitFeedItem[]): Map<string, LearningUnitFeedItem[]> {
  const groups = new Map<string, LearningUnitFeedItem[]>();
  for (const u of units) {
    const key = u.pillar_code ?? "";
    const bucket = groups.get(key) ?? [];
    if (bucket.length === 0) groups.set(key, bucket);
    bucket.push(u);
  }
  return new Map(
    [...groups.entries()].sort(
      ([a], [b]) => pillarRank(a) - pillarRank(b) || a.localeCompare(b),
    ),
  );
}

/** Agrupa units por skill (columna `keywords`) en vez de dimensión/pilar — una
 * unit con varios skills aparece en cada uno. Sin skills → bucket "Sin skill". */
function groupBySkill(units: LearningUnitFeedItem[]): Map<string, LearningUnitFeedItem[]> {
  const groups = new Map<string, LearningUnitFeedItem[]>();
  for (const u of units) {
    const keys = u.keywords && u.keywords.length > 0 ? u.keywords : ["Sin skill"];
    for (const key of keys) {
      const bucket = groups.get(key) ?? [];
      if (bucket.length === 0) groups.set(key, bucket);
      bucket.push(u);
    }
  }
  return new Map([...groups.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

/**
 * Catálogo por Dimensión → Pilar → Unidades (TASK 1 · pulido). Master-detail:
 * un grid de cards con las 6 dimensiones (las que aún no tienen contenido
 * aparecen bloqueadas, "Próximamente"); al elegir una, sus pilares y módulos se
 * muestran debajo (en mobile: pilares como fila arriba, módulos debajo).
 * El contenido disponible sale del registro DIMENSIONS (extensible).
 *
 * Vive en Mi Ruta ("Explorá por dimensión"): Módulos dejó de ser un catálogo y
 * ahora arranca directo el siguiente módulo de tu ruta, así que esta es también
 * la puerta para volver a un módulo ya visto.
 *
 * `progressByCareerPath` es opcional y viene de `GET /me/path`: reemplaza a las
 * barras de "Tus 6 dimensiones" que este bloque sustituyó, para no perder ese dato.
 */
export function DimensionCatalog({
  progressByCareerPath,
}: {
  progressByCareerPath?: PathDimensionProgress[];
} = {}) {
  const [byDimension, setByDimension] = React.useState<Record<string, LearningUnitFeedItem[]>>({});
  const [status, setStatus] = React.useState<"loading" | "ok">("loading");
  const [mode, setMode] = React.useState<"dimension" | "skill">("dimension");

  React.useEffect(() => {
    let active = true;
    Promise.all(
      DIMENSIONS.map((d) => apiListModulosByDimension(d.pillar, undefined, 50).catch(() => [])),
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

  if (status === "loading") {
    return <div className="h-24 animate-pulse rounded-2xl bg-bg-sunken" aria-hidden />;
  }

  const dimensionsWithUnits = DIMENSIONS.filter((d) => (byDimension[d.code]?.length ?? 0) > 0);
  if (dimensionsWithUnits.length === 0) return null;

  const progressByPillar = new Map(
    (progressByCareerPath ?? []).map((p) => [p.career_path_code, p]),
  );

  const unitsByPillar = new Map(DIMENSIONS.map((d) => [d.pillar, byDimension[d.code] ?? []]));

  const allUnits = Object.values(byDimension).flat();
  const skillGroups = groupBySkill(allUnits);
  const skills = [...skillGroups.keys()];

  return (
    <div className="flex flex-col gap-4">
      {/* Toggle Dimensión/Skill: cambia el eje de agrupación del catálogo. */}
      <div
        role="tablist"
        aria-label="Agrupar por"
        className="glass-fill-strong inline-flex w-fit gap-0.5 rounded-md border border-border p-0.5"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === "dimension"}
          onClick={() => setMode("dimension")}
          className={cn(
            "rounded px-3 py-1.5 font-sans text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hg-amber",
            mode === "dimension" ? "bg-hg-green-100 text-primary" : "text-fg-muted hover:bg-bg-sunken",
          )}
        >
          Dimensión
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "skill"}
          onClick={() => setMode("skill")}
          className={cn(
            "rounded px-3 py-1.5 font-sans text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hg-amber",
            mode === "skill" ? "bg-hg-green-100 text-primary" : "text-fg-muted hover:bg-bg-sunken",
          )}
        >
          Skill
        </button>
      </div>

      {mode === "dimension" ? (
        <Tabs defaultValue={dimensionsWithUnits[0].pillar}>
          {/* Una card por dimensión — HexIcon + nombre + cantidad de módulos. Las
              que todavía no tienen contenido quedan deshabilitadas (bloqueadas). */}
          <TabsList
            variant="bare"
            aria-label="Dimensiones"
            className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"
          >
            {DIMENSIONS_META.map((meta) => {
              const count = unitsByPillar.get(meta.id)?.length ?? 0;
              return <DimensionCard key={meta.id} pillar={meta.id} count={count} />;
            })}
          </TabsList>
          {dimensionsWithUnits.map((dim) => (
            <TabsContent key={dim.code} value={dim.pillar}>
              <DimensionSection
                pillar={dim.pillar}
                units={byDimension[dim.code]}
                progress={progressByPillar.get(dim.pillar)}
              />
            </TabsContent>
          ))}
        </Tabs>
      ) : skills.length === 0 ? (
        <p className="text-sm text-fg-muted">Todavía no hay skills etiquetados en el contenido.</p>
      ) : (
        <Tabs defaultValue={skills[0]}>
          <TabsList variant="bare" aria-label="Skills" className="flex gap-2 overflow-x-auto pb-1">
            {skills.map((skill) => (
              <TabsTrigger
                key={skill}
                value={skill}
                variant="bare"
                className="glass-fill-strong shrink-0 whitespace-nowrap rounded-md border border-border px-3 py-1.5 font-sans text-xs font-semibold text-fg-muted transition-colors hover:text-fg aria-selected:text-primary aria-selected:ring-2 aria-selected:ring-primary"
              >
                {skill}
              </TabsTrigger>
            ))}
          </TabsList>
          {skills.map((skill) => (
            <TabsContent key={skill} value={skill}>
              <div className="flex flex-col gap-2">
                {(skillGroups.get(skill) ?? []).map((u) => (
                  <UnitCardCompact key={u.id} unit={u} />
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}

/**
 * Card de una dimensión dentro de la TabsList: HexIcon, nombre corto, cantidad de
 * módulos y estado (activa / bloqueada). `count === 0` = todavía sin contenido.
 */
function DimensionCard({ pillar, count }: { pillar: string; count: number }) {
  const locked = count === 0;
  return (
    <TabsTrigger
      value={pillar}
      variant="bare"
      disabled={locked}
      title={DIMENSIONS_META.find((d) => d.id === pillar)?.name}
      className={cn(
        "glass-fill-strong flex items-center gap-3 rounded-2xl border p-3 text-left transition-[box-shadow,transform] duration-fast ease-out",
        locked
          ? "cursor-not-allowed opacity-60"
          : "hover:-translate-y-0.5 aria-selected:ring-2 aria-selected:ring-primary",
      )}
    >
      {/* El nombre va en texto al lado: el ícono es decorativo acá. */}
      <span aria-hidden>
        <HexIcon pillar={pillar} size={36} className={locked ? "grayscale" : undefined} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-heading text-sm font-medium text-fg">
          {dimensionShortName(pillar)}
        </span>
        <span className="block text-xs text-fg-muted">
          {locked ? "Próximamente" : `${count} ${count === 1 ? "módulo" : "módulos"}`}
        </span>
      </span>
      {locked && <Lock size={14} strokeWidth={2} className="shrink-0 text-fg-subtle" aria-hidden />}
    </TabsTrigger>
  );
}

function DimensionSection({
  pillar,
  units,
  progress,
}: {
  pillar: string;
  units: LearningUnitFeedItem[];
  progress?: PathDimensionProgress;
}) {
  // Nivel elegido (null = todos). Al elegir uno se pide ese nivel al backend: la
  // lista inicial de la dimensión está acotada (máx. 50) y podría dejar niveles
  // incompletos; mientras llega, se filtra localmente.
  const [level, setLevel] = React.useState<string | null>(null);
  const [byLevel, setByLevel] = React.useState<Record<string, LearningUnitFeedItem[]>>({});

  React.useEffect(() => {
    if (!level || byLevel[level]) return;
    let active = true;
    apiListModulosByDimension(pillar, level, 50)
      .then((rows) => {
        if (active) setByLevel((m) => ({ ...m, [level]: rows }));
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [level, pillar, byLevel]);

  const levelCounts = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const u of units) counts.set(u.level_code, (counts.get(u.level_code) ?? 0) + 1);
    return counts;
  }, [units]);
  // Solo tiene sentido el selector si la dimensión ya publica más de un nivel.
  const showLevels = [...levelCounts.keys()].length > 1;

  const shownUnits = React.useMemo(() => {
    if (!level) return units;
    return byLevel[level] ?? units.filter((u) => u.level_code === level);
  }, [units, level, byLevel]);

  const groups = React.useMemo(() => groupByDimension(shownUnits), [shownUnits]);
  const pillars = React.useMemo(() => [...groups.keys()], [groups]);
  const [picked, setPicked] = React.useState<string>("");
  const selected = groups.has(picked) ? picked : (pillars[0] ?? "");
  const current = groups.get(selected) ?? [];
  const pct =
    progress && progress.total > 0
      ? Math.round((progress.completed / progress.total) * 100)
      : null;

  return (
    <section className="flex flex-col gap-4">
      {/* Progreso de la dimensión — lo que antes mostraba "Tus 6 dimensiones". */}
      {pct !== null && progress && (
        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="font-sans font-semibold text-fg">Tu progreso</span>
            <span className="text-fg-muted tabular-nums">
              {progress.completed} / {progress.total} completadas
            </span>
          </div>
          <Progress
            value={pct}
            label={`Tu progreso: ${progress.completed} de ${progress.total} completadas`}
            className="h-2 rounded-full"
            indicatorClassName="rounded-full bg-hg-orange"
          />
        </div>
      )}
      {showLevels && (
        <div role="group" aria-label="Nivel" className="flex flex-wrap gap-2">
          <Chip
            active={level === null}
            onClick={() => setLevel(null)}
            className={level === null ? "ring-2 ring-primary" : undefined}
          >
            Todos
          </Chip>
          {LEVEL_CODES.map((l) => {
            const count = levelCounts.get(l) ?? 0;
            return (
              <Chip
                key={l}
                active={level === l}
                disabled={count === 0}
                title={count === 0 ? "Próximamente" : undefined}
                onClick={() => setLevel(l)}
                className={cn(
                  // `.glass-fill-strong` pisa el borde: el activo se marca con ring.
                  level === l && "ring-2 ring-primary",
                  count === 0 && "cursor-not-allowed opacity-60",
                )}
              >
                {levelLabel(l)}
                {count > 0 && (
                  <span className="ml-1 rounded-full bg-bg-sunken px-1.5 text-micro tabular-nums text-fg-subtle">
                    {count}
                  </span>
                )}
              </Chip>
            );
          })}
        </div>
      )}
      {/* Sin header de dimensión: el tab ya muestra su badge + nombre. Acá solo
          los pilares + los módulos por pilar. */}
      <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
        {/* Pilares — fila scrollable en mobile, columna a la izq en desktop. */}
        <div
          role="tablist"
          aria-label="Pilares"
          className="flex gap-2 overflow-x-auto pb-1 sm:w-48 sm:shrink-0 sm:flex-col sm:overflow-visible sm:pb-0"
        >
          {pillars.map((p) => {
            const active = p === selected;
            return (
              <button
                key={p}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setPicked(p)}
                className={cn(
                  "flex shrink-0 items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left font-sans text-sm transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hg-amber",
                  // hg-orange-700: el naranja de marca (#e8530a) no llega a 4.5:1 con texto blanco.
                  active
                    ? "border-hg-orange-700 bg-hg-orange-700 font-semibold text-white"
                    : "glass-fill-strong border-border text-fg-muted hover:bg-bg-sunken",
                )}
              >
                <span>{subPillarName(groups.get(p)?.[0]?.dimension_code, p)}</span>
                <span
                  className={cn(
                    "rounded-full px-1.5 text-xs tabular-nums",
                    active ? "bg-white/20 text-white" : "bg-bg-sunken text-fg-subtle",
                  )}
                >
                  {groups.get(p)?.length ?? 0}
                </span>
              </button>
            );
          })}
        </div>

        {/* Módulos del pilar seleccionado. */}
        <div className="grid min-w-0 flex-1 content-start gap-3 md:grid-cols-2">
          {current.map((u) => (
            <UnitCardCompact key={u.id} unit={u} />
          ))}
        </div>
      </div>
    </section>
  );
}
