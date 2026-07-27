"use client";

import { Sparkles } from "lucide-react";
import * as React from "react";

import { dimensionStyle } from "@/lib/pillars";
import { cn } from "@/lib/utils";

type Variant = "pill" | "inline" | "card";

interface Props {
  /** `pill` (botón/acción), `inline` (bajo un input/texto), `card` (bloque destacado). */
  variant?: Variant;
  label: string;
  /** Pilar para el tinte del gradient (Sprint UI). Default primary. */
  dimensionCode?: string;
  className?: string;
}

/**
 * Placeholder de features de AI que vienen (Sprint UI · TASK 11). **Solo
 * anuncia** — no captura email ni pide nada. Sparkle + tinte del pilar +
 * tooltip nativo "Próximamente". Estático (sin animación) → reduced-motion safe.
 */
export function AISoonBadge({ variant = "pill", label, dimensionCode, className }: Props) {
  const glow = dimensionStyle(dimensionCode).glow;
  // Tinte muy sutil del pilar como fondo (color-mix con el surface).
  const tint: React.CSSProperties = {
    background: `color-mix(in srgb, ${glow} 10%, transparent)`,
    borderColor: `color-mix(in srgb, ${glow} 35%, transparent)`,
    color: glow,
  };

  if (variant === "inline") {
    return (
      <span
        title="Próximamente"
        className={cn("inline-flex items-center gap-1 text-xs font-medium text-fg-muted", className)}
      >
        <Sparkles size={13} strokeWidth={2} style={{ color: glow }} aria-hidden />
        {label}
      </span>
    );
  }

  if (variant === "card") {
    return (
      <div
        title="Próximamente"
        style={tint}
        className={cn(
          "flex items-center gap-3 rounded-lg border px-4 py-3 font-sans text-sm",
          className,
        )}
      >
        <Sparkles size={18} strokeWidth={2} aria-hidden />
        <span className="font-medium">{label}</span>
        <span className="ml-auto rounded-full border border-current/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
          Próximamente
        </span>
      </div>
    );
  }

  // pill
  return (
    <span
      title="Próximamente"
      style={tint}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-sans text-xs font-semibold",
        className,
      )}
    >
      <Sparkles size={14} strokeWidth={2} aria-hidden />
      {label}
    </span>
  );
}
