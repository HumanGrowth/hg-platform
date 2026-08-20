"use client";

import { Flame, X } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

import { EmptyRing } from "@/components/EmptyRing";
import { DimensionCatalog } from "@/components/modulos/DimensionCatalog";
import { UnitCardCompact } from "@/components/modulos/UnitCardCompact";
import { UnitCardHero } from "@/components/modulos/UnitCardHero";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Display } from "@/components/ui/display";
import { Eyebrow } from "@/components/ui/eyebrow";
import {
  apiGetHomeDashboard,
  apiGetModulosFeed,
  apiListModulosByDimension,
  apiMyAssignments,
  apiGetMyPath,
} from "@/lib/api";
import { dimensionShortName } from "@/lib/dimension-styles";
import type { LearningUnitFeed, LearningUnitFeedItem } from "@/lib/types";

function ModulosPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dimensionFilter = searchParams.get("pillar");
  const levelFilter = searchParams.get("level"); // "L1".."L4" o null (Todos)

  const [status, setStatus] = React.useState<"loading" | "error" | "ok">("loading");
  const [feed, setFeed] = React.useState<LearningUnitFeed | null>(null);
  // Slug del "módulo de hoy" = next_step del motor de ruta (GET /me/path). El
  // tab de Módulos ya no tiene su propia lógica de hero (TASK 7): usa la ruta.
  const [nextStepSlug, setNextStepSlug] = React.useState<string | null>(null);
  const [filteredUnits, setFilteredUnits] = React.useState<LearningUnitFeedItem[] | null>(null);
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
        const units = await apiListModulosByDimension(dimensionFilter, levelFilter ?? undefined, 20);
        setFilteredUnits(units);
      } else {
        // "Tu módulo de hoy" sale del motor de ruta (next_step); el feed aporta
        // el card completo (poster, blocks, attempt_status) del mismo módulo.
        const [data, path] = await Promise.all([apiGetModulosFeed(), apiGetMyPath()]);
        setFeed(data);
        setNextStepSlug(path.next_step?.slug ?? null);
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
  }, [dimensionFilter, levelFilter]);

  React.useEffect(() => {
    void load();
  }, [load]);

  // "Tu módulo de hoy" = el módulo del next_step de la ruta, con el card completo
  // del feed. Si el next_step no está en el feed (edge), cae al hero del feed.
  const heroUnit = React.useMemo(() => {
    if (!feed) return null;
    if (nextStepSlug) {
      const match = [feed.hero, ...feed.next].find((u) => u && u.slug === nextStepSlug);
      if (match) return match;
    }
    return feed.hero;
  }, [feed, nextStepSlug]);

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
        <div className="mt-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Chip active onClick={() => router.push("/modulos" as Route)} className="pr-2">
              Filtrando: {dimensionShortName(dimensionFilter)}
              <X size={14} strokeWidth={2} />
            </Chip>
          </div>
          {/* Filtro por nivel — persistente en la URL (?level=L2). */}
          <div className="flex flex-wrap gap-2">
            {[
              { label: "Todos", code: null },
              { label: "Nivel 1", code: "L1" },
              { label: "Nivel 2", code: "L2" },
              { label: "Nivel 3", code: "L3" },
              { label: "Nivel 4", code: "L4" },
            ].map(({ label, code }) => {
              const params = new URLSearchParams({ pillar: dimensionFilter });
              if (code) params.set("level", code);
              return (
                <Chip
                  key={label}
                  active={levelFilter === code || (!levelFilter && code === null)}
                  onClick={() => router.push(`/modulos?${params.toString()}` as Route)}
                >
                  {label}
                </Chip>
              );
            })}
          </div>
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
            {levelFilter
              ? `Nivel ${levelFilter.replace("L", "")} · próximamente`
              : dimensionFilter
                ? "Todavía no hay módulos publicados para esta dimensión."
                : "Todavía no hay módulos para vos."}
          </p>
          <p className="max-w-prose text-sm text-fg-muted">
            Volvé más tarde — tu coach está preparando nuevo contenido.
          </p>
        </Card>
      )}

      {status === "ok" && !isEmpty && dimensionFilter && filteredUnits && (
        <div className="mt-8 flex flex-col gap-3">
          {[...filteredUnits]
            .sort((a, b) => Number(assignedIds.has(b.id)) - Number(assignedIds.has(a.id)))
            .map((unit) => (
              <UnitCardCompact key={unit.id} unit={unit} assigned={assignedIds.has(unit.id)} />
            ))}
        </div>
      )}

      {status === "ok" && !isEmpty && !dimensionFilter && feed && (
        <div className="mt-8 flex flex-col gap-8">
          {heroUnit && <UnitCardHero unit={heroUnit} />}

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
