"use client";

import { Flame, Lock, X } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

import { EmptyRing } from "@/components/EmptyRing";
import { DimensionCatalog } from "@/components/modulos/DimensionCatalog";
import { UnitCardCompact } from "@/components/modulos/UnitCardCompact";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Display } from "@/components/ui/display";
import { Eyebrow } from "@/components/ui/eyebrow";
import {
  apiGetHomeDashboard,
  apiGetModulosFeed,
  apiGetMyResults,
  apiListModulosByDimension,
  apiMyAssignments,
} from "@/lib/api";
import { dimensionShortName } from "@/lib/dimension-styles";
import { isUnitLevelLocked, levelNum } from "@/lib/modulos";
import type { LearningUnitFeed, LearningUnitFeedItem } from "@/lib/types";

/** Módulos de una dimensión agrupados por nivel; bloquea (grayed) los que están
 *  por encima del nivel del colaborador. Si la dimensión tiene un solo nivel, no
 *  agrupa ni bloquea (lista plana, como antes). */
function ModulosByLevel({
  units,
  assignedIds,
  collaboratorLevel,
}: {
  units: LearningUnitFeedItem[];
  assignedIds: Set<string>;
  collaboratorLevel: string | null;
}) {
  const byAssigned = (a: LearningUnitFeedItem, b: LearningUnitFeedItem) =>
    Number(assignedIds.has(b.id)) - Number(assignedIds.has(a.id));

  const levels = React.useMemo(
    () => [...new Set(units.map((u) => u.level_code))].sort(),
    [units],
  );

  // Un solo nivel → lista plana sin bloqueo (dimensiones sin progresión por nivel).
  if (levels.length <= 1) {
    return (
      <div className="mt-8 flex flex-col gap-3">
        {[...units].sort(byAssigned).map((u) => (
          <UnitCardCompact key={u.id} unit={u} assigned={assignedIds.has(u.id)} />
        ))}
      </div>
    );
  }

  const noLevel = levelNum(collaboratorLevel) == null; // no evaluado → todo bloqueado

  return (
    <div className="mt-8 flex flex-col gap-8">
      {noLevel && (
        <Card className="flex items-center gap-3 bg-bg-raised">
          <Lock size={18} strokeWidth={1.75} className="shrink-0 text-fg-muted" aria-hidden />
          <p className="text-sm text-fg-muted">
            Evaluá tu nivel en esta dimensión para desbloquear tus módulos según tu punto de partida.
          </p>
        </Card>
      )}
      {levels.map((lvl) => {
        const group = units.filter((u) => u.level_code === lvl).sort(byAssigned);
        if (group.length === 0) return null;
        return (
          <section key={lvl}>
            <Eyebrow className="mb-3">Nivel {lvl.replace(/^L/i, "")}</Eyebrow>
            <div className="flex flex-col gap-3">
              {group.map((u) => (
                <UnitCardCompact
                  key={u.id}
                  unit={u}
                  assigned={assignedIds.has(u.id)}
                  locked={isUnitLevelLocked(u.level_code, collaboratorLevel)}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function ModulosPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dimensionFilter = searchParams.get("pillar");

  const [status, setStatus] = React.useState<"loading" | "error" | "ok">("loading");
  const [feed, setFeed] = React.useState<LearningUnitFeed | null>(null);
  const [filteredUnits, setFilteredUnits] = React.useState<LearningUnitFeedItem[] | null>(null);
  // Nivel del colaborador en la dimensión filtrada (state_code del assessment,
  // L1..L4 en Carrera) → bloqueo por nivel. null = no evaluado (todo bloqueado).
  const [dimLevel, setDimLevel] = React.useState<string | null>(null);
  const [streakDays, setStreakDays] = React.useState<number | null>(null);
  const [assignedIds, setAssignedIds] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    apiMyAssignments()
      .then((rows) => setAssignedIds(new Set(rows.map((a) => a.learning_unit_id))))
      .catch(() => setAssignedIds(new Set()));
  }, []);

  const load = React.useCallback(async () => {
    setStatus("loading");
    try {
      if (dimensionFilter) {
        // Todos los units de la dimensión (agrupamos por nivel en el cliente); +
        // el nivel del colaborador para el bloqueo por nivel.
        const [units, res] = await Promise.all([
          apiListModulosByDimension(dimensionFilter, undefined, 50),
          apiGetMyResults().catch(() => ({ results: [] })),
        ]);
        setFilteredUnits(units);
        const r = res.results.find((x) => x.dimension_code === dimensionFilter);
        setDimLevel(r?.state_code ?? null);
      } else {
        setFeed(await apiGetModulosFeed());
      }
      setStatus("ok");
    } catch {
      setStatus("error");
    }
    // Streak es solo decorativo acá — best-effort, no bloquea el feed.
    try {
      const dash = await apiGetHomeDashboard();
      setStreakDays(dash.stats.streak_days);
    } catch {
      setStreakDays(null);
    }
  }, [dimensionFilter]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const isEmpty =
    dimensionFilter
      ? filteredUnits !== null && filteredUnits.length === 0
      : feed !== null && feed.hero === null && feed.next.length === 0;

  return (
    <main className="mx-auto w-full max-w-app px-6 py-10">
      <Eyebrow accent>Módulos</Eyebrow>
      <Display variant="display-2" className="mt-2">
        Aprendé algo hoy
      </Display>
      <p className="mt-3 max-w-prose text-md text-fg-muted">
        Micro-lecciones de 3 a 10 minutos, con evidencia y práctica.
      </p>

      {dimensionFilter && (
        <div className="mt-4 flex items-center gap-2">
          <Chip active onClick={() => router.push("/modulos" as Route)} className="pr-2">
            Filtrando: {dimensionShortName(dimensionFilter)}
            <X size={14} strokeWidth={2} />
          </Chip>
        </div>
      )}

      {status === "loading" && (
        <Card className="mt-8 flex items-center justify-center py-16">
          <EmptyRing label="Cargando tus módulos…" />
        </Card>
      )}

      {status === "error" && (
        <Card className="mt-8 flex flex-col items-center gap-4 py-12 text-center">
          <p className="text-sm text-fg-muted">No pudimos cargar tus módulos.</p>
          <Button variant="secondary" size="sm" onClick={() => void load()}>
            Reintentar
          </Button>
        </Card>
      )}

      {status === "ok" && isEmpty && (
        <Card className="mt-8 flex flex-col items-center gap-2 py-16 text-center">
          <p className="font-sans text-md font-semibold text-fg">
            {dimensionFilter
              ? "Todavía no hay módulos publicados para esta dimensión."
              : "Todavía no hay módulos para vos."}
          </p>
          <p className="max-w-prose text-sm text-fg-muted">
            Volvé más tarde — tu coach está preparando nuevo contenido.
          </p>
        </Card>
      )}

      {status === "ok" && !isEmpty && dimensionFilter && filteredUnits && (
        <ModulosByLevel
          units={filteredUnits}
          assignedIds={assignedIds}
          collaboratorLevel={dimLevel}
        />
      )}

      {status === "ok" && !isEmpty && !dimensionFilter && feed && (
        <div className="mt-8 flex flex-col gap-8">
          {/* Racha: solo el chip (antes se duplicaba en una card del aside). */}
          {streakDays !== null && streakDays > 0 && (
            <div className="flex items-center gap-2 self-start rounded-md bg-bg-sunken px-3 py-2">
              <Flame size={18} strokeWidth={1.75} className="text-primary" aria-hidden />
              <span className="font-sans text-sm font-semibold text-fg">
                {streakDays} {streakDays === 1 ? "día seguido" : "días seguidos"}
              </span>
            </div>
          )}

          {/* La secuencia completa vive en el tab Mi Ruta. */}
          <Link
            href={"/path" as Route}
            className="self-start font-sans text-sm font-semibold text-primary hover:underline"
          >
            Ver mi ruta completa →
          </Link>

          {/* Catálogo agrupado por Dimensión → Pilar. */}
          <section>
            <Eyebrow className="mb-3">Explorá por dimensión</Eyebrow>
            <DimensionCatalog />
          </section>
        </div>
      )}
    </main>
  );
}

export default function ModulosPage() {
  return (
    <React.Suspense
      fallback={
        <main className="mx-auto w-full max-w-app px-6 py-10">
          <Card className="mt-8 flex items-center justify-center py-16">
            <EmptyRing label="Cargando tus módulos…" />
          </Card>
        </main>
      }
    >
      <ModulosPageContent />
    </React.Suspense>
  );
}
