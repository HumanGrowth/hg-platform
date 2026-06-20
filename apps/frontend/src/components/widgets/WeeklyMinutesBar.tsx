"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { WeeklyMinutesBar as WeeklyBar } from "@/lib/types";
import { formatDayShort, usePrefersReducedMotion } from "@/lib/widget-utils";

import { WidgetSrTable } from "./WidgetSrTable";

const PILLAR_P1 = "#E8530A";

interface TooltipPayload {
  active?: boolean;
  payload?: { payload: { label: string; minutes: number; weekEndLabel: string } }[];
}

function WeeklyTooltip({ active, payload }: TooltipPayload) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-md border border-border bg-bg-raised px-3 py-2 text-xs shadow-md">
      <p className="font-semibold text-fg">
        Semana del {p.label} al {p.weekEndLabel}
      </p>
      <p className="text-fg-muted">{p.minutes} min</p>
    </div>
  );
}

/** Tiempo invertido por semana, últimas 12 semanas. C-04. */
export function WeeklyMinutesBar({ data }: { data: WeeklyBar[] }) {
  const reduced = usePrefersReducedMotion();
  const labelId = React.useId();

  const rows = data.map((w) => {
    const end = new Date(`${w.week_start}T00:00:00`);
    end.setDate(end.getDate() + 6);
    return {
      label: formatDayShort(w.week_start),
      weekEndLabel: `${end.getDate()}`,
      minutes: w.minutes,
    };
  });
  const total = data.reduce((s, w) => s + w.minutes, 0);

  return (
    <div role="img" aria-labelledby={labelId}>
      <h3 id={labelId} className="sr-only">
        Minutos por semana, últimas 12 semanas. Total {total} minutos.
      </h3>
      <div className="h-40 w-full" aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--fg-muted)" }} interval={1} />
            <YAxis tick={{ fontSize: 10, fill: "var(--fg-muted)" }} allowDecimals={false} />
            <Tooltip content={<WeeklyTooltip />} cursor={{ fill: "var(--bg-sunken)" }} />
            <Bar
              dataKey="minutes"
              fill={PILLAR_P1}
              radius={[3, 3, 0, 0]}
              isAnimationActive={!reduced}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <WidgetSrTable
        caption="Minutos por semana"
        columns={["Semana (inicio)", "Minutos"]}
        rows={rows.map((r) => [r.label, r.minutes])}
      />
    </div>
  );
}
