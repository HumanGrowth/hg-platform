"use client";

import * as React from "react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { OnboardingFunnel } from "@/lib/types";
import { usePrefersReducedMotion } from "@/lib/widget-utils";

import { WidgetSrTable } from "./WidgetSrTable";

const STAGES: { key: keyof OnboardingFunnel; label: string; fill: string }[] = [
  { key: "invited", label: "Invitados", fill: "#2C3E50" },
  { key: "accepted", label: "Aceptados", fill: "#4A7A54" },
  { key: "first_login", label: "Primer login", fill: "#5E8A66" },
  { key: "first_course", label: "Primer curso", fill: "#C8A76E" },
  { key: "first_completion", label: "Primera completion", fill: "#E8530A" },
];

interface TooltipProps {
  active?: boolean;
  payload?: { payload: { label: string; value: number; pct: string } }[];
}

function StageTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-md border border-border bg-bg-raised px-3 py-2 text-xs shadow-md">
      <p className="font-semibold text-fg">{p.label}</p>
      <p className="text-fg-muted">
        {p.value} · {p.pct} de invitados
      </p>
    </div>
  );
}

/** Funnel de onboarding: invited → accepted → login → course → completion. R-03. */
export function OnboardingFunnelChart({ funnel }: { funnel: OnboardingFunnel }) {
  const reduced = usePrefersReducedMotion();
  const labelId = React.useId();
  const invited = funnel.invited || 1;
  const rows = STAGES.map((s) => ({
    label: s.label,
    value: funnel[s.key],
    fill: s.fill,
    pct: `${Math.round((funnel[s.key] / invited) * 100)}%`,
  }));

  return (
    <div role="img" aria-labelledby={labelId}>
      <h3 id={labelId} className="sr-only">
        Funnel de onboarding desde {funnel.invited} invitados hasta {funnel.first_completion}{" "}
        primeras completions.
      </h3>
      <div className="h-48 w-full" aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 12, bottom: 0, left: 0 }}>
            <XAxis type="number" hide allowDecimals={false} />
            <YAxis
              type="category"
              dataKey="label"
              width={100}
              tick={{ fontSize: 10, fill: "var(--fg-muted)" }}
            />
            <Tooltip content={<StageTooltip />} cursor={{ fill: "var(--bg-sunken)" }} />
            <Bar dataKey="value" radius={[0, 3, 3, 0]} isAnimationActive={!reduced}>
              {rows.map((r) => (
                <Cell key={r.label} fill={r.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <WidgetSrTable
        caption="Funnel de onboarding"
        columns={["Etapa", "Personas", "% de invitados"]}
        rows={rows.map((r) => [r.label, r.value, r.pct])}
      />
    </div>
  );
}
