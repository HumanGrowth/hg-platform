"use client";

import * as React from "react";

import { OrgComparison } from "@/components/admin/OrgComparison";
import { StatCard } from "@/components/ui/stat-card";
import {
  AdoptionCurve,
  DeltaPill,
  InactivityFunnel,
  MonthlyWatchBar,
  OnboardingFunnelChart,
  WidgetCard,
} from "@/components/widgets";
import {
  AccountProgressTable,
  AssessmentOverviewWidget,
  AssignmentComplianceWidget,
  LicenseByOrg,
  ManagerEngagementWidget,
} from "@/components/widgets/OrgInsightWidgets";
import type { WidgetState } from "@/components/widgets/WidgetCard";
import { apiGetOrgInsights, apiGetOrgWidgets } from "@/lib/api";
import { DIMENSIONS_META, dimensionShortName } from "@/lib/dimension-styles";
import type { OrgInsights, OrgMetrics, OrgWidgets } from "@/lib/types";

import { DashboardGrid, type DashboardWidgetDef } from "./DashboardGrid";

interface Loader<T> {
  state: WidgetState;
  data: T | null;
  reload: () => void;
}

/** Carga un endpoint del dashboard con estado de widget (loading/ok/error). */
function useLoader<T>(fetcher: () => Promise<T>): Loader<T> {
  const [state, setState] = React.useState<WidgetState>("loading");
  const [data, setData] = React.useState<T | null>(null);
  const load = React.useCallback(async () => {
    setState("loading");
    try {
      setData(await fetcher());
      setState("ok");
    } catch {
      setState("error");
    }
  }, [fetcher]);
  React.useEffect(() => {
    void load();
  }, [load]);
  return { state, data, reload: () => void load() };
}

interface OrgCtx {
  m: OrgMetrics;
  insights: Loader<OrgInsights>;
  trends: Loader<OrgWidgets>;
}

const PILLAR_CODES = ["P1", "P2", "P3", "P4", "P5", "P6"] as const;
const PILLAR_DOT: Record<string, string> = Object.fromEntries(DIMENSIONS_META.map((p) => [p.id, p.dot]));
const LEVELS = ["L1", "L2", "L3", "L4", "L5", "L6"];

function pct(v: number): string {
  return `${Math.round(v * 100)}%`;
}

/** Widget respaldado por /org/insights. */
function insightCard(
  ctx: OrgCtx,
  title: string,
  description: string,
  body: (d: OrgInsights) => React.ReactNode,
) {
  return (
    <WidgetCard title={title} description={description} state={ctx.insights.state} onRetry={ctx.insights.reload}>
      {ctx.insights.data ? body(ctx.insights.data) : null}
    </WidgetCard>
  );
}

/** Widget respaldado por /org/widgets (tendencias). */
function trendCard(
  ctx: OrgCtx,
  title: string,
  description: string,
  body: (d: OrgWidgets) => React.ReactNode,
) {
  return (
    <WidgetCard title={title} description={description} state={ctx.trends.state} onRetry={ctx.trends.reload}>
      {ctx.trends.data ? body(ctx.trends.data) : null}
    </WidgetCard>
  );
}

