"use client";

import { Check } from "lucide-react";
import { motion } from "framer-motion";
import type { Route } from "next";
import Link from "next/link";
import * as React from "react";

import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { buttonVariants } from "@/components/ui/button";
import { apiGetModulosFeed } from "@/lib/api";
import { useShouldAnimate } from "@/lib/motion/useShouldAnimate";
import { PILLARS, pillarBaseCode } from "@/lib/pillars";
import type { LearningUnitAttempt, LearningUnitDetail, LearningUnitFeedItem } from "@/lib/types";
import { cn, formatApproxMinutes } from "@/lib/utils";

export interface UnitCompletionCardProps {
  unit: LearningUnitDetail;
  attempt: LearningUnitAttempt;
  quizStats?: { correct: number; total: number };
}

/**
 * TASK B-07 — NO auto-play del próximo módulo (P5 desirable difficulties:
 * el usuario decide cuándo seguir, no lo empuja el producto). El fetch del
 * feed es solo para poder linkear "Siguiente módulo" a un slug concreto —
 * no hay cache compartida (SWR/react-query) en el resto del código como
 * para "invalidar"; esto simplemente refresca los datos que se muestran acá
 * y en cualquier página que se visite después (todas re-fetchean on mount).
 */
export function UnitCompletionCard({ unit, attempt, quizStats }: UnitCompletionCardProps) {
  const shouldAnimate = useShouldAnimate();
  const [nextUnit, setNextUnit] = React.useState<LearningUnitFeedItem | null>(null);

  React.useEffect(() => {
    let active = true;
    apiGetModulosFeed()
      .then((feed) => {
        if (!active) return;
        const candidate = [feed.hero, ...feed.next].find((u) => u && u.slug !== unit.slug);
        setNextUnit(candidate ?? null);
      })
      .catch(() => {
        // Best-effort: si falla, simplemente no se ofrece "Siguiente módulo".
      });
    return () => {
      active = false;
    };
  }, [unit.slug]);

  const pillarDot = PILLARS.find((p) => p.id === pillarBaseCode(unit.pillar_code))?.dot;
  const completedSteps = attempt.block_progress.filter((bp) => bp.status === "completed").length;
  const totalSteps = unit.blocks.length;

  return (
    <Card className="flex flex-col items-center gap-5 py-10 text-center">
      <div
        className={cn(
          "flex h-16 w-16 items-center justify-center rounded-full",
          pillarDot ?? "bg-bg-sunken",
        )}
      >
        {shouldAnimate ? (
          <motion.div
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
          >
            <Check size={32} strokeWidth={2.5} className="text-white" />
          </motion.div>
        ) : (
          <Check size={32} strokeWidth={2.5} className="text-white" />
        )}
      </div>
      <div>
        <Eyebrow accent>Módulo completado</Eyebrow>
        <h2 className="mt-2 font-sans text-xl font-semibold text-fg">{unit.title}</h2>
        <p className="mt-2 font-sans text-sm text-fg-muted">
          {completedSteps}/{totalSteps} pasos · {formatApproxMinutes(unit.estimated_duration_seconds)}
          {quizStats && ` · ${quizStats.correct}/${quizStats.total} correctas`}
        </p>
      </div>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row">
        {nextUnit && (
          <Link href={`/modulos/${nextUnit.slug}` as Route} className={cn(buttonVariants({ size: "lg" }))}>
            Siguiente módulo
          </Link>
        )}
        <Link
          href={"/modulos" as Route}
          className={cn(buttonVariants({ variant: "secondary", size: "lg" }))}
        >
          Volver a Módulos
        </Link>
      </div>
    </Card>
  );
}
