import * as React from "react";

import { Card } from "@/components/ui/card";
import { InfoTip } from "@/components/ui/info-tip";
import { cn } from "@/lib/utils";

export interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  value: React.ReactNode;
  label: string;
  sub?: string;
  icon?: React.ReactNode;
  /** Explicación de qué representa la métrica (icono ⓘ con tooltip). */
  info?: string;
  /** Línea extra bajo `sub` (p. ej. un delta vs período anterior). */
  footer?: React.ReactNode;
}

/** StatCard (DS v2 · data): métrica destacada — número display + label + sub. */
export function StatCard({ value, label, sub, icon, info, footer, className, ...props }: StatCardProps) {
  return (
    <Card glass="strong" className={cn("relative flex flex-col gap-1 bg-bg-raised", className)} {...props}>
      {info ? (
        <span className="absolute right-3 top-3">
          <InfoTip text={info} label={label} />
        </span>
      ) : null}
      {icon && <div className="mb-1 text-primary">{icon}</div>}
      <span className="font-display text-4xl leading-none text-fg">{value}</span>
      <span className="font-heading text-sm font-semibold text-fg">{label}</span>
      {sub && <span className="text-xs text-fg-muted">{sub}</span>}
      {footer}
    </Card>
  );
}
