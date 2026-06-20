"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { MonthlyWatchPoint } from "@/lib/types";
import { formatMonthShort, usePrefersReducedMotion } from "@/lib/widget-utils";

import { WidgetSrTable } from "./WidgetSrTable";

const GOLD = "#C8A76E";

interface TooltipProps {
  active?: boolean;
  payload?: { payload: { label: string; hours: number; minutes: number } }[];
}

function WatchTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-md border border-border bg-bg-raised px-3 py-2 text-xs shadow-md">
      <p className="font-semibold text-fg">{p.label}</p>
      <p className="text-fg-muted">
        {p.hours} h ({p.minutes} min)
      </p>
    </div>
  );
}

/** Tiempo total invertido por mes (en horas), 12 meses. R-08. */
export function MonthlyWatchBar({ data }: { data: MonthlyWatchPoint[] }) {
  const reduced = usePrefersReducedMotion();
  const labelId = React.useId();
  const rows = data.map((p) => ({
    label: formatMonthShort(p.month),
    minutes: p.minutes,
    hours: Math.round((p.minutes / 60) * 10) / 10,
  }));
  const totalH = Math.round((data.reduce((s, p) => s + p.minutes, 0) / 60) * 10) / 10;

  return (
    <div role="img" aria-labelledby={labelId}>
      <h3 id={labelId} className="sr-only">
        Horas totales invertidas por mes, últimos 12 meses. Total {totalH} horas.
      </h3>
      <div className="h-40 w-full" aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--fg-muted)" }} interval={1} />
            <YAxis tick={{ fontSize: 10, fill: "var(--fg-muted)" }} allowDecimals />
            <Tooltip content={<WatchTooltip />} cursor={{ fill: "var(--bg-sunken)" }} />
            <Bar dataKey="hours" fill={GOLD} radius={[3, 3, 0, 0]} isAnimationActive={!reduced} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <WidgetSrTable
        caption="Horas invertidas por mes"
        columns={["Mes", "Horas"]}
        rows={rows.map((r) => [r.label, r.hours])}
      />
    </div>
  );
}
