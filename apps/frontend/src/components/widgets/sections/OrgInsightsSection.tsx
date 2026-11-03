"use client";

import * as React from "react";

import { Eyebrow } from "@/components/ui/eyebrow";
import {
  AccountProgressTable,
  AssessmentOverviewWidget,
  AssignmentComplianceWidget,
  ManagerEngagementWidget,
  StalledWidget,
} from "@/components/widgets/OrgInsightWidgets";
import { WidgetCard } from "@/components/widgets/WidgetCard";
import type { WidgetState } from "@/components/widgets/WidgetCard";
import { apiGetOrgInsights } from "@/lib/api";
import type { OrgInsights } from "@/lib/types";

/** Insights accionables de RRHH (v2): seguimiento, cumplimiento, assessment, etc. */
export default function OrgInsightsSection({
  orgId,
  companyId,
}: {
  orgId?: string;
  companyId?: string;
}) {
  const [state, setState] = React.useState<WidgetState>("loading");
  const [data, setData] = React.useState<OrgInsights | null>(null);

  const load = React.useCallback(async () => {
    setState("loading");
    try {
      setData(await apiGetOrgInsights(orgId, companyId));
      setState("ok");
    } catch {
      setState("error");
    }
  }, [orgId, companyId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <section className="mt-10">
        <Eyebrow className="mb-3">Seguimiento</Eyebrow>
        <WidgetCard
          title={`Progreso de cuentas${data ? ` (${data.accounts.length})` : ""}`}
          description="Todas las cuentas del alcance: último ingreso a la plataforma y módulos asignados que ya completó cada persona. Filtra por organización, manager o busca por nombre."
          state={state}
          onRetry={load}
        >
          {data ? <AccountProgressTable accounts={data.accounts} /> : null}
        </WidgetCard>
      </section>

      <section className="mt-6">
        <WidgetCard
          title="Cumplimiento de asignaciones"
          description="Estado de los módulos asignados a personas: cumplidos, en curso, por vencer (≤7 días) y vencidos. Elige una organización para ver sus métricas."
          state={state}
          onRetry={load}
        >
          {data ? <AssignmentComplianceWidget data={data.assignments} /> : null}
        </WidgetCard>
      </section>

      <section className="mt-6">
        <WidgetCard
          title="Seguimiento de managers"
          description="Qué tan enganchado está cada manager con su equipo en los últimos 21 días: cuántos de sus reportes consultó (Revisó), cuántos módulos asignó y cuántos de su equipo estuvieron activos. Con seguimiento = revisó o asignó al menos una vez."
          state={state}
          onRetry={load}
        >
          {data ? <ManagerEngagementWidget data={data.managers} /> : null}
        </WidgetCard>
      </section>

      <section className="mt-10">
        <Eyebrow className="mb-3">Necesidades</Eyebrow>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <WidgetCard
            title="Assessment por dimensión"
            description="Cómo se distribuyen los estados del assessment en la organización. Grupos de 5 o más personas; nunca se muestran respuestas individuales."
            state={state}
            onRetry={load}
            className="lg:col-span-2"
          >
            {data ? <AssessmentOverviewWidget data={data.assessment} /> : null}
          </WidgetCard>
          <WidgetCard
            title="Módulos estancados"
            description="Módulos iniciados, sin completar y sin avance en los últimos 14 días, por dimensión."
            state={state}
            onRetry={load}
          >
            {data ? <StalledWidget data={data.stalled} /> : null}
          </WidgetCard>
        </div>
      </section>
    </>
  );
}
