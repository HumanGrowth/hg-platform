"use client";

import { ArrowLeft } from "lucide-react";
import * as React from "react";

import { Progress } from "@/components/ui/progress";
import type { AssessmentItem } from "@/lib/types";
import { labelsForScale } from "@/lib/assessment-utils";
import { cn } from "@/lib/utils";

interface Props {
  item: AssessmentItem;
  onSubmit: (value: number, qualitativeText?: string) => void;
  isLoading?: boolean;
  answered?: number;
  total?: number;
  /** Valor ya elegido para este item (al revisar una respuesta previa). */
  selectedValue?: number | null;
  /** Volver a la pregunta anterior (TASK polish-05). */
  onBack?: () => void;
  /** false → primera pregunta, botón "Anterior" deshabilitado. */
  canGoBack?: boolean;
}

/**
 * Adapter "tradicional" (Capa 1): renderiza UN item según su response_type.
 * Botones táctiles ≥44px. El adapter pattern habilita Capa 2 (conversacional)
 * sin rework (ver ADR-0012).
 */
export function TraditionalForm({
  item,
  onSubmit,
  isLoading,
  answered = 0,
  total = 0,
  selectedValue = null,
  onBack,
  canGoBack = false,
}: Props) {
  const isLikert = item.response_type !== "multiple_choice";
  const labels = labelsForScale(item.response_type);
  const min = item.scale_min ?? 0;
  const max = item.scale_max ?? 0;
  const scaleValues = isLikert
    ? Array.from({ length: max - min + 1 }, (_, i) => min + i)
    : [];

  const pct = total > 0 ? Math.round((answered / total) * 100) : 0;

  return (
    <div className="flex flex-col gap-6">
      {total > 0 && (
        <div>
          <div className="mb-1 flex items-center justify-between text-xs text-fg-muted">
            <span>
              {answered} de {total}
            </span>
            <span className="font-mono">{pct}%</span>
          </div>
          <Progress value={pct} label={`Progreso del assessment: ${pct}%`} />
        </div>
      )}

      <h2 className="font-sans text-xl font-semibold text-fg">{item.prompt}</h2>

      {isLikert ? (
        <fieldset className="flex flex-col gap-3" disabled={isLoading}>
          <legend className="sr-only">{item.prompt}</legend>
          <div className="flex flex-wrap gap-2">
            {scaleValues.map((v, idx) => (
              <button
                key={v}
                type="button"
                onClick={() => onSubmit(v)}
                disabled={isLoading}
                aria-pressed={selectedValue === v}
                aria-label={labels[idx] ? `${v} — ${labels[idx]}` : String(v)}
                className={cn(
                  "flex min-h-[44px] min-w-[44px] flex-1 items-center justify-center rounded-md border",
                  "px-3 py-2 font-mono text-base font-semibold transition-colors",
                  "hover:border-primary hover:bg-hg-green-100 focus-visible:outline-none",
                  "focus-visible:ring-2 focus-visible:ring-hg-amber disabled:opacity-40",
                  selectedValue === v
                    ? "border-primary bg-hg-green-100 text-fg"
                    : "border-border-strong text-fg",
                )}
              >
                {v}
              </button>
            ))}
          </div>
          {labels.length > 0 && (
            <div className="flex items-center justify-between text-xs text-fg-muted">
              <span>{labels[0]}</span>
              <span>{labels[labels.length - 1]}</span>
            </div>
          )}
        </fieldset>
      ) : (
        <div className="flex flex-col gap-3">
          {(item.options ?? []).map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => onSubmit(opt.value)}
              disabled={isLoading}
              aria-pressed={selectedValue === opt.value}
              className={cn(
                "min-h-[44px] rounded-lg border bg-surface-card px-4 py-3 text-left",
                "font-sans text-sm text-fg transition-colors hover:border-primary hover:bg-hg-green-100",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hg-amber disabled:opacity-40",
                selectedValue === opt.value ? "border-primary bg-hg-green-100" : "border-border-strong",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {onBack && (
        <button
          type="button"
          onClick={onBack}
          disabled={!canGoBack || isLoading}
          aria-label="Pregunta anterior"
          className={cn(
            "inline-flex w-fit items-center gap-1.5 rounded-md px-3 py-2 font-sans text-sm font-semibold",
            "text-fg-muted transition-colors hover:bg-bg-sunken hover:text-fg",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hg-amber",
            "disabled:pointer-events-none disabled:opacity-40",
          )}
        >
          <ArrowLeft size={16} strokeWidth={2} /> Anterior
        </button>
      )}
    </div>
  );
}
