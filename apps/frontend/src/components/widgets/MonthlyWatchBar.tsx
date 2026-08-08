"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { MonthlyWatchPoint } from "@/lib/types";
import { formatMonthShort, usePrefersReducedMotion } from "@/lib/widget-utils";

import { WidgetSrTable } from "./WidgetSrTable";

const GOLD = "#C8A76E";

interface TooltipProps {
  active?: boolean;
  payload?: { payload: { label: string; blocks: number } }[];
}

function WatchTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-md border border-border bg-bg-raised px-3 py-2 text-xs shadow-md">
      <p className="font-semibold text-fg">{p.label}</p>
      <p className="text-fg-muted">
        {p.blocks} {p.blocks === 1 ? "bloque" : "bloques"}
      </p>
    </div>
  );
}

/** Bloques completados por mes, 12 meses. R-08. */
export function MonthlyWatchBar({ data }: { data: MonthlyWatchPoint[] }) {
  const reduced = usePrefersReducedMotion();
  const labelId = React.useId();
  // El campo `minutes` del wire ahora transporta "bloques completados".
  const rows = data.map((p) => ({
    label: formatMonthShort(p.month),
    blocks: p.minutes,
  }));
  const total = data.reduce((s, p) => s + p.minutes, 0);

  return (
    <div role="img" aria-labelledby={labelId}>
      <h3 id={labelId} className="sr-only">
        Bloques completados por mes, últimos 12 meses. Total {total} bloques.
      </h3>
      <div className="h-40 w-full" aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--fg-muted)" }} interval={1} />
            <YAxis tick={{ fontSize: 10, fill: "var(--fg-muted)" }} allowDecimals={false} />
            <Tooltip content={<WatchTooltip />} cursor={{ fill: "var(--bg-sunken)" }} />
            <Bar dataKey="blocks" fill={GOLD} radius={[3, 3, 0, 0]} isAnimationActive={!reduced} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <WidgetSrTable
        caption="Bloques completados por mes"
        columns={["Mes", "Bloques"]}
        rows={rows.map((r) => [r.label, r.blocks])}
      />
    </div>
  );
}
