import * as React from "react";

import type { Block, BlockProgressOut } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Barra de progreso segmentada compartida por los players mobile y desktop
 * (misma altura y misma lógica de "activo"). El track es `.glass-track` (token
 * medido en glass-contrast.test); el relleno es `bg-primary` = señal de color.
 */
export function SegmentedProgress({
  blocks,
  blockProgress,
  currentIndex,
  className,
}: {
  blocks: Block[];
  blockProgress: BlockProgressOut[];
  currentIndex: number;
  className?: string;
}) {
  return (
    <div className={cn("flex gap-1", className)}>
      {blocks.map((b, i) => {
        const completed = blockProgress.some((bp) => bp.unit_block_id === b.id && bp.status === "completed");
        return (
          <div key={b.id} className="glass-track h-1.5 flex-1 overflow-hidden rounded-full">
            <div
              className={cn(
                "h-full rounded-full bg-primary transition-[width] duration-base",
                completed ? "w-full" : i === currentIndex ? "w-1/2" : "w-0",
              )}
            />
          </div>
        );
      })}
    </div>
  );
}
