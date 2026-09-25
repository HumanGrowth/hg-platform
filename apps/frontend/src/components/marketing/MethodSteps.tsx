"use client";

import { RevealGroup } from "@/components/marketing/fx/Reveal";
import { SpotlightCard } from "@/components/marketing/fx/SpotlightCard";

interface Step {
  n: string;
  name: string;
  body: string;
}

/** Las 5 etapas de la metodología. 1 col mobile → 5 en lg. */
export function MethodSteps({ items }: { items: readonly Step[] }) {
  return (
    <RevealGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5" step={0.08}>
      {items.map((s) => (
        <SpotlightCard key={s.n} className="flex h-full flex-col p-5">
          <span className="font-mono text-sm font-semibold text-primary">{s.n}</span>
          <h3 className="mt-2 font-heading text-md font-semibold leading-tight text-fg">{s.name}</h3>
          <p className="mt-2 text-sm leading-[1.5] text-fg-muted">{s.body}</p>
        </SpotlightCard>
      ))}
    </RevealGroup>
  );
}
