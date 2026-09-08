"use client";

import type { Route } from "next";
import Link from "next/link";
import * as React from "react";

import { EmptyRing } from "@/components/EmptyRing";
import { ModuloDetailView } from "@/components/modulos/ModuloDetailView";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Display } from "@/components/ui/display";
import { Eyebrow } from "@/components/ui/eyebrow";
import { apiGetModulosFeed, apiGetMyPath } from "@/lib/api";

/**
 * Módulos ya no es un catálogo: abre directo lo que sigue.
 *
 * Orden de resolución:
 *   1. Módulo en curso — el `hero` del feed ya es "attempt en progreso, si no el
 *      siguiente disponible", así que un hero `in_progress` es exactamente eso.
 *   2. `next_step` de tu ruta (`GET /me/path`), que es la secuencia recomendada.
 *   3. Hero del feed, como red de seguridad si la ruta viene vacía.
 *
 * Solo resuelve el slug: la pantalla de apertura y el player los pone
 * `ModuloDetailView`, que además es quien decide crear el attempt (nunca acá —
 * `start` resetea un módulo ya completado).
 *
 * El catálogo para explorar y repasar vive en Mi Ruta ("Explorá por dimensión").
 */
export function ModulosLauncher() {
  const [status, setStatus] = React.useState<"loading" | "error" | "empty" | "ok">("loading");
  const [slug, setSlug] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setStatus("loading");
    try {
      const [path, feed] = await Promise.all([
        apiGetMyPath().catch(() => null),
        apiGetModulosFeed().catch(() => null),
      ]);

      const inProgress =
        feed?.hero && feed.hero.attempt_status === "in_progress" ? feed.hero.slug : null;
      const target = inProgress ?? path?.next_step?.slug ?? feed?.hero?.slug ?? null;

      if (!target) {
        setStatus("empty");
        return;
      }
      setSlug(target);
      setStatus("ok");
    } catch {
      setStatus("error");
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  if (status === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <EmptyRing label="Buscando tu próximo módulo…" />
      </div>
    );
  }

  if (status === "error") {
    return (
      <main className="mx-auto w-full max-w-app px-6 py-10">
        <Card className="flex flex-col items-center gap-4 py-12 text-center">
          <p className="text-sm text-fg-muted">No pudimos abrir tu próximo módulo.</p>
          <Button variant="secondary" size="sm" onClick={() => void load()}>
            Reintentar
          </Button>
        </Card>
      </main>
    );
  }

  if (status === "empty" || !slug) {
    return (
      <main className="mx-auto w-full max-w-app px-6 py-10">
        <Eyebrow accent>Módulos</Eyebrow>
        <Display variant="display-2" className="mt-2">
          Estás al día
        </Display>
        <p className="mt-3 max-w-prose text-md text-fg-muted">
          Completaste todo lo que hay publicado para vos. Podés repasar lo que ya viste desde tu
          ruta, mientras preparamos contenido nuevo.
        </p>
        <div className="mt-6">
          <Link href={"/path" as Route}>
            <Button size="lg">Ver mi ruta</Button>
          </Link>
        </div>
      </main>
    );
  }

  // `resumeScreen`: al entrar por Módulos siempre se ve primero la apertura del
  // módulo (Comenzar / Continuar / Repasar). Los deep links a un módulo puntual
  // siguen entrando directo al player si ya tenían progreso.
  return <ModuloDetailView slug={slug} resumeScreen />;
}
