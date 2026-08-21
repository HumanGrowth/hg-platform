import { ArrowRight, RefreshCw } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { DimensionMetaphor } from "@/components/modulos/DimensionMetaphor";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { canRetake, sourceLabel } from "@/lib/assessment-utils";
import type { Dimension } from "@/lib/dimensions";
import { dimensionStyle } from "@/lib/dimension-styles";
import type { DimensionResult } from "@/lib/types";
import { cn } from "@/lib/utils";

function daysUntil(iso: string): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000));
}

/**
 * Card unificada por dimensión (Sprint Tarde · refinamiento de Perfil).
 * Reúne en una sola tarjeta lo que antes eran 3 secciones: progreso + estado
 * del assessment + acción de reevaluar. Metáfora + nombre + score + estado +
 * botón, con el color del pilar.
 */
export function DimensionSummaryCard({
  dimension,
  score,
  result,
  onConfirm,
}: {
  dimension: Dimension;
  score: number;
  result?: DimensionResult;
  onConfirm?: (result: DimensionResult) => void;
}) {
  const style = dimensionStyle(dimension.careerPath);
  const detailHref = `/onboarding/detail/${dimension.assessmentDimension}` as Route;
  const ready = result != null && (result.source === "preliminary" || canRetake(result));
  const wait = result && !ready ? daysUntil(result.next_retake_eligible_at) : 0;

  return (
    <Card className="flex flex-col gap-3 bg-surface-card">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
            style={{
              color: style.glow,
              background: `color-mix(in srgb, ${style.glow} 10%, transparent)`,
            }}
          >
            <DimensionMetaphor code={dimension.code} className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <h3 className="truncate font-sans text-md font-semibold text-fg">{dimension.name}</h3>
            {result ? (
              <p className="truncate text-sm font-semibold text-primary">{result.state_label}</p>
            ) : (
              <p className="text-sm text-fg-muted">Sin evaluar</p>
            )}
          </div>
        </div>
        {result && (
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold",
              result.source === "confirmed"
                ? "bg-success-bg text-success"
                : "bg-bg-sunken text-fg-muted",
            )}
          >
            {sourceLabel(result.source)}
          </span>
        )}
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between text-xs text-fg-muted">
          <span>Tu estado</span>
          <span className="font-mono tabular-nums">{score}</span>
        </div>
        <Progress value={score} label={`Estado ${dimension.name}`} />
      </div>

      {result?.requires_user_confirmation && onConfirm && (
        <button
          type="button"
          onClick={() => onConfirm(result)}
          className="w-fit rounded-md bg-hg-green-100 px-3 py-1.5 text-xs font-semibold text-primary"
        >
          ¿Te reconocés en este perfil? Confirmá tu nivel
        </button>
      )}

      <div className="mt-auto flex items-center justify-between gap-2 pt-1">
        {result == null || ready ? (
          <Link href={detailHref} className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}>
            <RefreshCw size={15} strokeWidth={1.75} />
            {result == null ? "Evaluar" : result.source === "preliminary" ? "Evaluar en detalle" : "Re-evaluar"}
          </Link>
        ) : (
          <span className="text-xs text-fg-subtle" title={`Disponible en ${wait} días`}>
            Reevaluable en {wait} d
          </span>
        )}
        <Link
          href={`/dimensiones/${dimension.code}` as Route}
          className="inline-flex items-center gap-1 font-sans text-sm font-semibold text-primary hover:underline"
        >
          Ver dimensión
          <ArrowRight size={15} strokeWidth={1.75} />
        </Link>
      </div>
    </Card>
  );
}
