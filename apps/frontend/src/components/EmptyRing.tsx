import { cn } from "@/lib/utils";

export interface EmptyRingProps {
  label?: string;
  className?: string;
  size?: number;
}

/**
 * Motif de anillo del logo como loading / empty state.
 * Anillo segmentado que rota 360° en 2.4s linear (spec del DS).
 */
export function EmptyRing({ label, className, size = 48 }: EmptyRingProps) {
  return (
    <div className={cn("flex flex-col items-center gap-4 text-center", className)}>
      <span
        aria-hidden
        className="animate-ring-spin rounded-full"
        style={{
          width: size,
          height: size,
          border: `${Math.max(3, size / 12)}px solid var(--border)`,
          borderTopColor: "var(--orange)",
          borderRightColor: "var(--orange)",
        }}
      />
      {label ? <p className="font-sans text-sm text-fg-muted">{label}</p> : null}
    </div>
  );
}
