"use client";

import * as React from "react";

import { Eyebrow } from "@/components/ui/eyebrow";
import { InactivityFunnel, TeamActivityHeatmap, WidgetCard } from "@/components/widgets";
import type { WidgetState } from "@/components/widgets/WidgetCard";
import { apiGetManagerWidgets } from "@/lib/api";
import type { ManagerWidgets } from "@/lib/types";

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
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <WidgetCard
          title="Actividad del equipo"
          description="Minutos por persona en los últimos 30 días."
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
