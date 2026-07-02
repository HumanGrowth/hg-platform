"use client";

import { ArrowDown } from "lucide-react";
import * as React from "react";

import { radarValuesFromResults } from "@/lib/assessment-utils";
import { apiGetMyResults } from "@/lib/api";
import { PILLARS } from "@/lib/pillars";

const PILLAR_NAME: Record<string, string> = Object.fromEntries(
  PILLARS.map((p) => [p.id, p.name]),
);
const DOT: Record<string, string> = Object.fromEntries(PILLARS.map((p) => [p.id, p.dot]));

/**
 * CTA contextual (TASK 08): del assessment, resalta el pilar con el puntaje
 * más bajo (el cuello de botella) y lleva al carril correspondiente de la ruta.
 * Si no hay resultados aún, no renderiza nada.
 */
export function PathBottleneckCta() {
  const [pillar, setPillar] = React.useState<string | null>(null);

  React.useEffect(() => {
    let alive = true;
    apiGetMyResults()
      .then(({ results }) => {
        if (!alive || results.length === 0) return;
        const values = radarValuesFromResults(results);
        const entries = Object.entries(values).filter(([, v]) => v > 0);
        if (entries.length === 0) return;
        const [lowest] = entries.reduce((a, b) => (b[1] < a[1] ? b : a));
        setPillar(lowest);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  if (!pillar) return null;
  const name = PILLAR_NAME[pillar] ?? pillar;

  return (
    <div className="mb-8 flex flex-col gap-3 rounded-lg border border-hg-green-100 bg-hg-green-100 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className={`mt-1.5 h-3 w-3 shrink-0 rounded-full ${DOT[pillar] ?? "bg-primary"}`} />
        <div>
          <p className="font-sans text-sm font-semibold text-fg">
            Tu prioridad ahora: {name}
          </p>
          <p className="text-sm text-fg-muted">
            Es la dimensión con más espacio para crecer según tu evaluación. Empezá por ahí.
          </p>
        </div>
      </div>
      <a
        href={`#lane-${pillar}`}
        className="inline-flex shrink-0 items-center gap-2 self-start rounded-md bg-primary px-4 py-2 font-sans text-sm font-semibold text-white hover:bg-primary-hover sm:self-auto"
      >
        Ver cursos
        <ArrowDown size={16} strokeWidth={1.75} />
      </a>
    </div>
  );
}
