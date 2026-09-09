"use client";

import axios from "axios";
import { useRouter } from "next/navigation";
import * as React from "react";

import { UnitBackToBackPlayer } from "@/components/modulos/UnitBackToBackPlayer";
import { UnitOpeningScreen } from "@/components/modulos/UnitOpeningScreen";
import { UnitStoriesPlayer } from "@/components/modulos/UnitStoriesPlayer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyRing } from "@/components/EmptyRing";
import { apiGetAttempt, apiGetModulo, apiStartAttempt } from "@/lib/api";
import { useMediaQuery } from "@/lib/hooks/useMediaQuery";
import { toast } from "@/lib/toast-store";
import type { LearningUnitAttempt, LearningUnitDetail } from "@/lib/types";

/**
 * Detalle de un módulo: pantalla de apertura → player.
 *
 * **El attempt se LEE al montar y solo se crea/resetea cuando el usuario toca
 * el CTA.** Antes se llamaba `apiStartAttempt` en paralelo al fetch de la unit,
 * y ese endpoint resetea un attempt ya completado ("Repasar" vuelve a hacer la
 * unit: el backend no guarda las respuestas históricas para un modo read-only,
 * ver B-06/B-07). Con Módulos abriendo automáticamente el siguiente de la ruta,
 * eso borraba progreso sin que nadie tocara nada.
 *
 * Retomar una unit con progreso entra directo al player y no llama a `start`:
 * el attempt ya existe. La excepción es `resumeScreen`, que usa el launcher de
 * Módulos: como ahí no hubo un click sobre un módulo concreto, primero se muestra
 * la pantalla de "Continuar" para que quede claro qué se está por abrir.
 *
 * Layout switcher mobile/desktop vía useMediaQuery (creado en B-05).
 */
export function ModuloDetailView({
  slug,
  resumeScreen = false,
}: {
  slug: string;
  /** Mostrar la pantalla "Continuar" antes del player al retomar (launcher). */
  resumeScreen?: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = React.useState<"loading" | "error" | "ok">("loading");
  const [unit, setUnit] = React.useState<LearningUnitDetail | null>(null);
  const [attempt, setAttempt] = React.useState<LearningUnitAttempt | null>(null);
  // Pantalla de apertura (TASK 10) salvo cuando se retoma una unit con progreso.
  const [started, setStarted] = React.useState(false);
  const [starting, setStarting] = React.useState(false);
  const isDesktop = useMediaQuery("(min-width: 769px)");

  const load = React.useCallback(async () => {
    setStatus("loading");
    try {
      const [u, a] = await Promise.all([
        apiGetModulo(slug),
        // 404 = todavía no hay attempt. Leer no crea nada (a diferencia de start).
        apiGetAttempt(slug).catch(() => null),
      ]);
      setUnit(u);
      setAttempt(a);
      setStatus("ok");
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 404) {
        toast("Módulo no encontrado", "danger");
        router.replace("/path");
        return;
      }
      setStatus("error");
    }
  }, [slug, router]);

  /** Crea (o resetea, si estaba completada) el attempt y entra al player. */
  const beginAttempt = React.useCallback(async () => {
    setStarting(true);
    try {
      setAttempt(await apiStartAttempt(slug));
      setStarted(true);
    } catch {
      toast("No pudimos abrir este módulo. Probá de nuevo.", "danger");
    } finally {
      setStarting(false);
    }
  }, [slug]);

  React.useEffect(() => {
    void load();
  }, [load]);

  // Salir de un módulo vuelve a Mi Ruta, no a /modulos: /modulos abre
  // automáticamente el siguiente módulo, así que volver ahí sería una cinta sin
  // salida — completás uno y ya estás dentro del próximo. La pantalla de
  // finalización (UnitCompletionCard) ya ofrece "Siguiente módulo" y "Volver a
  // Mi Ruta" como links directos, así que no hace falta un callback acá.
  function handleClose() {
    router.push("/path");
  }

  if (status === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <EmptyRing label="Cargando módulo…" />
      </div>
    );
  }

  if (status === "error" || !unit) {
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

  // Progreso en curso = attempt sin terminar y con bloques ya hechos: se retoma
  // directo. El resto (sin attempt, sin progreso, o ya completada) pasa por la
  // pantalla de apertura, que es donde se decide crear o resetear el attempt.
  const inProgress =
    attempt !== null && attempt.completed_at === null && attempt.block_progress.length > 0;
  if (!started && (!inProgress || resumeScreen)) {
    const mode = inProgress ? "resume" : attempt?.completed_at ? "review" : "start";
    return (
      <UnitOpeningScreen
        unit={unit}
        mode={mode}
        busy={starting}
        progress={
          inProgress && attempt
            ? {
                completed: attempt.block_progress.filter((b) => b.status === "completed").length,
                total: unit.blocks.length,
              }
            : undefined
        }
        // Retomar no crea nada: el attempt ya existe, así que solo entramos al
        // player. Crear/resetear es solo para empezar o repasar.
        onStart={() => (inProgress ? setStarted(true) : void beginAttempt())}
      />
    );
  }

  if (!attempt) return null; // beginAttempt lo setea antes de marcar `started`

  if (isDesktop) {
    return (
      // Altura completa del área disponible (100vh − banner/topbar): el módulo
      // NO scrollea la página; el contenido del bloque scrollea adentro y el
      // botón "Siguiente" queda siempre visible.
      <main className="mx-auto flex h-full w-full max-w-app flex-col px-6 py-6">
        <UnitBackToBackPlayer unit={unit} attempt={attempt} onClose={handleClose} />
      </main>
    );
  }

  return (
    <UnitStoriesPlayer unit={unit} attempt={attempt} onClose={handleClose} />
  );
}
