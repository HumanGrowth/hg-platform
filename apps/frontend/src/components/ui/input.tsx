import * as React from "react";

import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "h-10 w-full rounded-md border border-border bg-bg-raised px-4 py-3 font-sans text-base text-fg",
        "placeholder:text-fg-subtle",
        "transition-[border-color,box-shadow] duration-fast ease-state",
        "focus:border-primary focus:outline-none focus:ring-2 focus:ring-hg-amber/40",
        "disabled:cursor-not-allowed disabled:opacity-40",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn("mb-1 block font-sans text-sm font-medium text-fg", className)}
    {...props}
  />
));
Label.displayName = "Label";
