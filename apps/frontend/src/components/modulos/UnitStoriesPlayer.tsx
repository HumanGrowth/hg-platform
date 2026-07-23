"use client";

import { motion } from "framer-motion";
import { X } from "lucide-react";
import * as React from "react";

import { BlockRenderer } from "@/components/modulos/BlockRenderer";
import { UnitCompletionCard } from "@/components/modulos/UnitCompletionCard";
import { Chip } from "@/components/ui/chip";
import { Dialog } from "@/components/ui/dialog";
import { apiCompleteBlock, apiSubmitQuiz, apiSubmitReflection } from "@/lib/api";
import { useShouldAnimate } from "@/lib/motion/useShouldAnimate";
import type {
  BlockProgressOut,
  LearningUnitAttempt,
  LearningUnitDetail,
  QuizSubmitPayload,
  VideoBlock,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const CLOSE_SWIPE_THRESHOLD = 120;
const LONG_PRESS_MS = 400;
const SHORT_VIDEO_SECONDS = 30;

export interface UnitStoriesPlayerProps {
  unit: LearningUnitDetail;
  attempt: LearningUnitAttempt;
  onComplete: () => void;
  onClose: () => void;
}

/**
 * Player mobile fullscreen "stories" (TASK B-04) — navegación por tap
 * izq/der, progreso segmentado, swipe-down para cerrar (con confirmación si
 * hay progreso), auto-advance opcional en video con long-press para pausar.
 */
export function UnitStoriesPlayer({ unit, attempt, onComplete, onClose }: UnitStoriesPlayerProps) {
  const shouldAnimate = useShouldAnimate();
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [blockProgress, setBlockProgress] = React.useState<BlockProgressOut[]>(attempt.block_progress);
  const [showCompletion, setShowCompletion] = React.useState(false);
  const [showExitConfirm, setShowExitConfirm] = React.useState(false);
  const [showHint, setShowHint] = React.useState(true);
  const [autoAdvanceOverride, setAutoAdvanceOverride] = React.useState<boolean | null>(null);
  const [quizStats, setQuizStats] = React.useState({ correct: 0, total: 0 });
  const autoAdvanceTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentBlock = unit.blocks[currentIndex];
  const currentProgress = blockProgress.find((bp) => bp.unit_block_id === currentBlock.id);
  const isCurrentCompleted = currentProgress?.status === "completed";
  const canAdvance = !currentBlock.required || isCurrentCompleted;
  const isLastBlock = currentIndex === unit.blocks.length - 1;
  const hasProgress = currentIndex > 0 || blockProgress.length > 0;

  function upsertProgress(bp: BlockProgressOut) {
    setBlockProgress((prev) => [...prev.filter((p) => p.unit_block_id !== bp.unit_block_id), bp]);
  }

  function goNext() {
    setShowHint(false);
    if (!canAdvance) return;
    if (isLastBlock) {
      setShowCompletion(true);
      return;
    }
    setCurrentIndex((i) => i + 1);
  }

  function goPrev() {
    setShowHint(false);
    if (currentIndex === 0) return;
    setCurrentIndex((i) => i - 1);
  }

  function requestClose() {
    if (hasProgress) {
      setShowExitConfirm(true);
    } else {
      onClose();
    }
  }

  // ─── Handlers pasados a BlockRenderer (bindeados al bloque actual) ───

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

  // ─── Auto-advance en bloques de video (con long-press para pausar) ───

  const isVideoBlock =
    currentBlock.block_type === "video_intro" ||
    currentBlock.block_type === "video_teaching" ||
    currentBlock.block_type === "video_closing";

  const videoDurationSeconds = isVideoBlock ? (currentBlock as VideoBlock).duration_seconds : null;
  const defaultAutoAdvance = videoDurationSeconds !== null && videoDurationSeconds < SHORT_VIDEO_SECONDS;
  const autoAdvanceActive = autoAdvanceOverride ?? defaultAutoAdvance;

  React.useEffect(() => {
    if (!shouldAnimate || !isVideoBlock || !autoAdvanceActive || videoDurationSeconds === null) return;
    autoAdvanceTimer.current = setTimeout(() => goNext(), videoDurationSeconds * 1000);
    return () => {
      if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, shouldAnimate, isVideoBlock, autoAdvanceActive, videoDurationSeconds]);

  function cancelAutoAdvance() {
    if (autoAdvanceTimer.current) {
      clearTimeout(autoAdvanceTimer.current);
      autoAdvanceTimer.current = null;
    }
  }

  /** A11y (TASK B-10): el player es fullscreen y sin esto quedaba inalcanzable
   * por teclado — Esc cierra, ←/→ navegan igual que los tap zones. */
  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      if (e.key === "Escape") requestClose();
      else if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goPrev();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, canAdvance, isLastBlock, hasProgress]);

  function onVideoPressStart() {
    longPressTimer.current = setTimeout(cancelAutoAdvance, LONG_PRESS_MS);
  }
  function onVideoPressEnd() {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }

  if (showCompletion) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg p-4">
        <div className="w-full max-w-md">
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
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  const content = (
    <div className="flex h-full flex-col">
      {/* Header: progress marker + X — en flujo, arriba de todo. El video 9:16
          se ubica DEBAJO de este marcador (no lo tapa). */}
      <div className="flex items-center gap-3 px-4 pt-4">
        <div className="flex flex-1 gap-1">
          {unit.blocks.map((b, i) => {
            const completed = blockProgress.some((bp) => bp.unit_block_id === b.id && bp.status === "completed");
            return (
              <div key={b.id} className="h-1 flex-1 overflow-hidden rounded-full bg-bg-sunken">
                <div
                  className={cn(
                    "h-full rounded-full transition-[width] duration-base",
                    completed ? "w-full bg-primary" : i === currentIndex ? "w-1/2 bg-primary" : "w-0",
                  )}
                />
              </div>
            );
          })}
        </div>
        <button
          type="button"
          onClick={requestClose}
          aria-label="Cerrar"
          className="rounded-full p-1.5 text-fg-muted hover:bg-bg-sunken"
        >
          <X size={22} strokeWidth={1.75} />
        </button>
      </div>

      {/* Body: tap zones a los costados + bloque. El video 9:16 llena la altura
          disponible debajo del marcador (aspect-[9/16] centrado). */}
      <div className="relative flex min-h-0 flex-1 items-center">
        <button
          type="button"
          aria-label="Bloque anterior"
          onClick={goPrev}
          className="absolute inset-y-0 left-0 z-10 w-[15%] focus-visible:outline-none"
        />
        <button
          type="button"
          aria-label="Siguiente bloque"
          onClick={goNext}
          className="absolute inset-y-0 right-0 z-10 w-[15%] focus-visible:outline-none"
        />
        <div
          // Video 9:16 (TASK player-02 · corregido): el wrapper es `h-full`
          // (le da altura al box 9:16 que se centra dentro) sin padding ni
          // max-w. Text/quiz/reflection mantienen ancho de lectura + padding.
          className={
            isVideoBlock
              ? "relative z-0 flex h-full w-full items-center justify-center"
              : "relative z-0 mx-auto w-full max-w-md overflow-y-auto px-6 py-6"
          }
          onTouchStart={isVideoBlock ? onVideoPressStart : undefined}
          onTouchEnd={isVideoBlock ? onVideoPressEnd : undefined}
          onMouseDown={isVideoBlock ? onVideoPressStart : undefined}
          onMouseUp={isVideoBlock ? onVideoPressEnd : undefined}
        >
          <BlockRenderer
            block={currentBlock}
            isCompleted={isCurrentCompleted}
            onCompleteBlock={onCompleteBlock}
            onSubmitQuiz={onSubmitQuiz}
            onSubmitReflection={onSubmitReflection}
          />
        </div>
      </div>

      {/* Footer: hint primera vez + toggle de auto-advance en videos */}
      <div className="flex h-10 items-center justify-center gap-3">
        {showHint && !isVideoBlock && (
          <p className="font-sans text-xs text-fg-subtle">Tocá los costados para avanzar</p>
        )}
        {isVideoBlock && (
          <Chip
            active={autoAdvanceActive}
            onClick={() => setAutoAdvanceOverride(!autoAdvanceActive)}
            className="text-[10px]"
          >
            Auto-avance {autoAdvanceActive ? "on" : "off"}
          </Chip>
        )}
      </div>
    </div>
  );

  return (
    <>
      {shouldAnimate ? (
        <motion.div
          className="fixed inset-0 z-50 bg-bg"
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 0.5 }}
          onDragEnd={(_, info) => {
            if (info.offset.y > CLOSE_SWIPE_THRESHOLD) requestClose();
          }}
        >
          {content}
        </motion.div>
      ) : (
        <div className="fixed inset-0 z-50 bg-bg">{content}</div>
      )}

      <Dialog
        open={showExitConfirm}
        onClose={() => setShowExitConfirm(false)}
        title="¿Salir del módulo?"
        description="Tu progreso queda guardado — podés retomarlo cuando quieras."
      >
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => setShowExitConfirm(false)}
            className="rounded-md px-4 py-2 font-sans text-sm font-semibold text-fg-muted hover:bg-bg-sunken"
          >
            Seguir acá
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-primary px-4 py-2 font-sans text-sm font-semibold text-white hover:bg-primary-hover"
          >
            Salir
          </button>
        </div>
      </Dialog>
    </>
  );
}
