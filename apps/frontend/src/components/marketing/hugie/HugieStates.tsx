"use client";

import { HugieOrb, type HugieState } from "@/components/marketing/HugieOrb";
import { useMarketingCopy } from "@/components/marketing/LanguageProvider";
import { cn } from "@/lib/utils";

/**
 * Fila con los 5 estados del orbe. Botones de alternancia (aria-pressed): al
 * elegir uno, el padre cambia el orbe del chat y la descripción se anuncia
 * (aria-live). Solo estado local.
 */
export function HugieStates({ value, onChange }: { value: HugieState; onChange: (s: HugieState) => void }) {
  const c = useMarketingCopy().humanize.hugie;
  const current = c.states.find((s) => s.key === value) ?? c.states[0];
  return (
    <div className="flex flex-col gap-2">
      <span className="font-heading text-[13px] font-semibold text-fg">{c.statesTitle}</span>
      <div role="group" aria-label={c.statesLabel} className="grid grid-cols-5 gap-1">
        {c.states.map((s) => {
          const on = s.key === value;
          return (
            <button
              key={s.key}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(s.key as HugieState)}
              className={cn(
                "flex min-w-0 flex-col items-center gap-2 rounded-lg border px-1 py-2.5 transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg",
                on ? "glass-surface-strong border-primary" : "border-transparent hover:bg-surface-card",
              )}
            >
              <HugieOrb state={s.key as HugieState} size="clamp(44px, 12vw, 72px)" />
              <span className="font-heading text-xs font-semibold leading-tight text-fg">{s.name}</span>
            </button>
          );
        })}
      </div>
      <p className="m-0 min-h-[42px] text-sm text-fg-muted" aria-live="polite">
        {current.desc}
      </p>
    </div>
  );
}
