"use client";

import axios from "axios";
import { useRouter } from "next/navigation";
import * as React from "react";

import { UnitBackToBackPlayer } from "@/components/modulos/UnitBackToBackPlayer";
import { UnitStoriesPlayer } from "@/components/modulos/UnitStoriesPlayer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyRing } from "@/components/EmptyRing";
import { apiGetModulo, apiStartAttempt } from "@/lib/api";
import { useMediaQuery } from "@/lib/hooks/useMediaQuery";
import { toast } from "@/lib/toast-store";
import type { LearningUnitAttempt, LearningUnitDetail } from "@/lib/types";

/**
 * TASK B-08: fetch de unit + attempt (start es idempotente — crea si no
 * existe, o resetea si ya estaba completed: "Repasar" desde el feed
 * literalmente vuelve a hacer la unit, no hay un modo read-only de una
 * unit ya completada porque el backend no guarda las respuestas
 * históricas para reconstruir ese review — ver notas de B-06/B-07).
 * Layout switcher mobile/desktop vía useMediaQuery (creado en B-05).
 */
export function ModuloDetailView({ slug }: { slug: string }) {
  const router = useRouter();
  const [status, setStatus] = React.useState<"loading" | "error" | "ok">("loading");
  const [unit, setUnit] = React.useState<LearningUnitDetail | null>(null);
  const [attempt, setAttempt] = React.useState<LearningUnitAttempt | null>(null);
  const isDesktop = useMediaQuery("(min-width: 769px)");

  const load = React.useCallback(async () => {
    setStatus("loading");
    try {
      const [u, a] = await Promise.all([apiGetModulo(slug), apiStartAttempt(slug)]);
      setUnit(u);
      setAttempt(a);
      setStatus("ok");
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 404) {
        toast("Módulo no encontrado", "danger");
        router.replace("/modulos");
        return;
      }
      setStatus("error");
    }
  }, [slug, router]);

  React.useEffect(() => {
    void load();
  }, [load]);

  function handleComplete() {
    toast("¡Módulo completado!", "success");
    router.push("/modulos");
  }

  function handleClose() {
    router.push("/modulos");
  }

  if (status === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <EmptyRing label="Cargando módulo…" />
      </div>
    );
  }

  if (status === "error" || !unit || !attempt) {
    return (
      <div className="mx-auto max-w-app px-6 py-20">
        <Card className="flex flex-col items-center gap-4 py-12 text-center">
          <p className="text-sm text-fg-muted">No pudimos cargar este módulo.</p>
          <Button variant="secondary" size="sm" onClick={() => void load()}>
            Reintentar
          </Button>
        </Card>
      </div>
    );
  }

  if (isDesktop) {
    return (
      <main className="mx-auto w-full max-w-app px-6 py-10">
        <UnitBackToBackPlayer
          unit={unit}
          attempt={attempt}
          onComplete={handleComplete}
          onClose={handleClose}
        />
      </main>
    );
  }

  return (
    <UnitStoriesPlayer unit={unit} attempt={attempt} onComplete={handleComplete} onClose={handleClose} />
  );
}