/** Orden por defecto = orden de esta lista. Los ids se guardan en las preferencias: no renombrar. */
const WIDGETS: DashboardWidgetDef<OrgCtx>[] = [
  {
    id: "kpi_adoption",
    title: "Adopción",
    span: "kpi",
    render: ({ m }) => (
      <StatCard
        value={pct(m.adoption_rate)}
        label="Adopción"
        info="Porcentaje de personas con licencia que tuvieron actividad (completaron un bloque o iniciaron o terminaron un módulo) en los últimos 21 días. La flecha compara con los 21 días anteriores; subir es mejor."
        sub={`${m.active_licenses}/${m.total_licenses} con actividad ≤21 días`}
        footer={
          <DeltaPill current={m.adoption_rate} previous={m.previous?.adoption_rate} kind="pp" goodWhen="up" />
        }
      />
    ),
  },
  {
    id: "kpi_assigned",
    title: "Avance de lo asignado",
    span: "kpi",
    render: ({ m }) =>
      m.assigned_completion_rate !== null ? (
        <StatCard
          value={pct(m.assigned_completion_rate)}
          label="Avance de lo asignado"
          info="Módulos asignados que ya fueron completados ÷ total de módulos asignados a las personas del alcance. Mide cumplimiento de lo que RRHH asignó, no de lo que la gente decidió empezar."
          sub={`${m.assigned_completed}/${m.assigned_total} módulos asignados completados`}
        />
      ) : (
        <StatCard
          value={pct(m.completion_rate_global)}
          label="Completion"
          info="Como todavía no hay módulos asignados, se muestra unidades terminadas ÷ unidades iniciadas por las personas. En cuanto asignes contenido, esta tarjeta pasa a medir el avance de lo asignado."
          sub="Sin módulos asignados: terminados ÷ iniciados"
        />
      ),
  },
  {
    id: "kpi_inactive",
    title: "Inactivos",
    span: "kpi",
    render: ({ m }) => (
      <StatCard
        value={String(m.inactive_users_count)}
        label="Inactivos"
        info="Personas sin actividad hace más de 21 días o que nunca entraron. Es el complemento de Adopción (activos + inactivos = total). La flecha compara con los 21 días anteriores; bajar es mejor."
        sub=">21 días sin actividad o nunca entraron"
        footer={
          <DeltaPill
            current={m.inactive_users_count}
            previous={m.previous?.inactive_users_count}
            kind="count"
            goodWhen="down"
          />
        }
      />
    ),
  },
  {
    id: "kpi_licenses",
    title: "Licencias",
    span: "kpi",
    available: ({ m }) => m.licenses !== null && m.licenses !== undefined,
    render: ({ m }) => {
      const l = m.licenses!;
      return (
        <StatCard
          value={l.total > 0 ? `${l.used}/${l.total}` : String(l.used)}
          label={l.scope === "org" ? "Cupo de la organización" : "Licencias en uso"}
          info={
            l.scope === "org"
              ? "Usuarios activos de esta organización contra el cupo de licencias que se le asignó. Las invitaciones pendientes aún no ocupan licencia."
              : "Usuarios activos de la empresa contra el total de licencias contratadas. Las invitaciones pendientes aún no ocupan licencia."
          }
          sub={l.total > 0 ? `${l.pending_invites} invitaciones pendientes` : "Sin cupo definido"}
        />
      );
    },
  },
  {
    id: "activity_distribution",
    title: "Distribución de actividad",
    span: "full",
    render: ({ m }) => (
      <WidgetCard
        title="Distribución de actividad"
        description="Cuántas personas fueron activas hace poco y cuántas llevan tiempo sin actividad. Hasta 21 días cuentan como activas (verdes); desde 22 días, inactivas."
      >
        <InactivityFunnel buckets={m.inactivity} total={m.total_licenses} />
      </WidgetCard>
    ),
  },
  {
    id: "accounts",
    title: "Progreso de cuentas",
    span: "full",
    render: (ctx) =>
      insightCard(
        ctx,
        `Progreso de cuentas${ctx.insights.data ? ` (${ctx.insights.data.accounts.length})` : ""}`,
        "Todas las cuentas del alcance: último ingreso a la plataforma y módulos asignados que ya completó cada persona. Filtra por organización, manager o busca por nombre.",
        (d) => <AccountProgressTable accounts={d.accounts} />,
      ),
  },
  {
    id: "assignments",
    title: "Cumplimiento de asignaciones",
    span: "full",
    render: (ctx) =>
      insightCard(
        ctx,
        "Cumplimiento de asignaciones",
        "Estado de los módulos asignados a personas: cumplidos, en curso, por vencer (≤7 días) y vencidos. Elige una organización para ver sus métricas.",
        (d) => <AssignmentComplianceWidget data={d.assignments} />,
      ),
  },
  {
    id: "managers",
    title: "Seguimiento de managers",
    span: "full",
    render: (ctx) =>
      insightCard(
        ctx,
        "Seguimiento de managers",
        "Qué tan enganchado está cada manager con su equipo en los últimos 21 días: cuántos de sus reportes consultó (Revisó), cuántos módulos asignó y cuántos de su equipo estuvieron activos. Con seguimiento = revisó o asignó al menos una vez.",
        (d) => <ManagerEngagementWidget data={d.managers} />,
      ),
  },
  {
    id: "assessment",
    title: "Assessment por dimensión",
    span: "full",
    render: (ctx) =>
      insightCard(
        ctx,
        "Assessment por dimensión",
        "Cómo se distribuyen los estados del assessment en la organización. Grupos de 5 o más personas; nunca se muestran respuestas individuales.",
        (d) => <AssessmentOverviewWidget data={d.assessment} />,
      ),
  },
  {
    id: "org_comparison",
    title: "Comparativa por organización",
    span: "full",
    available: ({ m }) => m.by_org.length > 0,
    render: ({ m }) => (
      <WidgetCard
        title="Comparativa por organización"
        description="Adopción y módulos asignados completados en cada organización de la empresa."
      >
        <OrgComparison orgs={m.by_org} />
      </WidgetCard>
    ),
  },
  {
    id: "license_by_org",
    title: "Uso de licencias por organización",
    span: "full",
    available: ({ m }) => (m.licenses?.by_org.length ?? 0) > 0,
    render: ({ m }) => (
      <WidgetCard
        title="Uso de licencias por organización"
        description="Usuarios activos contra el cupo asignado a cada organización. En rojo si lo superan."
      >
        <LicenseByOrg orgs={m.licenses!.by_org} />
      </WidgetCard>
    ),
  },
  {
    id: "adoption_curve",
    title: "Curva de adopción",
    span: "third",
    render: (ctx) =>
      trendCard(ctx, "Curva de adopción", "Usuarios activos por mes, últimos 12 meses.", (d) => (
        <AdoptionCurve data={d.adoption_curve} />
      )),
  },
  {
    id: "onboarding_funnel",
    title: "Funnel de onboarding",
    span: "third",
    render: (ctx) =>
      trendCard(ctx, "Funnel de onboarding", "De invitados a primera completion.", (d) => (
        <OnboardingFunnelChart funnel={d.onboarding_funnel} />
      )),
  },
  {
    id: "monthly_watch",
    title: "Actividad por mes",
    span: "third",
    render: (ctx) =>
      trendCard(ctx, "Actividad por mes", "Bloques completados por la org, últimos 12 meses.", (d) => (
        <MonthlyWatchBar data={d.monthly_watch} />
      )),
  },
  {
    id: "completion_dimension",
    title: "Completion por dimensión",
    span: "full",
    render: ({ m }) => (
      <WidgetCard
        title="Completion por dimensión"
        description="Módulos terminados ÷ iniciados en cada dimensión."
      >
        <div className="flex flex-col gap-3">
          {PILLAR_CODES.map((code) => {
            const rate = m.by_dimension[code]?.completion_rate ?? 0;
            return (
              <div key={code} className="flex items-center gap-3">
                <span className="w-24 shrink-0 text-xs text-fg-muted">{dimensionShortName(code)}</span>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-bg-sunken">
                  <div className={`h-full rounded-full ${PILLAR_DOT[code]}`} style={{ width: pct(rate) }} />
                </div>
                <span className="w-10 text-right font-mono text-xs text-fg-muted">{pct(rate)}</span>
              </div>
            );
          })}
        </div>
      </WidgetCard>
    ),
  },
  {
    id: "level_distribution",
    title: "Distribución por nivel",
    span: "half",
    render: ({ m }) => {
      const max = Math.max(1, ...LEVELS.map((l) => m.by_career_level[l] ?? 0));
      return (
        <WidgetCard title="Distribución por nivel" description="Personas por nivel de carrera (L1 a L6).">
          <div className="flex flex-col gap-2">
            {LEVELS.map((l) => {
              const count = m.by_career_level[l] ?? 0;
              return (
                <div key={l} className="flex items-center gap-3">
                  <span className="w-6 font-mono text-xs text-fg-subtle">{l}</span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-bg-sunken">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${(count / max) * 100}%` }} />
                  </div>
                  <span className="w-8 text-right font-mono text-xs text-fg-muted">{count}</span>
                </div>
              );
            })}
          </div>
        </WidgetCard>
      );
    },
  },
  {
    id: "top_performers",
    title: "Top performers",
    span: "half",
    render: ({ m }) => (
      <WidgetCard title="Top performers" description="Las 5 personas con más módulos completados.">
        {m.top_performers.length === 0 ? (
          <p className="text-sm text-fg-muted">Sin actividad suficiente todavía.</p>
        ) : (
          <ol className="flex flex-col gap-2">
            {m.top_performers.map((tp, i) => (
              <li key={tp.user_id} className="flex items-center gap-3 text-sm">
                <span className="font-mono text-xs text-fg-subtle">{i + 1}.</span>
                <span className="flex-1 text-fg">{tp.full_name}</span>
                <span className="font-mono text-xs text-fg-muted">{tp.courses_completed}</span>
              </li>
            ))}
          </ol>
        )}
      </WidgetCard>
    ),
  },
];

/** Dashboard RRHH: widgets ordenables y ocultables por cada administrador. */
export function OrgDashboard({
  m,
  orgId,
  companyId,
}: {
  m: OrgMetrics;
  orgId?: string;
  companyId?: string;
}) {
  const insights = useLoader(React.useCallback(() => apiGetOrgInsights(orgId, companyId), [orgId, companyId]));
  const trends = useLoader(React.useCallback(() => apiGetOrgWidgets(orgId, companyId), [orgId, companyId]));
  const ctx = React.useMemo<OrgCtx>(() => ({ m, insights, trends }), [m, insights, trends]);
  return <DashboardGrid dashboard="org" widgets={WIDGETS} ctx={ctx} />;
}
