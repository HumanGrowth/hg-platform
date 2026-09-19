import * as React from "react";

import { cn } from "@/lib/utils";

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 0–100 */
  value: number;
  label?: string;
  /** Clases de la barra rellena (color/forma) — default: verde primario. */
  indicatorClassName?: string;
}

export function Progress({ value, label, className, indicatorClassName, ...props }: ProgressProps) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn("h-2 w-full overflow-hidden rounded-sm bg-bg-sunken", className)}
      {...props}
    >
      <div
        className={cn(
          "h-full rounded-sm bg-primary transition-[width] duration-base ease-out",
          indicatorClassName,
        )}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
