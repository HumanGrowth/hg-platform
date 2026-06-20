"use client";

import * as React from "react";

import { Eyebrow } from "@/components/ui/eyebrow";
import {
  ProgressRingsByPath,
  StreakHeatmap,
  WeeklyMinutesBar,
  WidgetCard,
} from "@/components/widgets";
import { apiGetMeWidgets } from "@/lib/api";
import type { Enrollment, MeWidgets } from "@/lib/types";
import type { WidgetState } from "@/components/widgets/WidgetCard";

export default function HomeActivitySection({
  enrollments,
  pillarCompletionRates,
}: {
  enrollments: Enrollment[];
  pillarCompletionRates: Record<string, number>;
}) {
  const [state, setState] = React.useState<WidgetState>("loading");
  const [data, setData] = React.useState<MeWidgets | null>(null);

  const load = React.useCallback(async () => {
    setState("loading");
    try {
      setData(await apiGetMeWidgets());
      setState("ok");
    } catch {
      setState("error");
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="mt-12">
      <Eyebrow>Tu actividad</Eyebrow>
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <WidgetCard
          title="Racha de actividad"
          description="Días con actividad en los últimos 90 días."
          state={state}
          onRetry={load}
        >
          {data ? <StreakHeatmap data={data.streak} /> : null}
        </WidgetCard>
        <WidgetCard
          title="Tiempo por semana"
          description="Minutos invertidos en las últimas 12 semanas."
          state={state}
          onRetry={load}
        >
          {data ? <WeeklyMinutesBar data={data.weekly_minutes} /> : null}
        </WidgetCard>
      </div>
      <div className="mt-4">
        <WidgetCard
          title="Progreso por path"
          description="Completion de cada path que tenés asignado."
        >
          <ProgressRingsByPath
            enrollments={enrollments}
            pillarCompletionRates={pillarCompletionRates}
          />
        </WidgetCard>
      </div>
    </section>
  );
}
