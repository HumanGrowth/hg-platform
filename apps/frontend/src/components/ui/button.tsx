"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { m } from "framer-motion";
import * as React from "react";

import { useInMotionScope } from "@/components/motion/MotionProvider";
import { useShouldAnimate } from "@/lib/motion/useShouldAnimate";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md font-sans font-semibold whitespace-nowrap " +
    "transition-[background-color,transform] duration-fast ease-state " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hg-amber focus-visible:ring-offset-2 focus-visible:ring-offset-bg " +
    "disabled:pointer-events-none disabled:opacity-40 active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary: "bg-primary text-white hover:bg-primary-hover active:bg-hg-green-700",
        secondary:
          "bg-transparent text-fg border border-border-strong hover:bg-bg-sunken active:bg-surface-sunken",
        ghost: "bg-transparent text-fg hover:bg-bg-sunken active:bg-surface-sunken",
        destructive: "bg-danger text-white hover:opacity-90 active:opacity-80",
      },
      size: {
        sm: "h-8 px-3 text-sm",
        md: "h-10 px-5 text-sm",
        lg: "h-12 px-6 text-base",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

/**
 * Hover motion sutil (motion-05): scale 1.02 / tap 0.98, SOLO dentro del
 * marketing group (useInMotionScope) y sin reduced motion. Fuera de marketing
 * (app autenticada) renderiza el <button> plano de siempre — cero cambios.
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type, ...props }, ref) => {
    const inScope = useInMotionScope();
    const shouldAnimate = useShouldAnimate();

    if (!inScope || !shouldAnimate) {
      return (
        <button
          ref={ref}
          type={type ?? "button"}
          className={cn(buttonVariants({ variant, size }), className)}
          {...props}
        />
      );
    }

    return (
      <m.button
        ref={ref}
        type={type ?? "button"}
        className={cn(buttonVariants({ variant, size }), className)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        {...(props as React.ComponentProps<typeof m.button>)}
      />
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };
