"use client";

import { m, type Variants } from "framer-motion";
import { createElement, type ReactNode } from "react";

import { useShouldAnimate } from "@/lib/motion/useShouldAnimate";

const defaultVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1],
      staggerChildren: 0.08,
    },
  },
};

interface MotionSectionProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: keyof HTMLElementTagNameMap;
  id?: string;
  variants?: Variants;
}

/**
 * Wrapper de sección con fade + slide leve al entrar en viewport (motion-02).
 * once: true — no re-anima al scrollear hacia arriba. Con reduced motion
 * renderiza el tag plano sin framer.
 */
export function MotionSection({
  children,
  className,
  delay = 0,
  as = "section",
  id,
  variants = defaultVariants,
}: MotionSectionProps) {
  const shouldAnimate = useShouldAnimate();

  if (!shouldAnimate) {
    return createElement(as, { className, id }, children);
  }

  const MotionTag = m[as as keyof typeof m] as typeof m.section;

  return (
    <MotionTag
      id={id}
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "0px 0px -20% 0px" }}
      variants={variants}
      transition={{ delay }}
    >
      {children}
    </MotionTag>
  );
}
