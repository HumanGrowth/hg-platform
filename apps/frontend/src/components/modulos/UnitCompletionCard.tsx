"use client";

import { motion } from "framer-motion";
import type { Route } from "next";
import Link from "next/link";
import * as React from "react";

import { DimensionMetaphor } from "@/components/modulos/DimensionMetaphor";
import { AISoonBadge } from "@/components/shared/AISoonBadge";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { buttonVariants } from "@/components/ui/button";
import { apiGetMyPath } from "@/lib/api";
import { useShouldAnimate } from "@/lib/motion/useShouldAnimate";
import { dimensionStyle } from "@/lib/dimension-styles";
import type { LearningUnitAttempt, LearningUnitDetail, PathStep } from "@/lib/types";
import { cn, formatApproxMinutes } from "@/lib/utils";

export interface UnitCompletionCardProps {
  unit: LearningUnitDetail;
  attempt: LearningUnitAttempt;
  quizStats?: { correct: number; total: number };
}

/**
 * TASK B-07 — NO auto-play del próximo módulo (P5 desirable difficulties:
 * el usuario decide cuándo seguir, no lo empuja el producto).
 *
 * "Siguiente módulo" se resuelve con `GET /me/path` — el MISMO motor que Mi
 * Ruta y el launcher de Módulos — para que los tres coincidan siempre en cuál
 * es "el siguiente". Antes pedía `/modulos/feed`, que elige su hero con lógica
 * propia (puede caer en cualquier unit publicada) — un desfase real: acá podía
 * ofrecer un módulo distinto al que Mi Ruta o Módulos abrían.
 */
export function UnitCompletionCard({ unit, attempt, quizStats }: UnitCompletionCardProps) {
  const shouldAnimate = useShouldAnimate();
  const [nextStep, setNextStep] = React.useState<PathStep | null>(null);

  React.useEffect(() => {
    let active = true;
    apiGetMyPath()
      .then((path) => {
        if (!active) return;
        setNextStep(path.next_step);
      })
      .catch(() => {
        // Best-effort: si falla, simplemente no se ofrece "Siguiente módulo".
      });
    return () => {
      active = false;
    };
  }, [unit.slug]);

  const style = dimensionStyle(unit.dimension_code);
  const completedSteps = attempt.block_progress.filter((bp) => bp.status === "completed").length;
  const totalSteps = unit.blocks.length;
  // TASK polish-06: el resumen del quiz se muestra en positivo/verde (nunca
  // rojo) — "respondiste bien X de Y" + barra verde, sin penalizar visualmente.
  const quizPct =
    quizStats && quizStats.total > 0 ? Math.round((quizStats.correct / quizStats.total) * 100) : 0;

  return (
    <Card className="flex flex-col items-center gap-5 py-10 text-center">
      {/* TASK 14: la metáfora del pilar con "brillo de estrella" (star-glow) —
          el momento de logro, sin confetti. */}
      <motion.div
        initial={shouldAnimate ? { scale: 0.6, opacity: 0 } : false}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 18 }}
        style={{
          color: style.glow,
          background: `color-mix(in srgb, ${style.glow} 10%, transparent)`,
          // Glow POSITIVO verde (logro), aunque la metáfora mantenga el color del pilar.
          ["--glow-color" as string]: "color-mix(in srgb, var(--color-success) 50%, transparent)",
        } as React.CSSProperties}
        className={cn(
          "flex h-20 w-20 items-center justify-center rounded-full",
          shouldAnimate && "animate-star-glow",
        )}
      >
        <DimensionMetaphor code={unit.dimension_code} className="h-12 w-12" />
      </motion.div>
      <div>
        <Eyebrow accent>Módulo completado</Eyebrow>
        <h2 className="mt-2 font-sans text-xl font-semibold text-fg">{unit.title}</h2>
        <p className="mt-2 font-sans text-sm text-fg-muted">
          {completedSteps}/{totalSteps} pasos · {formatApproxMinutes(unit.estimated_duration_seconds)}
        </p>
        {quizStats && quizStats.total > 0 && (
          <div className="mt-3 flex flex-col items-center gap-1.5">
            <p className="font-sans text-sm font-semibold text-success">
              Respondiste bien {quizStats.correct} de {quizStats.total}
            </p>
            <div className="h-1.5 w-40 overflow-hidden rounded-full bg-bg-sunken">
              <div className="h-full rounded-full bg-success" style={{ width: `${quizPct}%` }} />
            </div>
          </div>
        )}
      </div>
      <AISoonBadge
        variant="card"
        label="Próximamente: síntesis personalizada por AI"
        dimensionCode={unit.dimension_code}
        className="w-full max-w-sm"
      />
      <div className="mt-2 flex flex-col gap-3 sm:flex-row">
        {nextStep && (
          <Link
            href={`/modulos/${nextStep.slug}` as Route}
            className={cn(buttonVariants({ size: "lg" }))}
          >
            Siguiente módulo
          </Link>
        )}
        <Link
          href={"/path" as Route}
          className={cn(buttonVariants({ variant: "secondary", size: "lg" }))}
        >
          Volver a Mi Ruta
        </Link>
      </div>
    </Card>
  );
}
