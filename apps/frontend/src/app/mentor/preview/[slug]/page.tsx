"use client";

import { MotionConfig } from "framer-motion";
import * as React from "react";

import { PreviewControls, type PreviewDevice, type ToneOption } from "@/components/mentor/PreviewControls";
import { BlockRenderer } from "@/components/modulos/BlockRenderer";
import { BlockTransition } from "@/components/modulos/BlockTransition";
import { UnitCompletionCard } from "@/components/modulos/UnitCompletionCard";
import { UnitOpeningScreen } from "@/components/modulos/UnitOpeningScreen";
import { EmptyRing } from "@/components/EmptyRing";
import { Button } from "@/components/ui/button";
import { apiGetModulo } from "@/lib/api";
import { detectChecklistItems, detectHeroStat } from "@/lib/parsers/autoDetect";
import type { LearningUnitAttempt, LearningUnitDetail, QuizSubmitResponse, TextBlock } from "@/lib/types";
import { cn } from "@/lib/utils";

const DEVICE_WIDTH: Record<PreviewDevice, string> = {
  mobile: "max-w-[390px]",
  tablet: "max-w-[834px]",
  desktop: "max-w-[1100px]",
};

// Handlers no-op — el preview es de sólo lectura (no persiste progreso).
const noopComplete = async () => {};
const noopReflection = async () => {};
const noopQuiz = async (): Promise<QuizSubmitResponse> => ({ results: [], block_completed: true });

function computeWarnings(unit: LearningUnitDetail): string[] {
  const w: string[] = [];
  if (!unit.narrative_tone) w.push("La unit no define narrative_tone → se usa la animación default.");
  for (const b of unit.blocks) {
    if (b.block_type === "text_evidence") {
      const tb = b as TextBlock;
      if (!tb.hero_stat && !detectHeroStat(tb.body)) {
        w.push(`Evidencia "${tb.eyebrow}": no se detecta un dato destacado (hero_stat).`);
      }
    }
    if (b.block_type === "text_solution") {
      const tb = b as TextBlock;
      const count = tb.checklist_items?.length ?? detectChecklistItems(tb.body)?.length ?? 0;
      if (count > 5) w.push(`Solución "${tb.eyebrow}": checklist con más de 5 pasos (se truncará a 5).`);
      if (count === 0) w.push(`Solución "${tb.eyebrow}": no se detecta una lista de pasos accionable.`);
    }
    if (b.block_type.startsWith("video_") && "chapters" in b && b.chapters) {
      const dur = (b as { duration_seconds: number }).duration_seconds;
      if (b.chapters.some((c) => c.start_sec > dur)) {
        w.push("Un capítulo arranca después del final del video.");
      }
    }
  }
  return w;
}

function fakeCompletedAttempt(unit: LearningUnitDetail): LearningUnitAttempt {
  return {
    id: "preview",
    unit_id: unit.id,
    started_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    block_progress: unit.blocks.map((b) => ({
      unit_block_id: b.id,
      status: "completed" as const,
      submitted_at: null,
    })),
  };
}

export default function MentorPreviewPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const [unit, setUnit] = React.useState<LearningUnitDetail | null>(null);
  const [status, setStatus] = React.useState<"loading" | "error" | "ok">("loading");

  const [tone, setTone] = React.useState<ToneOption>("default");
  const [device, setDevice] = React.useState<PreviewDevice>("mobile");
  const [reducedMotion, setReducedMotion] = React.useState(false);
  const [showOpening, setShowOpening] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    apiGetModulo(slug)
      .then((u) => {
        if (!active) return;
        setUnit(u);
        setStatus("ok");
      })
      .catch(() => active && setStatus("error"));
    return () => {
      active = false;
    };
  }, [slug]);

  // Unit con el tono simulado (override del narrative_tone).
  const previewUnit = React.useMemo<LearningUnitDetail | null>(
    () => (unit ? { ...unit, narrative_tone: tone === "default" ? null : tone } : null),
    [unit, tone],
  );

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <EmptyRing label="Cargando preview…" />
      </div>
    );
  }

  if (status === "error" || !previewUnit) {
    return (
      <div className="mx-auto max-w-md px-6 py-24 text-center">
        <p className="text-sm text-fg-muted">
          No pudimos cargar la unit <span className="font-mono">{slug}</span>. Verificá el slug o iniciá sesión.
        </p>
      </div>
    );
  }

  const warnings = computeWarnings(previewUnit);
  const isVideo = (t: string) => t.startsWith("video_");

  return (
    <MotionConfig reducedMotion={reducedMotion ? "always" : "never"}>
      <div className="min-h-screen bg-bg">
        <header className="border-b border-border px-6 py-4">
          <p className="font-sans text-micro font-semibold uppercase tracking-meta text-fg-muted">Preview del mentor</p>
          <h1 className="font-display text-2xl text-fg">{previewUnit.title}</h1>
        </header>

        <div className="mx-auto flex max-w-app flex-col gap-6 px-6 py-8 lg:flex-row">
          <PreviewControls
            tone={tone}
            onToneChange={setTone}
            device={device}
            onDeviceChange={setDevice}
            reducedMotion={reducedMotion}
            onReducedMotionChange={setReducedMotion}
            warnings={warnings}
          />

          <main className="min-w-0 flex-1">
            <div className="mb-4 flex justify-center">
              <Button variant="secondary" size="sm" onClick={() => setShowOpening(true)}>
                Ver pantalla de apertura
              </Button>
            </div>

            {/* Marco del dispositivo — usa los componentes reales de producción. */}
            <div className={cn("mx-auto flex flex-col gap-6", DEVICE_WIDTH[device])}>
              {previewUnit.blocks.map((b) => (
                <section
                  key={b.id}
                  className={cn(
                    "rounded-lg border border-border bg-bg-raised",
                    isVideo(b.block_type) ? "overflow-hidden" : "p-6",
                  )}
                >
                  {isVideo(b.block_type) ? (
                    <div className="mx-auto aspect-[9/16] h-[520px] max-h-[70vh] max-w-full overflow-hidden bg-black">
                      <BlockTransition blockKey={b.id} tone={previewUnit.narrative_tone} className="h-full w-full">
                        <BlockRenderer
                          block={b}
                          pillarCode={previewUnit.pillar_code}
                          isCompleted={false}
                          onCompleteBlock={noopComplete}
                          onSubmitQuiz={noopQuiz}
                          onSubmitReflection={noopReflection}
                        />
                      </BlockTransition>
                    </div>
                  ) : (
                    <BlockTransition blockKey={b.id} tone={previewUnit.narrative_tone} className="w-full">
                      <BlockRenderer
                        block={b}
                        pillarCode={previewUnit.pillar_code}
                        isCompleted={false}
                        onCompleteBlock={noopComplete}
                        onSubmitQuiz={noopQuiz}
                        onSubmitReflection={noopReflection}
                      />
                    </BlockTransition>
                  )}
                </section>
              ))}

              {/* Card de completado (T14) */}
              <UnitCompletionCard unit={previewUnit} attempt={fakeCompletedAttempt(previewUnit)} />
            </div>
          </main>
        </div>

        {showOpening && (
          <UnitOpeningScreen unit={previewUnit} onStart={() => setShowOpening(false)} />
        )}
      </div>
    </MotionConfig>
  );
}
