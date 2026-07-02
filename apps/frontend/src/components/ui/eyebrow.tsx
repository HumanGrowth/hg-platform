import * as React from "react";

import { cn } from "@/lib/utils";

export interface EyebrowProps extends React.HTMLAttributes<HTMLParagraphElement> {
  accent?: boolean;
}

/** Uppercase tracked metadata label. */
export function Eyebrow({ className, accent = false, ...props }: EyebrowProps) {
  return (
    <p
      className={cn(
        "font-sans text-micro font-semibold uppercase tracking-meta",
        accent ? "text-hg-orange" : "text-fg-muted",
        className,
      )}
      {...props}
    />
  );
}
