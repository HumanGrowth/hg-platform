"use client";

import * as React from "react";

import { Eyebrow } from "@/components/ui/eyebrow";
import { InactivityFunnel, TeamActivityHeatmap, WidgetCard } from "@/components/widgets";
import type { WidgetState } from "@/components/widgets/WidgetCard";
import { apiGetManagerWidgets } from "@/lib/api";
import type { ManagerWidgets, TeamOrgComparison } from "@/lib/types";

/** Fila comparativa equipo vs org con dos barras y delta. */
function CompareRow({
  label,
  team,
  org,
  format,
}: {
  label: string;
  team: number;
  org: number;
  format: (v: number) => string;
}) {
  const max = Math.max(team, org, 0.0001);
  const delta = team - org;
  const deltaTone = delta >= 0 ? "text-success" : "text-danger";
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-fg">{label}</span>
        <span className={`text-xs font-semibold ${deltaTone}`}>
          {delta >= 0 ? "▲" : "▼"} {format(Math.abs(delta))} vs org
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-14 shrink-0 text-xs text-fg-muted">Equipo</span>
        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-bg-sunken">
          <div className="h-full rounded-full bg-primary" style={{ width: `${(team / max) * 100}%` }} />
        </div>
        <span className="w-12 shrink-0 text-right font-mono text-xs text-fg">{format(team)}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-14 shrink-0 text-xs text-fg-muted">Org</span>
        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-bg-sunken">
          <div className="h-full rounded-full bg-fg-subtle" style={{ width: `${(org / max) * 100}%` }} />
        </div>
        <span className="w-12 shrink-0 text-right font-mono text-xs text-fg-muted">{format(org)}</span>
      </div>
    </div>
  );
}

function TeamComparison({ c }: { c: TeamOrgComparison }) {
  const asPct = (v: number) => `${Math.round(v * 100)}%`;
  const asNum = (v: number) => v.toFixed(1);
  return (
    <div className="flex flex-col gap-5 rounded-lg border border-border bg-bg-raised p-5">
      <CompareRow label="Adopción (activos)" team={c.team_adoption} org={c.org_adoption} format={asPct} />
      <CompareRow
        label="Módulos completados (prom.)"
        team={c.team_avg_completed}
        org={c.org_avg_completed}
        format={asNum}
      />
      <p className="text-xs text-fg-subtle">
        Tu equipo ({c.team_size}) comparado con el promedio de su organización ({c.org_size}).
      </p>
    </div>
  );
}

export default function TeamWidgetsSection() {
  const [state, setState] = React.useState<WidgetState>("loading");
  const [data, setData] = React.useState<ManagerWidgets | null>(null);

  const load = React.useCallback(async () => {
    setState("loading");
    try {
      setData(await apiGetManagerWidgets());
      setState("ok");
    } catch {
      setState("error");
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const total = data ? Object.values(data.inactivity_buckets).reduce((s, n) => s + n, 0) : 0;
  const activityState: WidgetState =
    state === "ok" && data && data.team_activity.length === 0 ? "empty" : state;

  return (
    <section className="mb-8">
      <Eyebrow>Vista de equipo</Eyebrow>
      {data?.comparison && data.comparison.team_size > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-meta text-fg-muted">
            Tu equipo vs su organización
          </p>
          <TeamComparison c={data.comparison} />
        </div>
      )}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <WidgetCard
          title="Actividad del equipo"
          description="Bloques completados por persona en los últimos 30 días."
          state={activityState}
          onRetry={load}
          emptyMessage="Sin actividad del equipo en los últimos 30 días."
        >
          {data ? <TeamActivityHeatmap data={data.team_activity} /> : null}
        </WidgetCard>
        <WidgetCard
          title="Inactividad por tiempo"
          description="Cómo se distribuye tu equipo según su última actividad."
          state={state}
          onRetry={load}
        >
          {data ? <InactivityFunnel buckets={data.inactivity_buckets} total={total} /> : null}
        </WidgetCard>
      </div>
    </section>
  );
}
