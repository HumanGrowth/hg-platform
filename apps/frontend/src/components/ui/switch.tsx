import * as React from "react";

import { cn } from "@/lib/utils";

export interface SwitchProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange" | "role"> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

/**
 * Interruptor accesible (WAI-ARIA `switch`). Se asocia con un <Label htmlFor={id}>
 * y `aria-describedby` para el texto de ayuda. Espacio/Enter lo alternan (es un <button>).
 * La transición se apaga con prefers-reduced-motion.
 */
export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ checked, onCheckedChange, className, disabled, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-border-strong",
        "transition-colors duration-fast ease-state motion-reduce:transition-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hg-amber/60 focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-40",
        checked ? "border-primary bg-primary" : "bg-bg-raised",
        className,
      )}
      {...props}
    >
      <span
        aria-hidden
        className={cn(
          "inline-block h-4 w-4 rounded-full shadow-sm",
          "transition-transform duration-fast ease-state motion-reduce:transition-none",
          checked ? "translate-x-6 bg-white" : "translate-x-1 bg-fg-muted",
        )}
      />
    </button>
  ),
);
Switch.displayName = "Switch";
