"use client";

import { Children, type CSSProperties, type ElementType, type ReactNode } from "react";

import { cn } from "@/lib/utils";

import { useInView } from "./useInView";

type Variant = "up" | "scale" | "blur" | "left" | "right";

const VARS: Record<Variant, CSSProperties> = {
  up: { ["--rv-y" as string]: "28px" },
  scale: { ["--rv-y" as string]: "12px", ["--rv-s" as string]: "0.94" },
  blur: { ["--rv-y" as string]: "16px", ["--rv-b" as string]: "10px" },
  left: { ["--rv-y" as string]: "0px", ["--rv-x" as string]: "-40px" },
  right: { ["--rv-y" as string]: "0px", ["--rv-x" as string]: "40px" },
};

/**
 * Entrada al hacer scroll (fade + slide/scale/blur), una vez. Solo CSS +
 * IntersectionObserver: sin dependencia de framer. Con reduced motion queda
 * visible (ver .rv en globals.css).
 */
export function Reveal({
  children,
  variant = "up",
  delay = 0,
  as: Tag = "div",
  className,
  style,
}: {
  children: ReactNode;
  variant?: Variant;
  /** Segundos. */
  delay?: number;
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
}) {
  const { ref, inView } = useInView<HTMLElement>();
  return (
    <Tag
      ref={ref}
      data-in={inView}
      className={cn("rv", className)}
      style={{ ...VARS[variant], ["--rv-delay" as string]: `${delay}s`, ...style }}
    >
      {children}
    </Tag>
  );
}

/** Cada hijo entra con un retardo escalonado. */
export function RevealGroup({
  children,
  className,
  step = 0.08,
  variant = "up",
  baseDelay = 0,
}: {
  children: ReactNode;
  className?: string;
  step?: number;
  variant?: Variant;
  baseDelay?: number;
}) {
  return (
    <div className={className}>
      {Children.toArray(children).map((child, i) => (
        <Reveal key={i} variant={variant} delay={baseDelay + i * step} className="h-full">
          {child}
        </Reveal>
      ))}
    </div>
  );
}
