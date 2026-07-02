import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const alertVariants = cva(
  "flex items-start gap-3 rounded-md border px-4 py-3 font-sans text-sm",
  {
    variants: {
      variant: {
        info: "border-info/30 bg-info-bg text-info",
        success: "border-success/30 bg-success-bg text-success",
        warning: "border-warning/30 bg-warning-bg text-warning",
        danger: "border-danger/30 bg-danger-bg text-danger",
      },
    },
    defaultVariants: { variant: "info" },
  },
);

const ICON = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
} as const;

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  title?: string;
}

/** Mensaje inline (DS v2 · feedback). Ícono + título opcional + contenido. */
export function Alert({ className, variant = "info", title, children, ...props }: AlertProps) {
  const Icon = ICON[variant ?? "info"];
  return (
    <div role="alert" className={cn(alertVariants({ variant }), className)} {...props}>
      <Icon size={18} strokeWidth={1.75} aria-hidden className="mt-0.5 shrink-0" />
      <div className="min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn(title && "mt-0.5 opacity-90")}>{children}</div>}
      </div>
    </div>
  );
}

export { alertVariants };
