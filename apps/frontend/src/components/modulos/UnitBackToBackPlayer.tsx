"use client";

import { Check, ChevronLeft, ChevronRight, Maximize2, Minimize2 } from "lucide-react";
import * as React from "react";

import { BlockRenderer } from "@/components/modulos/BlockRenderer";
import { isPillarMarkBlock } from "@/components/modulos/blocks/pillar-mark-context";
import { BlockTransition } from "@/components/modulos/BlockTransition";
import { SegmentedProgress } from "@/components/modulos/SegmentedProgress";
import { UnitCompletionCard } from "@/components/modulos/UnitCompletionCard";
import { AISoonBadge } from "@/components/shared/AISoonBadge";
import { Button } from "@/components/ui/button";
import { apiCompleteBlock, apiSubmitQuiz, apiSubmitReflection } from "@/lib/api";
import type {
  BlockProgressOut,
  LearningUnitAttempt,
  LearningUnitDetail,
  QuizSubmitPayload,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const BLOCK_TYPE_LABEL: Record<string, string> = {
  video_intro: "Video",
  video_teaching: "Video",
  video_closing: "Video",
  text_context: "Contexto",
  text_evidence: "Evidencia",
  text_solution: "Solución",
  quiz_recall: "Quiz",
  reflection_write: "Reflexión",
};

export interface UnitBackToBackPlayerProps {
  unit: LearningUnitDetail;
  attempt: LearningUnitAttempt;
  onClose: () => void;
}

/** Player desktop 2 columnas + índice + focus mode (TASK B-05). */
export function UnitBackToBackPlayer({ unit, attempt, onClose }: UnitBackToBackPlayerProps) {
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [blockProgress, setBlockProgress] = React.useState<BlockProgressOut[]>(attempt.block_progress);
  const [focusMode, setFocusMode] = React.useState(false);
  const [showCompletion, setShowCompletion] = React.useState(false);
  const [quizStats, setQuizStats] = React.useState({ correct: 0, total: 0 });

  const currentBlock = unit.blocks[currentIndex];
  const isVideoBlock = currentBlock.block_type.startsWith("video_");
  const currentProgress = blockProgress.find((bp) => bp.unit_block_id === currentBlock.id);
  const isCurrentCompleted = currentProgress?.status === "completed";
  const canAdvance = !currentBlock.required || isCurrentCompleted;
  const isLastBlock = currentIndex === unit.blocks.length - 1;

  /** Bloques alcanzables por click en el índice: completed + el siguiente
   * inmediato — mismo gating lineal que el player mobile. */
  const maxReachableIndex = React.useMemo(() => {
    for (let i = 0; i < unit.blocks.length; i++) {
      const b = unit.blocks[i];
      const completed = blockProgress.some((bp) => bp.unit_block_id === b.id && bp.status === "completed");
      if (b.required && !completed) return i;
    }
    return unit.blocks.length - 1;
  }, [unit.blocks, blockProgress]);

  function upsertProgress(bp: BlockProgressOut) {
    setBlockProgress((prev) => [...prev.filter((p) => p.unit_block_id !== bp.unit_block_id), bp]);
  }

  function goNext() {
    if (!canAdvance) return;
    if (isLastBlock) {
      setShowCompletion(true);
      return;
    }
    setCurrentIndex((i) => i + 1);
  }

  function goPrev() {
    if (currentIndex === 0) return;
    setCurrentIndex((i) => i - 1);
  }

  function jumpTo(index: number) {
    if (index > maxReachableIndex) return;
    setCurrentIndex(index);
  }

  async function onCompleteBlock() {
    const bp = await apiCompleteBlock(unit.slug, currentBlock.id);
    upsertProgress(bp);
  }

  async function onSubmitQuiz(responses: QuizSubmitPayload[]) {
    const res = await apiSubmitQuiz(unit.slug, currentBlock.id, responses);
    upsertProgress({
      unit_block_id: currentBlock.id,
      status: res.block_completed ? "completed" : "started",
      submitted_at: new Date().toISOString(),
    });
    const correct = res.results.filter((r) => r.is_correct).length;
    setQuizStats((prev) => ({ correct: prev.correct + correct, total: prev.total + res.results.length }));
    return res;
  }

  async function onSubmitReflection(text: string) {
    await apiSubmitReflection(unit.slug, currentBlock.id, text);
    upsertProgress({
      unit_block_id: currentBlock.id,
      status: "completed",
      submitted_at: new Date().toISOString(),
    });
  }

  /** ←/→ navega, F togglea focus mode. "Espacio toggle play video" del spec
   * queda sin implementar — el iframe de YouTube (MVP sin JSAPI, ver B-06)
   * no expone un control de play/pause programático. */
  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key.toLowerCase() === "f") setFocusMode((v) => !v);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, canAdvance, isLastBlock]);

  if (showCompletion) {
    return (
      <div className="mx-auto w-full max-w-lg py-16">
        <UnitCompletionCard
          unit={unit}
          attempt={{ ...attempt, block_progress: blockProgress, completed_at: new Date().toISOString() }}
          quizStats={quizStats.total > 0 ? quizStats : undefined}
        />
      </div>
    );
  }

  return (
    <div className={cn(focusMode ? "glass-ambient fixed inset-0 z-50 flex flex-col p-8" : "flex h-full flex-col gap-4")}>
      {!focusMode && (
        <SegmentedProgress blocks={unit.blocks} blockProgress={blockProgress} currentIndex={currentIndex} />
      )}

      <div className={cn("grid min-h-0 gap-6", focusMode ? "flex-1 grid-cols-1 place-items-center" : "flex-1 grid-cols-[1fr_280px]")}>
        <div
          className={cn(
            "min-w-0 min-h-0",
            // Video 9:16 vertical (TASK 2 · full-bleed): panel portrait alto
            // (85vh, más inmersivo) y ancho derivado por el aspect; el
            // VideoBlockView (h-full) lo llena con object-cover. Sin borde ni
            // redondeo → edge-to-edge estilo Reels.
            isVideoBlock
              ? // TASK 2 · full-bleed 9:16 edge-to-edge. `max-h-full` lo capa a la
                // altura disponible (100vh − nav) para que quepa sin scroll.
                "mx-auto aspect-[9/16] h-[85vh] max-h-full self-start overflow-hidden bg-black"
              : // TASK 3: sin card/borde — el BlockScreenLayout (h-full + overflow-y-auto)
                // scrollea el texto largo adentro; el botón "Siguiente" no se mueve.
                "h-full overflow-hidden rounded-lg",
            !isVideoBlock && focusMode && "w-full max-w-2xl",
          )}
        >
          <BlockTransition
            blockKey={currentBlock.id}
            tone={unit.narrative_tone}
            className="h-full w-full"
          >
            <BlockRenderer
              block={currentBlock}
              dimensionCode={unit.dimension_code}
              narrativeTone={unit.narrative_tone}
              showPillarMark={isPillarMarkBlock(unit.blocks, currentIndex)}
              isCompleted={isCurrentCompleted}
              onCompleteBlock={onCompleteBlock}
              onSubmitQuiz={onSubmitQuiz}
              onSubmitReflection={onSubmitReflection}
              onAdvance={goNext}
            />
          </BlockTransition>
        </div>

        {!focusMode && (
          <nav
            aria-label="Índice de bloques"
            className="glass-surface-strong flex max-h-full min-h-0 flex-col gap-1 self-start overflow-y-auto p-2"
          >
            {unit.blocks.map((b, i) => {
              const completed = blockProgress.some((bp) => bp.unit_block_id === b.id && bp.status === "completed");
              const reachable = i <= maxReachableIndex;
              const active = i === currentIndex;
              return (
                <button
                  key={b.id}
                  type="button"
                  disabled={!reachable}
                  onClick={() => jumpTo(i)}
                  aria-current={active ? "step" : undefined}
                  className={cn(
                    "flex items-center gap-2 rounded-md border px-3 py-2 text-left font-sans text-sm transition-colors",
                    "disabled:cursor-not-allowed disabled:opacity-40",
                    // Fila activa: glass-inset + text-fg (text-primary no llega a 4.5:1 en dark; ver glass-contrast.test).
                    active ? "glass-inset font-semibold text-fg" : "glass-hover-bg border-transparent text-fg-muted",
                  )}
                >
                  {completed ? (
                    <Check size={16} strokeWidth={2} className="shrink-0 text-success" />
                  ) : (
                    <span
                      className={cn(
                        "h-2 w-2 shrink-0 rounded-full",
                        active ? "bg-primary" : "bg-border-strong",
                      )}
                    />
                  )}
                  {BLOCK_TYPE_LABEL[b.block_type] ?? b.block_type}
                </button>
              );
            })}
            <AISoonBadge
              variant="pill"
              label="Chatear con esta dimensión"
              dimensionCode={unit.dimension_code}
              className="mt-2 self-start"
            />
          </nav>
        )}
      </div>

      <div className="flex items-center justify-between">
        <Button variant="secondary" onClick={goPrev} disabled={currentIndex === 0}>
          <ChevronLeft size={18} strokeWidth={1.75} /> Anterior
        </Button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFocusMode((v) => !v)}
            aria-label={focusMode ? "Salir de modo foco" : "Modo foco"}
            className="glass-fill glass-edge flex h-9 w-9 items-center justify-center rounded-full border text-fg"
          >
            {focusMode ? (
              <Minimize2 size={18} strokeWidth={1.75} />
            ) : (
              <Maximize2 size={18} strokeWidth={1.75} />
            )}
          </button>
          {focusMode && (
            <button
              type="button"
              onClick={onClose}
              className="glass-fill glass-edge rounded-full border px-4 py-2 font-sans text-sm font-semibold text-fg"
            >
              Cerrar
            </button>
          )}
        </div>
        <Button onClick={goNext} disabled={!canAdvance}>
          Siguiente <ChevronRight size={18} strokeWidth={1.75} />
        </Button>
      </div>
    </div>
  );
}
