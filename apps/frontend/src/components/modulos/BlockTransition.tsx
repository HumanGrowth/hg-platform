"use client";

import { motion } from "framer-motion";
import * as React from "react";

import { useNarrativeTone } from "@/lib/motion/useNarrativeTone";
import { useShouldAnimate } from "@/lib/motion/useShouldAnimate";
import type { NarrativeTone } from "@/lib/types";

/**
 * Envuelve el bloque activo del player y anima su entrada al cambiar de bloque
 * (Sprint UI · TASK 9). La `key` fuerza el remount → dispara `initial→animate`.
 * El carácter de la animación viene del `narrative_tone` de la unit. Con
 * reduced-motion no anima (render directo).
 */
export function BlockTransition({
  blockKey,
  tone,
  className,
  children,
}: {
  blockKey: string;
  tone: NarrativeTone | null | undefined;
  className?: string;
  children: React.ReactNode;
}) {
  const shouldAnimate = useShouldAnimate();
  const { y, transition } = useNarrativeTone(tone);

  if (!shouldAnimate) return <div className={className}>{children}</div>;

  return (
    <motion.div
      key={blockKey}
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={transition}
      className={className}
    >
      {children}
    </motion.div>
  );
}
