"use client";

import * as React from "react";

import { Avatar } from "@/components/ui/avatar";
import type { TeamActivityCell } from "@/lib/types";
import { formatDayShort, widgetColorScale } from "@/lib/widget-utils";

import { WidgetSrTable } from "./WidgetSrTable";

const DAYS = 30;

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Heatmap de actividad del equipo: 30 días x reportes con actividad. M-01. */
export function TeamActivityHeatmap({ data }: { data: TeamActivityCell[] }) {
  const labelId = React.useId();

  // Ventana de 30 días terminando en la fecha más reciente con datos (o hoy).
  const maxDate = data.reduce<string | null>((m, c) => (!m || c.date > m ? c.date : m), null);
  const end = maxDate ? new Date(`${maxDate}T00:00:00`) : new Date();
  const days: string[] = [];
  for (let i = DAYS - 1; i >= 0; i -= 1) {
    const d = new Date(end);
    d.setDate(d.getDate() - i);
    days.push(isoDay(d));
  }

  // Agrupar por usuario.
  const byUser = new Map<string, { name: string; total: number; cells: Map<string, number> }>();
  for (const c of data) {
    let u = byUser.get(c.user_id);
    if (!u) {
      u = { name: c.user_full_name, total: 0, cells: new Map() };
      byUser.set(c.user_id, u);
    }
    u.cells.set(c.date, (u.cells.get(c.date) ?? 0) + c.minutes);
    u.total += c.minutes;
  }
  const users = [...byUser.values()].sort((a, b) => b.total - a.total);
  const max = Math.max(1, ...data.map((c) => c.minutes));

  return (
    <div role="img" aria-labelledby={labelId}>
      <h3 id={labelId} className="sr-only">
        Mapa de actividad del equipo en los últimos 30 días, {users.length} personas con actividad.
      </h3>

      <div className="max-h-72 overflow-auto" aria-hidden>
        <div className="flex flex-col gap-1">
          {users.map((u) => (
            <div key={u.name} className="flex items-center gap-2">
              <div className="sticky left-0 flex w-36 shrink-0 items-center gap-2 bg-bg-raised">
                <Avatar name={u.name} size="sm" />
                <span className="truncate text-xs text-fg">{u.name}</span>
              </div>
              <div className="flex gap-[3px]">
                {days.map((day) => {
                  const min = u.cells.get(day) ?? 0;
                  return (
                    <span
                      key={day}
                      title={`${u.name} · ${formatDayShort(day)} · ${min} min`}
                      className={`h-3 w-3 rounded-[3px] ${widgetColorScale(min, max)}`}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <WidgetSrTable
        caption="Actividad del equipo por persona (minutos totales últimos 30 días)"
        columns={["Persona", "Minutos (30d)"]}
        rows={users.map((u) => [u.name, u.total])}
      />
    </div>
  );
}
