"use client";

import { Info } from "lucide-react";
import * as React from "react";

import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";

export type WidgetState = "loading" | "error" | "empty" | "ok";

export interface WidgetCardProps {
  title: string;
  /** Texto del tooltip ⓘ que explica qué mide el widget. */
  description?: string;
  state?: WidgetState;
  onRetry?: () => void;
  emptyMessage?: string;
  footer?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

export function WidgetCard({
  title,
  description,
  state = "ok",
  onRetry,
  emptyMessage = "Sin datos todavía.",
  footer,
  className,
  children,
}: WidgetCardProps) {
  return (
    <Card className={`flex flex-col gap-3 bg-bg-raised ${className ?? ""}`}>
      <div className="flex items-start justify-between gap-2">
        <Eyebrow>{title}</Eyebrow>
        {description ? (
          <span
            className="group relative inline-flex shrink-0 text-fg-subtle"
            tabIndex={0}
            role="note"
            aria-label={description}
          >
            <Info size={14} strokeWidth={1.75} aria-hidden />
            <span className="pointer-events-none absolute right-0 top-5 z-10 hidden w-48 rounded-md border border-border bg-bg-raised p-2 text-xs text-fg-muted shadow-md group-hover:block group-focus:block">
              {description}
            </span>
          </span>
        ) : null}
      </div>

      {state === "loading" && (
        <div className="h-40 w-full animate-pulse rounded-md bg-bg-sunken" aria-hidden />
      )}

      {state === "error" && (
        <div className="flex h-40 flex-col items-center justify-center gap-3 text-center">
          <p className="text-sm text-fg-muted">No pudimos cargar este widget.</p>
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="rounded-md border border-border-strong px-4 py-1.5 text-sm font-semibold text-fg hover:bg-bg-sunken"
            >
              Reintentar
            </button>
          ) : null}
        </div>
      )}

      {state === "empty" && (
        <div className="flex h-40 items-center justify-center text-center">
          <p className="max-w-xs text-sm text-fg-muted">{emptyMessage}</p>
        </div>
      )}

      {state === "ok" && <div className="min-w-0">{children}</div>}

      {state === "ok" && footer ? <div className="mt-auto pt-1">{footer}</div> : null}
    </Card>
  );
}
