"use client";

import * as React from "react";

import { UnitCardCompact } from "@/components/modulos/UnitCardCompact";
import { HexIcon } from "@/components/ui/hex-icon";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiListModulosByDimension } from "@/lib/api";
import { DIMENSIONS, type DimensionMeta } from "@/lib/modulos";
import { subPillarName } from "@/lib/dimension-styles";
import type { LearningUnitFeedItem, PathDimensionProgress } from "@/lib/types";
import { cn } from "@/lib/utils";

/** El pilar AI (Foundation) siempre va último; el resto por orden natural. */
function pillarRank(code: string): number {
  return code === "AI" ? 1 : 0;
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
 * las dimensiones en una columna a la izquierda; al elegir uno, sus módulos se
 * muestran a la derecha (en mobile: pilares como fila arriba, módulos debajo).
 * Es extensible vía el registro DIMENSIONS.
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

  if (status === "loading") return null; // el hero/feed ya muestra su propio loading

  const dimensionsWithUnits = DIMENSIONS.filter((d) => (byDimension[d.code]?.length ?? 0) > 0);
  if (dimensionsWithUnits.length === 0) return null;

  const progressByPillar = new Map(
    (progressByCareerPath ?? []).map((p) => [p.career_path_code, p]),
  );

  const allUnits = Object.values(byDimension).flat();
  const skillGroups = groupBySkill(allUnits);
  const skills = [...skillGroups.keys()];

  return (
    <div className="flex flex-col gap-4">
      {/* Toggle Dimensión/Skill: cambia el eje de agrupación del catálogo. */}
      <div role="tablist" aria-label="Agrupar por" className="inline-flex w-fit rounded-md border border-border">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "dimension"}
          onClick={() => setMode("dimension")}
          className={cn(
            "px-3 py-1.5 font-sans text-xs font-semibold transition-colors",
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
            "border-l border-border px-3 py-1.5 font-sans text-xs font-semibold transition-colors",
            mode === "skill" ? "bg-hg-green-100 text-primary" : "text-fg-muted hover:bg-bg-sunken",
          )}
        >
          Skill
        </button>
      </div>

      {mode === "dimension" ? (
        <Tabs defaultValue={dimensionsWithUnits[0].code}>
          {/* Tabs horizontales — una dimensión por tab; scrollean en mobile. */}
          {/* Cada tab se ve como el título de una dimensión: badge (HexIcon) + nombre. */}
          <TabsList aria-label="Dimensiones" className="gap-4 overflow-x-auto">
            {dimensionsWithUnits.map((dim) => (
              <TabsTrigger
                key={dim.code}
                value={dim.code}
                className="flex shrink-0 items-center gap-2 whitespace-nowrap"
              >
                <HexIcon pillar={dim.pillar} size={22} />
                {dim.name}
              </TabsTrigger>
            ))}
          </TabsList>
          {dimensionsWithUnits.map((dim) => (
            <TabsContent key={dim.code} value={dim.code}>
              <DimensionSection
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
          <TabsList aria-label="Skills" className="gap-4 overflow-x-auto">
            {skills.map((skill) => (
              <TabsTrigger key={skill} value={skill} className="shrink-0 whitespace-nowrap">
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

function DimensionSection({
  units,
  progress,
}: {
  units: LearningUnitFeedItem[];
  progress?: PathDimensionProgress;
}) {
  const groups = React.useMemo(() => groupByDimension(units), [units]);
  const pillars = React.useMemo(() => [...groups.keys()], [groups]);
  const [selected, setSelected] = React.useState<string>(pillars[0] ?? "");
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
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-sunken">
            <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
          </div>
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
                onClick={() => setSelected(p)}
                className={cn(
                  "flex shrink-0 items-center justify-between gap-2 rounded-md border px-3 py-2 text-left font-sans text-sm transition-colors",
                  active
                    ? "border-primary bg-hg-green-100 font-semibold text-primary"
                    : "border-border text-fg-muted hover:bg-bg-sunken",
                )}
              >
                <span>{subPillarName(groups.get(p)?.[0]?.dimension_code, p)}</span>
                <span className="rounded-full bg-bg-sunken px-1.5 text-xs tabular-nums text-fg-subtle">
                  {groups.get(p)?.length ?? 0}
                </span>
              </button>
            );
          })}
        </div>

        {/* Módulos del pilar seleccionado. */}
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          {current.map((u) => (
            <UnitCardCompact key={u.id} unit={u} />
          ))}
        </div>
      </div>
    </section>
  );
}
