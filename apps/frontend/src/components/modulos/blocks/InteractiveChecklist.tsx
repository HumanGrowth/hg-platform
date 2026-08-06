"use client";

import { Check, ChevronDown } from "lucide-react";
import * as React from "react";

import { SaveTipButton } from "@/components/plan-accion/SaveTipButton";
import { dimensionStyle } from "@/lib/pillars";
import { cn } from "@/lib/utils";

export interface ChecklistEntry {
  title: string;
  detail?: string | null;
}

interface Props {
  items: ChecklistEntry[];
  /** id del bloque — para persistir el estado marcado en localStorage. */
  storageKey: string;
  dimensionCode?: string;
}

function usePersistedChecks(key: string, count: number): [boolean[], (i: number) => void] {
  const [checks, setChecks] = React.useState<boolean[]>(() => Array(count).fill(false));

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw) as boolean[];
        setChecks(Array.from({ length: count }, (_, i) => parsed[i] ?? false));
      }
    } catch {
      // localStorage no disponible / json inválido → estado en memoria.
    }
  }, [key, count]);

  const toggle = React.useCallback(
    (i: number) => {
      setChecks((prev) => {
        const next = prev.map((v, idx) => (idx === i ? !v : v));
        try {
          localStorage.setItem(key, JSON.stringify(next));
        } catch {
          // best-effort
        }
        return next;
      });
    },
    [key],
  );

  return [checks, toggle];
}

/**
 * Checklist accionable de un `text_solution` (Sprint UI · TASK 6). Checkboxes
 * en color del pilar (persisten en localStorage por bloque), `detail`
 * expandible, y un placeholder de AI "Guardar en mi cuaderno".
 */
export function InteractiveChecklist({ items, storageKey, dimensionCode }: Props) {
  const style = dimensionStyle(dimensionCode);
  const [checks, toggle] = usePersistedChecks(`hg-checklist-${storageKey}`, items.length);
  const [expanded, setExpanded] = React.useState<number | null>(null);

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col gap-2">
        {items.map((item, i) => {
          const checked = checks[i];
          const hasDetail = Boolean(item.detail);
          return (
            <li key={i} className="rounded-md border border-border bg-bg-raised">
              <div className="flex items-start gap-3 p-3">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={checked}
                  aria-label={item.title}
                  onClick={() => toggle(i)}
                  style={checked ? { backgroundColor: style.glow, borderColor: style.glow } : undefined}
                  className={cn(
                    "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors",
                    checked ? "text-white" : "border-border-strong text-transparent",
                  )}
                >
                  <Check size={13} strokeWidth={3} />
                </button>
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    disabled={!hasDetail}
                    onClick={() => setExpanded((e) => (e === i ? null : i))}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 text-left font-sans text-sm",
                      checked ? "text-fg-muted line-through" : "text-fg",
                    )}
                  >
                    <span>{item.title}</span>
                    {hasDetail && (
                      <ChevronDown
                        size={16}
                        strokeWidth={2}
                        className={cn("shrink-0 text-fg-subtle transition-transform", expanded === i && "rotate-180")}
                      />
                    )}
                  </button>
                  {hasDetail && expanded === i && (
                    <p className="mt-2 text-sm text-fg-muted">{item.detail}</p>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <SaveTipButton
        prefillText={items.map((it) => `• ${it.title}`).join("\n")}
        dimensionCode={dimensionCode}
        source="solution"
        className="self-start"
      />
    </div>
  );
}
