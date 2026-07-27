"use client";

import { motion } from "framer-motion";
import * as React from "react";

import { PillarMetaphor } from "@/components/modulos/PillarMetaphor";
import { AISoonBadge } from "@/components/shared/AISoonBadge";
import { Button } from "@/components/ui/button";
import { useNarrativeTone } from "@/lib/motion/useNarrativeTone";
import { useShouldAnimate } from "@/lib/motion/useShouldAnimate";
import { PILLARS, dimensionStyle, dimensionToPillar } from "@/lib/pillars";
import type { LearningUnitDetail } from "@/lib/types";

function fmtDuration(sec: number | null): string | null {
  if (!sec || sec <= 0) return null;
  const min = Math.round(sec / 60);
  return `~${min} min`;
}

/**
 * Pantalla de apertura de una unit (Sprint UI · TASK 10). Presenta la metáfora
 * del pilar (line-art con el hue del pilar), el nombre de la dimensión y el
 * título en display, antes de entrar al player. Reduced-motion → sin animación.
 */
export function UnitOpeningScreen({ unit, onStart }: { unit: LearningUnitDetail; onStart: () => void }) {
  const shouldAnimate = useShouldAnimate();
  const { transition } = useNarrativeTone(unit.narrative_tone);
  const style = dimensionStyle(unit.dimension_code);
  const pillarName = PILLARS.find((p) => p.id === dimensionToPillar(unit.dimension_code))?.name ?? "";
  const duration = fmtDuration(unit.estimated_duration_seconds);
  const steps = unit.blocks.length;

  const Wrapper = shouldAnimate ? motion.div : "div";
  const wrapperProps = shouldAnimate
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.4 } }
    : {};

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 px-8 text-center"
      style={{ background: `radial-gradient(120% 80% at 50% 0%, color-mix(in srgb, ${style.glow} 12%, var(--bg)) 0%, var(--bg) 60%)` }}
    >
      <Wrapper {...wrapperProps} className="flex flex-col items-center gap-6">
        <motion.div
          initial={shouldAnimate ? { scale: 0.8, opacity: 0, y: 8 } : false}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={transition}
          className="flex h-32 w-32 items-center justify-center rounded-full"
          style={{
            color: style.glow,
            background: `color-mix(in srgb, ${style.glow} 8%, transparent)`,
            boxShadow: `0 0 32px 0 color-mix(in srgb, ${style.glow} 30%, transparent)`,
          }}
        >
          <PillarMetaphor code={unit.dimension_code} className="h-20 w-20" />
        </motion.div>

        <div className="flex flex-col items-center gap-2">
          {pillarName && (
            <span className="font-sans text-micro font-semibold uppercase tracking-meta" style={{ color: style.glow }}>
              {pillarName}
            </span>
          )}
          <h1 className="max-w-md font-display text-4xl leading-tight text-fg">{unit.title}</h1>
          <p className="font-sans text-sm text-fg-muted">
            {steps} {steps === 1 ? "paso" : "pasos"}
            {duration ? ` · ${duration}` : ""}
          </p>
        </div>

        <Button size="lg" onClick={onStart} className="mt-2">
          Comenzar
        </Button>

        <AISoonBadge
          variant="inline"
          label="Próximamente: adaptar dificultad a tu ritmo"
          dimensionCode={unit.dimension_code}
        />
      </Wrapper>
    </div>
  );
}
