import * as React from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  value: React.ReactNode;
  label: string;
  sub?: string;
  icon?: React.ReactNode;
}

/** StatCard (DS v2 · data): métrica destacada — número display + label + sub. */
export function StatCard({ value, label, sub, icon, className, ...props }: StatCardProps) {
  return (
    <Card className={cn("flex flex-col gap-1 bg-bg-raised", className)} {...props}>
      {icon && <div className="mb-1 text-primary">{icon}</div>}
      <span className="font-display text-4xl leading-none text-fg">{value}</span>
      <span className="font-heading text-sm font-semibold text-fg">{label}</span>
      {sub && <span className="text-xs text-fg-muted">{sub}</span>}
    </Card>
  );
}
