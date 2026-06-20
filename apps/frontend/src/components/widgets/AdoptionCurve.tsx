"use client";

import * as React from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { AdoptionMonthPoint } from "@/lib/types";
import { formatMonthShort, usePrefersReducedMotion } from "@/lib/widget-utils";

import { WidgetSrTable } from "./WidgetSrTable";

const FOREST = "#4A7A54";

interface TooltipProps {
  active?: boolean;
  payload?: { payload: { label: string; active_users: number } }[];
}

function CurveTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-md border border-border bg-bg-raised px-3 py-2 text-xs shadow-md">
      <p className="font-semibold text-fg">{p.label}</p>
      <p className="text-fg-muted">{p.active_users} usuarios activos</p>
    </div>
  );
}

/** Curva de adopción: usuarios activos por mes, 12 meses. R-01. */
export function AdoptionCurve({ data }: { data: AdoptionMonthPoint[] }) {
  const reduced = usePrefersReducedMotion();
  const labelId = React.useId();
  const rows = data.map((p) => ({ label: formatMonthShort(p.month), active_users: p.active_users }));
  const meaningful = data.filter((p) => p.active_users > 0).length;

  if (meaningful < 2) {
    return (
      <p className="flex h-40 items-center justify-center px-4 text-center text-sm text-fg-muted">
        Necesitamos más historial para mostrar la tendencia de adopción.
      </p>
    );
  }

  return (
    <div role="img" aria-labelledby={labelId}>
      <h3 id={labelId} className="sr-only">
        Usuarios activos por mes, últimos 12 meses.
      </h3>
      <div className="h-40 w-full" aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--fg-muted)" }} interval={1} />
            <YAxis tick={{ fontSize: 10, fill: "var(--fg-muted)" }} allowDecimals={false} />
            <Tooltip content={<CurveTooltip />} />
            <Line
              type="monotone"
              dataKey="active_users"
              stroke={FOREST}
              strokeWidth={2}
              dot={{ r: 2, fill: FOREST }}
              isAnimationActive={!reduced}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <WidgetSrTable
        caption="Usuarios activos por mes"
        columns={["Mes", "Usuarios activos"]}
        rows={rows.map((r) => [r.label, r.active_users])}
      />
    </div>
  );
}
