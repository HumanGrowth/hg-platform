"use client";

import { StaggerBounceGrid } from "@/components/motion/StaggerBounceGrid";

interface Step {
  n: string;
  name: string;
  body: string;
}

/** Las 5 etapas de la metodología. 1 col mobile → 5 en lg, entrada stagger-bounce. */
export function MethodSteps({ items }: { items: readonly Step[] }) {
  return (
    <StaggerBounceGrid className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {items.map((s) => (
        <div
          key={s.n}
          className="flex flex-col rounded-lg border border-border bg-surface-card p-5"
        >
          <span className="font-mono text-sm font-semibold text-primary">{s.n}</span>
          <h3 className="mt-2 font-heading text-md font-semibold leading-tight text-fg">{s.name}</h3>
          <p className="mt-2 text-sm leading-[1.5] text-hg-charcoal">{s.body}</p>
        </div>
      ))}
    </StaggerBounceGrid>
  );
}
