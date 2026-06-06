import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const displayVariants = cva(
  "font-display uppercase tracking-tight leading-tight text-fg",
  {
    variants: {
      variant: {
        "display-1": "text-6xl",
        "display-2": "text-5xl",
        "display-3": "text-4xl",
      },
    },
    defaultVariants: { variant: "display-2" },
  },
);

export interface DisplayProps
  extends React.HTMLAttributes<HTMLHeadingElement>,
    VariantProps<typeof displayVariants> {
  as?: "h1" | "h2" | "h3" | "div";
}

/** Anton condensed display heading (ALL CAPS via CSS). */
export function Display({ className, variant, as = "h1", ...props }: DisplayProps) {
  const Comp = as;
  return <Comp className={cn(displayVariants({ variant }), className)} {...props} />;
}
