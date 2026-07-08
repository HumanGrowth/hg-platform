"use client";

import { MotionConfig } from "framer-motion";
import type { ReactNode } from "react";

/**
 * MotionConfig del marketing group (motion-01). reducedMotion="user" desactiva
 * las animaciones de framer-motion cuando el usuario prefiere reduced motion.
 * Vive solo en (marketing)/layout — la app autenticada queda fuera.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </MotionConfig>
  );
}
