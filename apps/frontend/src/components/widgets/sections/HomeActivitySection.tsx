"use client";

import type { Route } from "next";
import Link from "next/link";
import * as React from "react";

import { EmptyRing } from "@/components/EmptyRing";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { StreakHeatmap, WidgetCard } from "@/components/widgets";
import { apiGetMeWidgets } from "@/lib/api";
import { dimensionBadgeVariant, dimensionShortName } from "@/lib/dimension-styles";
import type { HomeRecentActivity, MeWidgets } from "@/lib/types";
import type { WidgetState } from "@/components/widgets/WidgetCard";
import { formatRelativeTime } from "@/lib/utils";

/**
 * "Tu actividad" — junta el gráfico de racha de actividad y la actividad
 * reciente en una sola sección (se quitaron progreso-por-path y actividad-por-
 * semana). En desktop van lado a lado; en mobile apilados.
 */
export default function HomeActivitySection({
  recentActivity,
}: {
  recentActivity: HomeRecentActivity[];
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

        <Card className="flex flex-col bg-bg-raised">
          <h3 className="font-sans text-md font-semibold text-fg">Actividad reciente</h3>
          {recentActivity.length === 0 ? (
            <div className="flex flex-1 items-center justify-center py-10">
              <EmptyRing label="Sin actividad aún. Comenzá explorando una dimensión." />
            </div>
          ) : (
            <ul className="mt-4 flex flex-col gap-2">
              {recentActivity.map((a) => (
                <li key={a.course_id}>
                  <Link
                    href={`/modulos/${a.course_slug}` as Route}
                    className="flex items-center gap-3 rounded-lg border border-border bg-surface-card px-4 py-3 transition-colors hover:bg-bg-raised"
                  >
                    <Badge variant={dimensionBadgeVariant(a.dimension_code)}>
                      {dimensionShortName(a.dimension_code)}
                    </Badge>
                    <span className="min-w-0 flex-1 truncate font-sans text-sm font-medium text-fg">
                      {a.course_title}
                    </span>
                    {a.is_completed && (
                      <span className="shrink-0 text-xs font-semibold text-success">Completado</span>
                    )}
                    <span className="shrink-0 text-xs text-fg-muted">
                      {formatRelativeTime(a.last_played_at)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </section>
  );
}
