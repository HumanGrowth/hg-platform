import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-sans text-xs font-semibold whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "bg-bg-sunken text-fg-muted",
        earned: "bg-hg-orange text-white",
        success: "bg-success-bg text-success",
        warning: "bg-warning-bg text-warning",
        danger: "bg-danger-bg text-danger",
        info: "bg-info-bg text-info",
        // Pillar tints — alineados a los tokens de pilar v2 (§4.2 delta).
        "pillar-p1": "bg-[#fdece3] text-hg-orange",       // Carrera · orange
        "pillar-p2": "bg-[#f5eddd] text-[#8f6f38]",       // Propósito · gold
        "pillar-p3": "bg-hg-green-100 text-hg-green",     // Relaciones · green
        "pillar-p4": "bg-[#e9f0e5] text-[#4f6a46]",       // Salud · sage
        "pillar-p5": "bg-info-bg text-info",              // Paz interior · slate
        "pillar-p6": "bg-warning-bg text-warning",        // Estabilidad · amber
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { badgeVariants };
