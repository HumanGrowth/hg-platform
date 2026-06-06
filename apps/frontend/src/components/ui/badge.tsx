import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-sans text-xs font-semibold whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "bg-bg-sunken text-fg-muted",
        earned: "bg-orange-500 text-white",
        success: "bg-success-bg text-success",
        warning: "bg-warning-bg text-warning",
        danger: "bg-danger-bg text-danger",
        info: "bg-info-bg text-info",
        "pillar-p1": "bg-orange-50 text-orange-700",
        "pillar-p2": "bg-cream-200 text-warm-700",
        "pillar-p3": "bg-success-bg text-success",
        "pillar-p4": "bg-warning-bg text-warning",
        "pillar-p5": "bg-info-bg text-info",
        "pillar-p6": "bg-orange-100 text-orange-800",
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
