"use client";

import { Flame, X } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

import { EmptyRing } from "@/components/EmptyRing";
import { UnitCardCompact } from "@/components/modulos/UnitCardCompact";
import { UnitCardHero } from "@/components/modulos/UnitCardHero";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Display } from "@/components/ui/display";
import { Eyebrow } from "@/components/ui/eyebrow";
import { apiGetHomeDashboard, apiGetModulosFeed, apiListModulosByPillar } from "@/lib/api";
import { pillarShortName } from "@/lib/pillars";
import type { LearningUnitFeed, LearningUnitFeedItem } from "@/lib/types";

function ModulosPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pillarFilter = searchParams.get("pillar");

  const [status, setStatus] = React.useState<"loading" | "error" | "ok">("loading");
  const [feed, setFeed] = React.useState<LearningUnitFeed | null>(null);
  const [filteredUnits, setFilteredUnits] = React.useState<LearningUnitFeedItem[] | null>(null);
  const [streakDays, setStreakDays] = React.useState<number | null>(null);

  const load = React.useCallback(async () => {
    setStatus("loading");
    try {
      if (pillarFilter) {
        const units = await apiListModulosByPillar(pillarFilter, undefined, 20);
        setFilteredUnits(units);
      } else {
        const data = await apiGetModulosFeed();
        setFeed(data);
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
  }, [pillarFilter]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const isEmpty =
    pillarFilter
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

      {pillarFilter && (
        <div className="mt-4 flex items-center gap-2">
          <Chip active onClick={() => router.push("/modulos" as Route)} className="pr-2">
            Filtrando: {pillarShortName(pillarFilter)}
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
            {pillarFilter ? "Todavía no hay módulos publicados para este pilar." : "Todavía no hay módulos para vos."}
          </p>
          <p className="max-w-prose text-sm text-fg-muted">
            Volvé más tarde — tu coach está preparando nuevo contenido.
          </p>
        </Card>
      )}

      {status === "ok" && !isEmpty && pillarFilter && filteredUnits && (
        <div className="mt-8 flex flex-col gap-3">
          {filteredUnits.map((unit) => (
            <UnitCardCompact key={unit.id} unit={unit} />
          ))}
        </div>
      )}

      {status === "ok" && !isEmpty && !pillarFilter && feed && (
        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
          <div className="flex min-w-0 flex-col gap-8">
            {feed.hero && <UnitCardHero unit={feed.hero} />}

            {streakDays !== null && streakDays > 0 && (
              <div className="flex items-center gap-2 self-start rounded-md bg-bg-sunken px-3 py-2">
                <Flame size={18} strokeWidth={1.75} className="text-primary" aria-hidden />
                <span className="font-sans text-sm font-semibold text-fg">
                  {streakDays} {streakDays === 1 ? "día seguido" : "días seguidos"}
                </span>
              </div>
            )}

            {feed.next.length > 0 && (
              <section>
                <Eyebrow className="mb-3">Próximos en tu ruta</Eyebrow>
                <div className="flex flex-col gap-3">
                  {feed.next.map((unit) => (
                    <UnitCardCompact key={unit.id} unit={unit} />
                  ))}
                </div>
              </section>
            )}

            <Link
              href={"/eventos" as Route}
              className="self-start font-sans text-sm font-semibold text-primary lg:hidden"
            >
              Explorar catálogo de eventos →
            </Link>
          </div>

          <aside className="hidden flex-col gap-6 lg:flex">
            {streakDays !== null && streakDays > 0 && (
              <Card className="flex items-center gap-3">
                <Flame size={22} strokeWidth={1.75} className="text-primary" aria-hidden />
                <div>
                  <p className="font-mono text-2xl font-semibold text-fg">{streakDays}</p>
                  <p className="text-xs text-fg-muted">
                    {streakDays === 1 ? "día seguido" : "días seguidos"}
                  </p>
                </div>
              </Card>
            )}
            <Card>
              <p className="font-sans text-sm font-semibold text-fg">¿Buscás algo puntual?</p>
              <p className="mt-1 text-sm text-fg-muted">
                Explorá el catálogo completo de eventos grabados.
              </p>
              <Link
                href={"/eventos" as Route}
                className="mt-3 inline-block font-sans text-sm font-semibold text-primary"
              >
                Explorar catálogo →
              </Link>
            </Card>
          </aside>
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
