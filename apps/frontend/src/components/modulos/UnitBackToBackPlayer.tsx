"use client";

import { Check, ChevronLeft, ChevronRight, Maximize2, Minimize2 } from "lucide-react";
import * as React from "react";

import { BlockRenderer } from "@/components/modulos/BlockRenderer";
import { UnitCompletionCard } from "@/components/modulos/UnitCompletionCard";
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
  onComplete: () => void;
  onClose: () => void;
}

/** Player desktop 2 columnas + índice + focus mode (TASK B-05). */
export function UnitBackToBackPlayer({ unit, attempt, onComplete, onClose }: UnitBackToBackPlayerProps) {
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [blockProgress, setBlockProgress] = React.useState<BlockProgressOut[]>(attempt.block_progress);
  const [focusMode, setFocusMode] = React.useState(false);
  const [showCompletion, setShowCompletion] = React.useState(false);
  const [quizStats, setQuizStats] = React.useState({ correct: 0, total: 0 });

  const currentBlock = unit.blocks[currentIndex];
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
        <button
          type="button"
          onClick={onComplete}
          className="mt-4 w-full text-center font-sans text-sm font-semibold text-fg-muted"
        >
          Volver
        </button>
      </div>
    );
  }

  return (
    <div className={cn(focusMode ? "fixed inset-0 z-50 flex flex-col bg-bg p-8" : "flex flex-col gap-4")}>
      {!focusMode && (
        <div className="flex gap-1">
          {unit.blocks.map((b, i) => {
            const completed = blockProgress.some((bp) => bp.unit_block_id === b.id && bp.status === "completed");
            return (
              <div key={b.id} className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg-sunken">
                <div
                  className={cn(
                    "h-full rounded-full bg-primary",
                    completed ? "w-full" : i === currentIndex ? "w-1/2 opacity-60" : "w-0",
                  )}
                />
              </div>
            );
          })}
        </div>
      )}

      <div className={cn("grid gap-6", focusMode ? "flex-1 grid-cols-1 place-items-center" : "grid-cols-[1fr_280px]")}>
        <div
          className={cn(
            "min-w-0 overflow-y-auto rounded-lg border border-border bg-bg-raised p-8",
            focusMode && "w-full max-w-2xl",
          )}
        >
          <BlockRenderer
            block={currentBlock}
            isCompleted={isCurrentCompleted}
            onCompleteBlock={onCompleteBlock}
            onSubmitQuiz={onSubmitQuiz}
            onSubmitReflection={onSubmitReflection}
          />
        </div>

        {!focusMode && (
          <nav aria-label="Índice de bloques" className="flex flex-col gap-1">
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
                    "flex items-center gap-2 rounded-md px-3 py-2 text-left font-sans text-sm transition-colors",
                    "disabled:cursor-not-allowed disabled:opacity-40",
                    active ? "bg-hg-green-100 font-semibold text-primary" : "text-fg-muted hover:bg-bg-sunken",
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
            className="rounded-md p-2 text-fg-muted hover:bg-bg-sunken"
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
              className="font-sans text-sm text-fg-muted hover:text-fg"
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
