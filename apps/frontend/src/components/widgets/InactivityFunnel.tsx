"use client";

import * as React from "react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { InactivityBuckets } from "@/lib/types";
import { usePrefersReducedMotion } from "@/lib/widget-utils";

import { WidgetSrTable } from "./WidgetSrTable";

// success → warning → danger según gravedad de la inactividad.
const STAGES: { key: keyof InactivityBuckets; label: string; fill: string }[] = [
  { key: "active", label: "Activos (24h)", fill: "#4A7A54" },
  { key: "inactive_1_7d", label: "1-7 días", fill: "#A8C4A0" },
  { key: "inactive_8_14d", label: "8-14 días", fill: "#E8A030" },
  { key: "inactive_15_30d", label: "15-30 días", fill: "#D9702A" },
  { key: "inactive_gt_30d", label: "+30 días", fill: "#B83A1A" },
  { key: "never_active", label: "Nunca", fill: "#6B7061" },
];

interface TooltipProps {
  active?: boolean;
  payload?: { payload: { label: string; value: number; pct: string } }[];
}

function FunnelTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-md border border-border bg-bg-raised px-3 py-2 text-xs shadow-md">
      <p className="font-semibold text-fg">{p.label}</p>
      <p className="text-fg-muted">
        {p.value} {p.value === 1 ? "persona" : "personas"} · {p.pct}
      </p>
    </div>
  );
}

/** Funnel de inactividad por buckets de tiempo. M-03. */
export function InactivityFunnel({ buckets, total }: { buckets: InactivityBuckets; total: number }) {
  const reduced = usePrefersReducedMotion();
  const labelId = React.useId();
  const rows = STAGES.map((s) => ({
    label: s.label,
    value: buckets[s.key],
    fill: s.fill,
    pct: total > 0 ? `${Math.round((buckets[s.key] / total) * 100)}%` : "0%",
  }));

  return (
    <div role="img" aria-labelledby={labelId}>
      <h3 id={labelId} className="sr-only">
        Distribución del equipo ({total} personas) por tiempo de inactividad.
      </h3>
      <div className="h-48 w-full" aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 12, bottom: 0, left: 0 }}>
            <XAxis type="number" hide allowDecimals={false} />
            <YAxis
              type="category"
              dataKey="label"
              width={90}
              tick={{ fontSize: 10, fill: "var(--fg-muted)" }}
            />
            <Tooltip content={<FunnelTooltip />} cursor={{ fill: "var(--bg-sunken)" }} />
            <Bar dataKey="value" radius={[0, 3, 3, 0]} isAnimationActive={!reduced}>
              {rows.map((r) => (
                <Cell key={r.label} fill={r.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <WidgetSrTable
        caption={`Inactividad del equipo (${total} personas)`}
        columns={["Bucket", "Personas", "%"]}
        rows={rows.map((r) => [r.label, r.value, r.pct])}
      />
    </div>
  );
}
