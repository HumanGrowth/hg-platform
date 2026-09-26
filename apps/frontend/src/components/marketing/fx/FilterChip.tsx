"use client";

import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

/** Pill de filtro glass; la activa se rellena y "pulsa" al seleccionarse. */
export function FilterChip({
  active,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { active: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        "rounded-full px-4 py-2 text-[13px] font-semibold transition-all duration-300 active:scale-95",
        active ? "scale-105 bg-fg text-bg shadow-lg" : "glass-fill-strong text-fg hover:-translate-y-0.5 hover:text-primary",
        className,
      )}
      {...props}
    />
  );
}
