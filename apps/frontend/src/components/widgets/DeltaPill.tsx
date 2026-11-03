import * as React from "react";

export type DeltaKind = "pp" | "count";

/** Diferencia redondeada: en puntos porcentuales (tasas 0–1) o en unidades. */
export function computeDelta(current: number, previous: number, kind: DeltaKind): number {
  return kind === "pp" ? Math.round((current - previous) * 100) : current - previous;
}

/**
 * Delta vs el período anterior (21 días previos). `goodWhen` define qué sentido
 * es una mejora: más adopción es bueno ("up"), más inactivos es malo ("down").
 * Nunca depende solo del color: lleva flecha y texto.
 */
export function DeltaPill({
  current,
  previous,
  kind,
  goodWhen,
}: {
  current: number;
  previous: number | null | undefined;
  kind: DeltaKind;
  goodWhen: "up" | "down";
}) {
  if (previous === null || previous === undefined) return null;
  const d = computeDelta(current, previous, kind);
  const unit = kind === "pp" ? " pp" : "";
  if (d === 0) {
    return <span className="text-xs text-fg-subtle">= sin cambio vs 21d previos</span>;
  }
  const improved = goodWhen === "up" ? d > 0 : d < 0;
  return (
    <span className={`text-xs font-semibold ${improved ? "text-primary" : "text-danger"}`}>
      {d > 0 ? "▲" : "▼"} {d > 0 ? "+" : ""}
      {d}
      {unit} <span className="font-normal text-fg-muted">vs 21d previos</span>
    </span>
  );
}
