"use client";

import { m } from "framer-motion";
import * as React from "react";

import { useInMotionScope } from "@/components/motion/MotionProvider";
import { useShouldAnimate } from "@/lib/motion/useShouldAnimate";
import { cn } from "@/lib/utils";

const cardClasses =
  "rounded-lg border border-border bg-bg-raised p-6 shadow-sm " +
  "transition-shadow duration-base ease-state hover:shadow-md";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Tema dark (glassmorphic): fuerza de la superficie translúcida.
   * "strong" (default, ≥80% opaco) para cards con texto/datos — la inmensa
   * mayoría de los <Card> de esta app muestran texto. "surface" es opt-in
   * para chrome/contenedores puramente decorativos, SIN texto secundario.
   *
   * Nota de contraste (medida, no intuición): bajo dark, subir la opacidad
   * del fill translúcido claro NO mejora el contraste del texto muted — lo
   * empeora (el fill claro se acerca en luminancia al texto gris, reduciendo
   * la diferencia). El tier "surface" (8% opaco) da ~4.2:1 con texto muted
   * en el peor blob — por debajo de 4.5:1. Por eso el default es "strong".
   * No-op bajo el tema classic.
   */
  glass?: "surface" | "strong";
}

/**
 * Hover lift sutil (motion-05): translateY -2px SOLO en marketing
 * (useInMotionScope) y sin reduced motion. En la app autenticada renderiza el
 * <div> plano de siempre.
 */
export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, glass = "strong", ...props }, ref) => {
    const inScope = useInMotionScope();
    const shouldAnimate = useShouldAnimate();
    const glassClass = glass === "strong" ? "glass-surface-strong" : "glass-surface";

    if (!inScope || !shouldAnimate) {
      return <div ref={ref} className={cn(cardClasses, glassClass, className)} {...props} />;
    }

    return (
      <m.div
        ref={ref}
        className={cn(cardClasses, glassClass, className)}
        whileHover={{ y: -2, transition: { duration: 0.2 } }}
        {...(props as React.ComponentProps<typeof m.div>)}
      />
    );
  },
);
Card.displayName = "Card";

export const CardHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("mb-4 flex flex-col gap-1", className)} {...props} />
);

export const CardTitle = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={cn("font-sans text-xl font-semibold text-fg", className)} {...props} />
);

export const CardDescription = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn("font-sans text-sm text-fg-muted", className)} {...props} />
);

export const CardContent = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("font-sans text-base text-fg", className)} {...props} />
);

export const CardFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("mt-4 flex items-center gap-3", className)} {...props} />
);
