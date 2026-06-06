import * as React from "react";

import { cn } from "@/lib/utils";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

const sizes = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-16 w-16 text-xl",
} as const;

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  name: string;
  size?: keyof typeof sizes;
}

export function Avatar({ name, size = "md", className, ...props }: AvatarProps) {
  return (
    <div
      aria-label={name}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-cream-300 font-sans font-semibold text-warm-900 select-none",
        sizes[size],
        className,
      )}
      {...props}
    >
      {initials(name)}
    </div>
  );
}
