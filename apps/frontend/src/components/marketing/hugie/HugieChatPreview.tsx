"use client";

import { Mic, SendHorizontal } from "lucide-react";
import type { ReactNode } from "react";

import { HugieOrb, type HugieState } from "@/components/marketing/HugieOrb";
import { useMarketingCopy } from "@/components/marketing/LanguageProvider";

/**
 * Maqueta estática de Hugie dentro de la app (tablero "02 · Hugie en la app").
 * No llama al backend ni es un chat: se expone como una sola imagen con texto
 * alternativo (role="img"), así que nada adentro es foco ni control.
 * `headerState` es el estado del orbe del encabezado (lo elige HugieStates).
 */
export function HugieChatPreview({ headerState }: { headerState: HugieState }) {
  const copy = useMarketingCopy();
  const c = copy.humanize.hugie.chat;
  return (
    <figure className="m-0 min-w-0">
      <div role="img" aria-label={c.alt} className="glass-surface-strong flex flex-col overflow-hidden">
        <div className="flex items-center gap-3.5 border-b border-border px-5 py-4">
          <HugieOrb state={headerState} size={56} />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <span className="font-heading text-xl font-semibold leading-tight text-fg">{c.name}</span>
              <span className="rounded-sm bg-hg-amber/25 px-2 py-1 font-heading text-xs font-semibold text-fg">{c.badge}</span>
            </div>
            <span className="text-sm text-fg-muted">{c.subtitle}</span>
          </div>
        </div>

        <div className="flex flex-col gap-3.5 p-5">
          <HugieBubble>
            {c.m1Before}
            <strong className="text-primary">{c.m1Dim}</strong>
            {c.m1After}
          </HugieBubble>
          <p className="m-0 max-w-[80%] self-end rounded-[16px_16px_4px_16px] bg-primary px-3.5 py-3 text-[15px] leading-normal text-white">
            {c.m2}
          </p>
          <HugieBubble>
            <span className="block">{c.m3}</span>
            <ol className="m-0 mt-1.5 flex list-decimal flex-col gap-1 pl-5">
              {c.m3Steps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
          </HugieBubble>
          <div className="flex items-center gap-2.5">
            <HugieOrb state="pensando" size={28} bare />
            <span className="text-sm text-fg-muted">{c.thinking}</span>
          </div>
        </div>

        <div className="flex flex-col gap-3 px-5 pb-5">
          <div className="flex flex-wrap gap-2">
            {c.suggestions.map((s) => (
              <span key={s} className="rounded-md border border-border bg-surface-card px-3.5 py-2 font-heading text-sm font-semibold text-primary">
                {s}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="flex h-12 min-w-0 flex-1 items-center rounded-md border border-border bg-surface-card px-4 text-[15px] text-fg-subtle">
              {c.placeholder}
            </span>
            <span className="grid h-12 w-12 flex-none place-items-center rounded-md border border-fg-muted text-fg">
              <Mic className="h-[18px] w-[18px]" strokeWidth={1.8} />
            </span>
            <span className="grid h-12 w-12 flex-none place-items-center rounded-md bg-primary text-white">
              <SendHorizontal className="h-[18px] w-[18px]" strokeWidth={1.8} />
            </span>
          </div>
        </div>
      </div>
      <figcaption className="mt-3 text-xs font-medium text-fg-muted">{copy.humanize.hugie.caption}</figcaption>
    </figure>
  );
}

function HugieBubble({ children }: { children: ReactNode }) {
  return (
    <div className="flex max-w-[88%] items-end gap-2.5">
      <HugieOrb size={28} bare />
      <div className="rounded-[16px_16px_16px_4px] border border-border bg-surface-card px-3.5 py-3 text-[15px] leading-normal text-fg">
        {children}
      </div>
    </div>
  );
}
