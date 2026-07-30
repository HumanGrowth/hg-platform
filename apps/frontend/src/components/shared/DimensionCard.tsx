import type { Route } from "next";
import Link from "next/link";

import { PillarMetaphor } from "@/components/modulos/PillarMetaphor";
import { Progress } from "@/components/ui/progress";
import type { Dimension } from "@/lib/dimensions";
import { pillarStyle } from "@/lib/pillars";
import { cn } from "@/lib/utils";

/**
 * Card de dimensión compartida entre Inicio (TASK 3) y Mi Perfil (TASK 4).
 * Un solo componente, mismo shape en ambos lados. Metáfora del pilar + nombre +
 * score actual + progreso mini. Las dimensiones sin contenido se atenúan y
 * muestran un micro badge "Próximamente".
 */
export function DimensionCard({
  dimension,
  score,
  className,
}: {
  dimension: Dimension;
  /** Score 0-100 de la dimensión (radarValuesFromResults). */
  score: number;
  className?: string;
}) {
  const style = pillarStyle(dimension.pillar);
  return (
    <Link
      href={`/dimensiones/${dimension.code}` as Route}
      aria-label={`${dimension.name} · ${score} de 100`}
      className={cn(
        "group relative flex flex-col gap-3 rounded-lg border border-border bg-surface-card p-4 transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hg-amber",
        !dimension.hasContent && "opacity-60",
        className,
      )}
    >
      {!dimension.hasContent && (
        <span className="absolute right-3 top-3 rounded-full bg-bg-sunken px-2 py-0.5 text-[10px] font-semibold uppercase tracking-meta text-fg-muted">
          Próximamente
        </span>
      )}
      <div
        className="flex h-12 w-12 items-center justify-center rounded-full"
        style={{
          color: style.glow,
          background: `color-mix(in srgb, ${style.glow} 10%, transparent)`,
        }}
      >
        <PillarMetaphor code={dimension.code} className="h-7 w-7" />
      </div>
      <h3 className="font-sans text-md font-semibold leading-tight text-fg">{dimension.name}</h3>
      <div className="mt-auto">
        <div className="mb-1 flex items-center justify-between text-xs text-fg-muted">
          <span>Tu estado</span>
          <span className="font-mono tabular-nums">{score}</span>
        </div>
        <Progress value={score} label={`Estado ${dimension.name}`} />
      </div>
    </Link>
  );
}
