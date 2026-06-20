"use client";

import * as React from "react";

import type { StreakDay } from "@/lib/types";
import { formatDayShort, getStreakSummary, widgetColorScale } from "@/lib/widget-utils";

import { WidgetSrTable } from "./WidgetSrTable";

/** Heatmap estilo GitHub: 90 días en columnas de 7 (semana). C-03. */
export function StreakHeatmap({ data }: { data: StreakDay[] }) {
  const max = Math.max(1, ...data.map((d) => d.minutes));
  const summary = getStreakSummary(data);
  const labelId = React.useId();
  const summaryText = `${summary.activeDays} días activos en los últimos 90 · racha actual ${summary.currentStreak} · racha más larga ${summary.longestStreak}`;

  return (
    <div role="img" aria-labelledby={labelId} className="flex flex-col gap-2">
      <h3 id={labelId} className="sr-only">
        Mapa de actividad de los últimos 90 días. {summaryText}
      </h3>

      <div className="grid grid-flow-col grid-rows-7 gap-1" aria-hidden>
        {data.map((d) => (
          <div
            key={d.date}
            title={`${formatDayShort(d.date)} · ${d.minutes} min`}
            className={`h-3 w-3 rounded-[3px] ${widgetColorScale(d.minutes, max)}`}
          />
        ))}
      </div>

      <div className="flex items-center justify-between text-xs text-fg-muted">
        <span>
          <span className="font-semibold text-fg">{summary.activeDays}</span> días activos
        </span>
        <span className="flex items-center gap-1" aria-hidden>
          <span>menos</span>
          <span className="h-2.5 w-2.5 rounded-[2px] bg-cream-200" />
          <span className="h-2.5 w-2.5 rounded-[2px] bg-pillar-p1/40" />
          <span className="h-2.5 w-2.5 rounded-[2px] bg-pillar-p1/70" />
          <span className="h-2.5 w-2.5 rounded-[2px] bg-pillar-p1" />
          <span>más</span>
        </span>
      </div>

      <WidgetSrTable
        caption={`Actividad diaria. ${summaryText}`}
        columns={["Día", "Minutos"]}
        rows={data.filter((d) => d.has_activity).map((d) => [formatDayShort(d.date), d.minutes])}
      />
    </div>
  );
}
