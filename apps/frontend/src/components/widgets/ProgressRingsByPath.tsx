"use client";

import * as React from "react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

import type { Enrollment } from "@/lib/types";
import { usePrefersReducedMotion } from "@/lib/widget-utils";

import { WidgetSrTable } from "./WidgetSrTable";

type PillarCode = "P1" | "P2" | "P3" | "P4" | "P5" | "P6";

const PILLAR_HEX: Record<PillarCode, string> = {
  P1: "#E8530A",
  P2: "#C8A76E",
  P3: "#4A7A54",
  P4: "#A8C4A0",
  P5: "#2C3E50",
  P6: "#6B7061",
};
const REMAINING = "#F0EDE6"; // cream-200

function Ring({ code, pct }: { code: PillarCode; pct: number }) {
  const reduced = usePrefersReducedMotion();
  const data = [
    { name: "done", value: pct },
    { name: "rest", value: 100 - pct },
  ];
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative h-20 w-20" aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              innerRadius={26}
              outerRadius={36}
              startAngle={90}
              endAngle={-270}
              stroke="none"
              isAnimationActive={!reduced}
            >
              <Cell fill={PILLAR_HEX[code]} />
              <Cell fill={REMAINING} />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <span className="absolute inset-0 flex items-center justify-center font-mono text-sm font-semibold text-fg">
          {pct}%
        </span>
      </div>
      <span className="font-mono text-xs text-fg-muted">{code}</span>
    </div>
  );
}

/** Donuts pequeños de completion por path activo. C-06. */
export function ProgressRingsByPath({
  enrollments,
  pillarCompletionRates,
}: {
  enrollments: Enrollment[];
  pillarCompletionRates: Record<string, number>;
}) {
  const labelId = React.useId();
  const active = enrollments.filter((e) => e.is_active);
  const rings = active.map((e) => ({
    code: e.career_path_code as PillarCode,
    pct: Math.round((pillarCompletionRates[e.career_path_code] ?? 0) * 100),
  }));

  if (rings.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-fg-muted">
        Todavía no tenés paths asignados.
      </p>
    );
  }

  return (
    <div role="img" aria-labelledby={labelId}>
      <h3 id={labelId} className="sr-only">
        Progreso de completion por path activo.
      </h3>
      <div className="flex flex-wrap gap-4" aria-hidden>
        {rings.map((r) => (
          <Ring key={r.code} code={r.code} pct={r.pct} />
        ))}
      </div>
      <WidgetSrTable
        caption="Completion por path activo"
        columns={["Pilar", "Completion %"]}
        rows={rings.map((r) => [r.code, `${r.pct}%`])}
      />
    </div>
  );
}
