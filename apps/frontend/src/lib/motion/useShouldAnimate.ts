"use client";

import { useReducedMotion } from "framer-motion";

/** Retorna false si el user prefiere reduced motion. Base para todos los motion components. */
export function useShouldAnimate(): boolean {
  const shouldReduce = useReducedMotion();
  return !shouldReduce;
}
