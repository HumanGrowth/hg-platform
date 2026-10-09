"use client";

import { ChevronLeft, ChevronRight, Lightbulb } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import * as React from "react";

import { SaveTipButton } from "@/components/plan-accion/SaveTipButton";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Eyebrow } from "@/components/ui/eyebrow";
import { apiGetMyPillarTips } from "@/lib/api";
import { dimensionStyle } from "@/lib/dimension-styles";
import { DIMENSIONS } from "@/lib/dimensions";
import type { DimensionPillarTips } from "@/lib/types";

function dimensionShort(code: string): string {
  return DIMENSIONS.find((d) => d.code === code)?.short ?? code;
}

/**
 * "Tips para tu pilar": un tip a la vez, con tabs por dimensión. Cada dimensión
 * muestra los tips de SU pilar en curso — el coaching del pilar (lo mismo que
 * guía a tu manager) mezclado con ideas de los módulos de ese pilar. Cuando
 * completás el nivel y la evaluación, el pilar en curso avanza y sus tips
 * reemplazan a los anteriores. Cada tip se puede guardar en el Plan de Acción.
 */
export function PillarTipsViewer() {
  const [dims, setDims] = React.useState<DimensionPillarTips[] | null>(null);
  const [active, setActive] = React.useState<string | null>(null);
  const [index, setIndex] = React.useState(0);

  React.useEffect(() => {
    apiGetMyPillarTips()
      .then((rows) => {
        setDims(rows);
        setActive((cur) => cur ?? rows[0]?.dimension_code ?? null);
      })
      .catch(() => setDims([]));
  }, []);

  if (dims === null) return <div className="mt-8 h-48 animate-pulse rounded-2xl bg-bg-sunken" />;
  if (dims.length === 0) return null;

  const current = dims.find((d) => d.dimension_code === active) ?? dims[0];
  const total = current.tips.length;
  const i = Math.min(index, total - 1);
  const tip = current.tips[i];
  const glow = dimensionStyle(current.dimension_code).glow;

  function selectDimension(code: string) {
    setActive(code);
    setIndex(0);
  }

  return (
    <section aria-label="Tips para tu pilar" className="mt-8">
      <Eyebrow>Tips para tu pilar</Eyebrow>
      <div role="tablist" aria-label="Dimensiones" className="mt-3 flex flex-wrap gap-2">
        {dims.map((d) => (
          <Chip
            key={d.dimension_code}
            role="tab"
            aria-selected={d.dimension_code === current.dimension_code}
            active={d.dimension_code === current.dimension_code}
            onClick={() => selectDimension(d.dimension_code)}
          >
            {dimensionShort(d.dimension_code)}
          </Chip>
        ))}
      </div>

      <Card glass="strong" className="mt-4 flex flex-col gap-4 border-l-[3px]" style={{ borderLeftColor: glow }}>
        <div className="flex items-center gap-2">
          <Lightbulb size={16} strokeWidth={1.75} className="text-hg-amber" aria-hidden />
          <span className="font-sans text-xs font-semibold uppercase tracking-meta text-fg-muted">
            {current.pillar_name}
          </span>
        </div>

        <p className="min-h-[4.5rem] whitespace-pre-line font-heading text-lg leading-snug text-fg">{tip.text}</p>

        {tip.source === "module" && tip.unit_slug ? (
          <Link
            href={`/modulos/${tip.unit_slug}` as Route}
            className="text-xs text-fg-subtle hover:text-primary"
          >
            De: {tip.unit_title ?? "ver módulo"}
          </Link>
        ) : (
          <span className="text-xs text-fg-subtle">Coaching de tu pilar</span>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* key: el estado "guardado" es por tip, no del botón. */}
          <SaveTipButton
            key={`${current.dimension_code}:${i}`}
            prefillText={tip.text}
            dimensionCode={current.dimension_code}
            unitId={tip.unit_id}
            blockId={tip.block_id}
            source="solution"
            label="Guardar en mi Plan"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Tip anterior"
              disabled={i === 0}
              onClick={() => setIndex(i - 1)}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-fg-muted hover:border-primary hover:text-primary disabled:opacity-40"
            >
              <ChevronLeft size={16} strokeWidth={2} />
            </button>
            <span className="min-w-[3rem] text-center text-xs text-fg-muted" aria-live="polite">
              {i + 1} / {total}
            </span>
            <button
              type="button"
              aria-label="Tip siguiente"
              disabled={i >= total - 1}
              onClick={() => setIndex(i + 1)}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-fg-muted hover:border-primary hover:text-primary disabled:opacity-40"
            >
              <ChevronRight size={16} strokeWidth={2} />
            </button>
          </div>
        </div>
      </Card>
    </section>
  );
}
