"use client";

import { m, type Variants } from "framer-motion";
import type { ReactNode } from "react";

import { useShouldAnimate } from "@/lib/motion/useShouldAnimate";

interface StaggerBounceGridProps {
  children: ReactNode[];
  className?: string;
  /** Delay en segundos entre la entrada de cada card. */
  itemDelay?: number;
  /** 0 = lineal, 1 = elástico. */
  bounce?: number;
}

const containerVariants: Variants = {
  hidden: {},
  visible: (custom: number) => ({
    transition: { staggerChildren: custom },
  }),
};

const itemVariants: Variants = {
  hidden: { y: 40, opacity: 0 },
  visible: (bounce: number) => ({
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      bounce,
      duration: 0.6,
    },
  }),
};

/**
 * Entrada en secuencia con spring bounce para grids de cards (motion-v2-04 ·
 * decisión D). Cada item sube desde y:40 con un rebote sutil; el contenedor
 * orquesta el stagger entre hijos. Requiere spring → domAnimation (ya activo
 * desde PR #18). Con reduced motion renderiza el grid plano, todas las cards
 * visibles de una vez, sin transform.
 */
export function StaggerBounceGrid({
  children,
  className,
  itemDelay = 0.08,
  bounce = 0.4,
}: StaggerBounceGridProps) {
  const shouldAnimate = useShouldAnimate();

  if (!shouldAnimate) {
    return <div className={className}>{children}</div>;
  }

  return (
    <m.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "0px 0px -15% 0px" }}
      variants={containerVariants}
      custom={itemDelay}
    >
      {children.map((child, i) => (
        <m.div key={i} variants={itemVariants} custom={bounce}>
          {child}
        </m.div>
      ))}
    </m.div>
  );
}
