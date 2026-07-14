"use client";

import { Flame } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import * as React from "react";

import { EmptyRing } from "@/components/EmptyRing";
import { UnitCardCompact } from "@/components/modulos/UnitCardCompact";
import { UnitCardHero } from "@/components/modulos/UnitCardHero";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Display } from "@/components/ui/display";
import { Eyebrow } from "@/components/ui/eyebrow";
import { apiGetHomeDashboard, apiGetModulosFeed } from "@/lib/api";
import type { LearningUnitFeed } from "@/lib/types";

export default function ModulosPage() {
  const [status, setStatus] = React.useState<"loading" | "error" | "ok">("loading");
  const [feed, setFeed] = React.useState<LearningUnitFeed | null>(null);
  const [streakDays, setStreakDays] = React.useState<number | null>(null);

  const load = React.useCallback(async () => {
    setStatus("loading");
    try {
      const data = await apiGetModulosFeed();
      setFeed(data);
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
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const isEmpty = feed !== null && feed.hero === null && feed.next.length === 0;

  return (
    <main className="mx-auto w-full max-w-app px-6 py-10">
      <Eyebrow accent>Módulos</Eyebrow>
      <Display variant="display-2" className="mt-2">
        Aprendé algo hoy
      </Display>
      <p className="mt-3 max-w-prose text-md text-fg-muted">
        Micro-lecciones de 3 a 10 minutos, con evidencia y práctica.
      </p>

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

      {status === "ok" && feed && isEmpty && (
        <Card className="mt-8 flex flex-col items-center gap-2 py-16 text-center">
          <p className="font-sans text-md font-semibold text-fg">Todavía no hay módulos para vos.</p>
          <p className="max-w-prose text-sm text-fg-muted">
            Volvé más tarde — tu coach está preparando nuevo contenido.
          </p>
        </Card>
      )}

      {status === "ok" && feed && !isEmpty && (
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
