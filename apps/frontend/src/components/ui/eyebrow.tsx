import * as React from "react";

import { cn } from "@/lib/utils";

export interface EyebrowProps extends React.HTMLAttributes<HTMLParagraphElement> {
  accent?: boolean;
  /** Elemento a renderizar — `h2`/`h3` cuando el eyebrow es el título de una sección. */
  as?: "p" | "h2" | "h3";
}

/** Uppercase tracked metadata label. */
export function Eyebrow({ className, accent = false, as: Comp = "p", ...props }: EyebrowProps) {
  return (
    <Comp
      className={cn(
        "font-sans text-micro font-semibold uppercase tracking-meta",
        accent ? "text-hg-orange" : "text-fg-muted",
        className,
      )}
      {...props}
    />
  );
}
