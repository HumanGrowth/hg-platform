"use client";

import { MotionConfig } from "framer-motion";
import { createContext, useContext, type ReactNode } from "react";

/**
 * Scope del motion layer (decisión B): true solo dentro del marketing group.
 * Los componentes UI compartidos (Button, Card) consultan este contexto para
 * aplicar hover motion únicamente en marketing — la app autenticada renderiza
 * exactamente igual que antes.
 */
const MotionScopeContext = createContext(false);

export function useInMotionScope(): boolean {
  return useContext(MotionScopeContext);
}

/**
 * MotionConfig del marketing group (motion-01). reducedMotion="user" desactiva
 * las animaciones de framer-motion cuando el usuario prefiere reduced motion.
 * Vive solo en (marketing)/layout — la app autenticada queda fuera.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <MotionScopeContext.Provider value={true}>
      <MotionConfig reducedMotion="user" transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
        {children}
      </MotionConfig>
    </MotionScopeContext.Provider>
  );
}
