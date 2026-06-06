"use client";

import { useToastStore } from "@/lib/toast-store";
import { cn } from "@/lib/utils";

export function Toaster() {
  const { toasts, dismiss } = useToastStore();
  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-[60] flex flex-col gap-2">
      {toasts.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => dismiss(t.id)}
          className={cn(
            "pointer-events-auto max-w-sm rounded-md border px-4 py-3 text-left font-sans text-sm shadow-md animate-fade-up",
            t.variant === "success" && "border-border bg-success-bg text-success",
            t.variant === "danger" && "border-border bg-danger-bg text-danger",
            t.variant === "default" && "border-border bg-bg-inverse text-fg-inverse",
          )}
        >
          {t.message}
        </button>
      ))}
    </div>
  );
}
