import * as React from "react";

import { cn } from "@/lib/utils";

export interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

/** Selectable filter chip — eyebrow casing, 8px radius. */
export const Chip = React.forwardRef<HTMLButtonElement, ChipProps>(
  ({ className, active = false, type, ...props }, ref) => (
    <button
      ref={ref}
      type={type ?? "button"}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-3 py-2 font-sans text-xs font-semibold uppercase tracking-meta",
        "transition-[background-color,border-color] duration-fast ease-state",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hg-amber",
        active
          ? "border-primary bg-hg-green-100 text-primary"
          : "border-border text-fg-muted hover:bg-bg-sunken",
        className,
      )}
      {...props}
    />
  ),
);
Chip.displayName = "Chip";
