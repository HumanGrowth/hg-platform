"use client";

import * as React from "react";

import { Eyebrow } from "@/components/ui/eyebrow";
import {
  AdoptionCurve,
  MonthlyWatchBar,
  OnboardingFunnelChart,
  WidgetCard,
} from "@/components/widgets";
import type { WidgetState } from "@/components/widgets/WidgetCard";
import { apiGetOrgWidgets } from "@/lib/api";
import type { OrgWidgets } from "@/lib/types";

export default function OrgWidgetsSection({ orgId }: { orgId?: string }) {
  const [state, setState] = React.useState<WidgetState>("loading");
  const [data, setData] = React.useState<OrgWidgets | null>(null);

  const load = React.useCallback(async () => {
    setState("loading");
    try {
      setData(await apiGetOrgWidgets(orgId));
      setState("ok");
    } catch {
      setState("error");
    }
  }, [orgId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="mt-10">
      <Eyebrow className="mb-3">Tendencias</Eyebrow>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <WidgetCard
          title="Curva de adopción"
          description="Usuarios activos por mes, últimos 12 meses."
          state={state}
          onRetry={load}
        >
          {data ? <AdoptionCurve data={data.adoption_curve} /> : null}
        </WidgetCard>
        <WidgetCard
          title="Funnel de onboarding"
          description="De invitados a primera completion."
          state={state}
          onRetry={load}
        >
          {data ? <OnboardingFunnelChart funnel={data.onboarding_funnel} /> : null}
        </WidgetCard>
        <WidgetCard
          title="Tiempo invertido por mes"
          description="Horas totales de la org, últimos 12 meses."
          state={state}
          onRetry={load}
        >
          {data ? <MonthlyWatchBar data={data.monthly_watch} /> : null}
        </WidgetCard>
      </div>
    </section>
  );
}
