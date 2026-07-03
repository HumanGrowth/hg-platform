"use client";

import { ChevronDown, MapPin } from "lucide-react";
import * as React from "react";

import { HexIcon } from "@/components/ui/hex-icon";
import { cn } from "@/lib/utils";

export interface MethodPillar {
  code: string;
  name: string;
  tag: string;
  definition: string;
  notWhat: string;
  roots: string;
  evidence: string;
  structure: string;
  latam: string;
}

/**
 * Los 6 pilares en accordion (uno abierto a la vez). Stack apilado en cualquier
 * ancho — degrada bien en mobile sin cambiar de layout.
 */
export function MethodPillars({
  pillars,
  structureLabel,
  latamLabel,
}: {
  pillars: readonly MethodPillar[];
  structureLabel: string;
  latamLabel: string;
}) {
  const [open, setOpen] = React.useState<number>(0);

  return (
    <div className="flex flex-col gap-3">
      {pillars.map((p, i) => {
        const isOpen = open === i;
        const panelId = `pillar-panel-${p.code}`;
        return (
          <div
            key={p.code}
            className="overflow-hidden rounded-lg border border-border bg-surface-card"
          >
            <button
              type="button"
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => setOpen(isOpen ? -1 : i)}
              className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-bg-sunken"
            >
              <HexIcon pillar={p.code} size={40} />
              <span className="min-w-0 flex-1">
                <span className="block font-heading text-md font-semibold text-fg">{p.name}</span>
                <span className="mt-0.5 block font-mono text-xs text-fg-muted">{p.tag}</span>
              </span>
              <ChevronDown
                size={20}
                strokeWidth={1.75}
                aria-hidden
                className={cn("shrink-0 text-fg-muted transition-transform", isOpen && "rotate-180")}
              />
            </button>

            {isOpen && (
              <div id={panelId} className="border-t border-border px-5 py-6 sm:px-[76px]">
                <p className="text-[17px] leading-[1.55] text-fg">{p.definition}</p>
                <p className="mt-2 text-sm leading-[1.55] text-fg-muted">{p.notWhat}</p>

                <dl className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <dt className="eyebrow mb-1">Raíces teóricas</dt>
                    <dd className="text-sm leading-[1.55] text-hg-charcoal">{p.roots}</dd>
                  </div>
                  <div>
                    <dt className="eyebrow mb-1">Evidencia causal</dt>
                    <dd className="text-sm leading-[1.55] text-hg-charcoal">{p.evidence}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="eyebrow mb-1">{structureLabel}</dt>
                    <dd className="text-sm leading-[1.55] text-hg-charcoal">{p.structure}</dd>
                  </div>
                </dl>

                {p.latam ? (
                  <div className="mt-5 flex items-start gap-2 rounded-md bg-hg-green-100 px-4 py-3">
                    <MapPin size={16} strokeWidth={2} aria-hidden className="mt-0.5 shrink-0 text-primary" />
                    <p className="text-sm leading-[1.5] text-primary">
                      <span className="font-semibold">{latamLabel}:</span> {p.latam}
                    </p>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
