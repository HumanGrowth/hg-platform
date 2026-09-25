"use client";

import { useRef, type HTMLAttributes, type PointerEvent } from "react";

import { cn } from "@/lib/utils";

/**
 * Card glass con foco de luz que sigue al cursor, borde reactivo y leve
 * inclinación 3D (solo con puntero fino; en touch/reduced-motion queda estática).
 * `glow` = color del foco (por defecto ámbar de marca).
 */
export function SpotlightCard({
  className,
  glow = "232,160,48",
  tilt = true,
  onPointerMove,
  onPointerLeave,
  children,
  style,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { glow?: string; tilt?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);

  function move(e: PointerEvent<HTMLDivElement>) {
    onPointerMove?.(e);
    if (e.pointerType !== "mouse") return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    el.style.setProperty("--mx", `${x}px`);
    el.style.setProperty("--my", `${y}px`);
    if (tilt) {
      el.style.setProperty("--ry", `${((x / r.width) * 2 - 1) * 4}deg`);
      el.style.setProperty("--rx", `${(-((y / r.height) * 2 - 1)) * 4}deg`);
    }
  }

  function leave(e: PointerEvent<HTMLDivElement>) {
    onPointerLeave?.(e);
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  }

  return (
    <div
      ref={ref}
      onPointerMove={move}
      onPointerLeave={leave}
      className={cn("fx-spot glass-surface-strong relative overflow-hidden", className)}
      style={{ ["--glow" as string]: glow, ...style }}
      {...rest}
    >
      {children}
    </div>
  );
}
