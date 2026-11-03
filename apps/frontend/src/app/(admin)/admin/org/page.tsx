"use client";

import { Download } from "lucide-react";
import * as React from "react";

import { OrgAdminGate } from "@/components/OrgAdminGate";
import { OrgComparison } from "@/components/admin/OrgComparison";
import { DeltaPill } from "@/components/widgets/DeltaPill";
import { InactivityFunnel } from "@/components/widgets/InactivityFunnel";
import { LicenseByOrg } from "@/components/widgets/OrgInsightWidgets";
import { WidgetCard } from "@/components/widgets/WidgetCard";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";

const OrgWidgetsSection = React.lazy(
  () => import("@/components/widgets/sections/OrgWidgetsSection"),
);

const OrgInsightsSection = React.lazy(
  () => import("@/components/widgets/sections/OrgInsightsSection"),
);

function OrgWidgetsSkeleton() {
  return (
    <div className="mt-10 grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="h-56 animate-pulse rounded-lg bg-bg-sunken" />
      <div className="h-56 animate-pulse rounded-lg bg-bg-sunken" />
      <div className="h-56 animate-pulse rounded-lg bg-bg-sunken" />
    </div>
  );
}
import { Display } from "@/components/ui/display";
import { Eyebrow } from "@/components/ui/eyebrow";
import { useActingOrg } from "@/lib/acting-org";
import { useActingCompany } from "@/lib/acting-company";
import { apiExportOrgUsersCsv, apiGetOrgMetrics } from "@/lib/api";
import { DIMENSIONS_META, dimensionShortName } from "@/lib/dimension-styles";
import { toast } from "@/lib/toast-store";
import type { OrgMetrics } from "@/lib/types";

const PILLAR_CODES = ["P1", "P2", "P3", "P4", "P5", "P6"] as const;
const PILLAR_DOT: Record<string, string> = Object.fromEntries(DIMENSIONS_META.map((p) => [p.id, p.dot]));
const LEVELS = ["L1", "L2", "L3", "L4", "L5", "L6"];

function pct(v: number): string {
  return `${Math.round(v * 100)}%`;
}

const Kpi = StatCard;

function OrgDashboardContent() {
  // Drill-down a una org (acting-org) tiene prioridad; si no, el superadmin
  // scopea a la empresa que gestiona (acting-company). El admin no setea ninguno
  // → el backend agrega toda su empresa por defecto.
  const actingOrg = useActingOrg();
  const actingCompany = useActingCompany();
  const orgId = actingOrg?.id;
  const companyId = actingCompany?.id;
  const [status, setStatus] = React.useState<"loading" | "error" | "ok">("loading");
  const [m, setM] = React.useState<OrgMetrics | null>(null);
  const [downloading, setDownloading] = React.useState(false);

  const load = React.useCallback(async () => {
    setStatus("loading");
    try {
      setM(await apiGetOrgMetrics(orgId, companyId));
      setStatus("ok");
    } catch {
      setStatus("error");
    }
  }, [orgId, companyId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function downloadCsv() {
    setDownloading(true);
    try {
      await apiExportOrgUsersCsv(orgId, companyId);
    } catch {
      toast("No se pudo descargar el CSV", "danger");
    } finally {
      setDownloading(false);
    }
  }

  const maxLevel = m ? Math.max(1, ...LEVELS.map((l) => m.by_career_level[l] ?? 0)) : 1;

  return (
    <main className="mx-auto w-full max-w-app px-6 py-10">
      <Eyebrow accent>Panel RRHH</Eyebrow>
      <Display variant="display-2" className="mt-2">
        Adopción y progreso
      </Display>
      <p className="mt-3 text-md text-fg-muted">
        Métricas en vivo. «Activo» = con actividad en los últimos 21 días; el resto está inactivo.
      </p>

      {status === "loading" && (
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-lg bg-bg-sunken" />
          ))}
        </div>
      )}

      {status === "error" && (
        <Card className="mt-8 flex flex-col items-center gap-3 py-16 text-center">
          <p className="font-sans text-md font-semibold text-fg">No pudimos cargar las métricas.</p>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-md bg-primary px-5 py-2 font-sans text-sm font-semibold text-white hover:bg-primary-hover"
          >
            Reintentar
          </button>
        </Card>
      )}

      {status === "ok" && m && (
        <>
          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
            <Kpi
              value={pct(m.adoption_rate)}
              label="Adopción"
              info="Porcentaje de personas con licencia que tuvieron actividad (completaron un bloque o iniciaron o terminaron un módulo) en los últimos 21 días. La flecha compara con los 21 días anteriores; subir es mejor."
              sub={`${m.active_licenses}/${m.total_licenses} con actividad ≤21 días`}
              footer={
                <DeltaPill
                  current={m.adoption_rate}
                  previous={m.previous?.adoption_rate}
                  kind="pp"
                  goodWhen="up"
                />
              }
            />
            {m.assigned_completion_rate !== null ? (
              <Kpi
                value={pct(m.assigned_completion_rate)}
                label="Avance de lo asignado"
                info="Módulos asignados que ya fueron completados ÷ total de módulos asignados a las personas del alcance. Mide cumplimiento de lo que RRHH asignó, no de lo que la gente decidió empezar."
                sub={`${m.assigned_completed}/${m.assigned_total} módulos asignados completados`}
              />
            ) : (
              <Kpi
                value={pct(m.completion_rate_global)}
                label="Completion"
                info="Como todavía no hay módulos asignados, se muestra unidades terminadas ÷ unidades iniciadas por las personas. En cuanto asignes contenido, esta tarjeta pasa a medir el avance de lo asignado."
                sub="Sin módulos asignados: terminados ÷ iniciados"
              />
            )}
            <Kpi
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
            {m.licenses && (
              <Kpi
                value={m.licenses.total > 0 ? `${m.licenses.used}/${m.licenses.total}` : String(m.licenses.used)}
                label={m.licenses.scope === "org" ? "Cupo de la organización" : "Licencias en uso"}
                info={
                  m.licenses.scope === "org"
                    ? "Usuarios activos de esta organización contra el cupo de licencias que se le asignó. Las invitaciones pendientes aún no ocupan licencia."
                    : "Usuarios activos de la empresa contra el total de licencias contratadas. Las invitaciones pendientes aún no ocupan licencia."
                }
                sub={
                  m.licenses.total > 0
                    ? `${m.licenses.pending_invites} invitaciones pendientes`
                    : "Sin cupo definido"
                }
              />
            )}
          </div>

          {/* Distribución de actividad (ventana de 21d: lo verde sigue activo). */}
          <section className="mt-10">
            <Eyebrow className="mb-3">Distribución de actividad</Eyebrow>
            <div className="glass-surface-strong rounded-lg border border-border bg-bg-raised p-5">
              <InactivityFunnel buckets={m.inactivity} total={m.total_licenses} />
              <p className="mt-2 text-xs text-fg-muted">
                Activos = hasta 21 días (verdes). Desde 22 días cuentan como inactivos.
              </p>
            </div>
          </section>

          {/* Seguimiento accionable, cumplimiento, assessment, consentimiento, etc. */}
          <React.Suspense fallback={<OrgWidgetsSkeleton />}>
            <OrgInsightsSection orgId={orgId} companyId={companyId} />
          </React.Suspense>

          {/* Comparativa por organización (solo empresas con varias orgs). */}
          {m.by_org.length > 0 && (
            <section className="mt-10">
              <Eyebrow className="mb-3">Comparativa por organización</Eyebrow>
              <OrgComparison orgs={m.by_org} />
            </section>
          )}

          {m.licenses && m.licenses.by_org.length > 0 && (
            <section className="mt-10">
              <WidgetCard
                title="Uso de licencias por organización"
                description="Usuarios activos contra el cupo asignado a cada organización. En rojo si lo superan."
              >
                <LicenseByOrg orgs={m.licenses.by_org} />
              </WidgetCard>
            </section>
          )}

          {/* Tendencias — widgets lazy-loaded */}
          <React.Suspense fallback={<OrgWidgetsSkeleton />}>
            <OrgWidgetsSection orgId={orgId} companyId={companyId} />
          </React.Suspense>

          <section className="mt-10">
            <Eyebrow className="mb-3">Completion por dimensión</Eyebrow>
            <div className="flex flex-col gap-3 glass-surface-strong rounded-lg border border-border bg-bg-raised p-5">
              {PILLAR_CODES.map((code) => {
                const pm = m.by_dimension[code];
                const rate = pm?.completion_rate ?? 0;
                return (
                  <div key={code} className="flex items-center gap-3">
                    <span className="w-24 shrink-0 text-xs text-fg-muted">
                      {dimensionShortName(code)}
                    </span>
                    <div className="h-3 flex-1 overflow-hidden rounded-full bg-bg-sunken">
                      <div className={`h-full rounded-full ${PILLAR_DOT[code]}`} style={{ width: pct(rate) }} />
                    </div>
                    <span className="w-10 text-right font-mono text-xs text-fg-muted">{pct(rate)}</span>
                  </div>
                );
              })}
            </div>
          </section>

          <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section>
              <Eyebrow className="mb-3">Distribución por nivel</Eyebrow>
              <div className="flex flex-col gap-2 glass-surface-strong rounded-lg border border-border bg-bg-raised p-5">
                {LEVELS.map((l) => {
                  const count = m.by_career_level[l] ?? 0;
                  return (
                    <div key={l} className="flex items-center gap-3">
                      <span className="w-6 font-mono text-xs text-fg-subtle">{l}</span>
                      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-bg-sunken">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${(count / maxLevel) * 100}%` }} />
                      </div>
                      <span className="w-8 text-right font-mono text-xs text-fg-muted">{count}</span>
                    </div>
                  );
                })}
              </div>
            </section>

            <section>
              <Eyebrow className="mb-3">Top performers</Eyebrow>
              <div className="glass-surface-strong rounded-lg border border-border bg-bg-raised p-5">
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
              </div>
            </section>
          </div>

          <div className="mt-10">
            <button
              type="button"
              onClick={() => void downloadCsv()}
              disabled={downloading}
              className="inline-flex items-center gap-2 rounded-md bg-hg-ink px-5 py-2.5 font-sans text-sm font-semibold text-hg-white hover:opacity-90 disabled:opacity-50"
            >
              <Download size={16} strokeWidth={1.75} />
              {downloading ? "Descargando…" : "Descargar progreso completo (CSV)"}
            </button>
          </div>
        </>
      )}
    </main>
  );
}

export default function OrgDashboardPage() {
  return (
    <OrgAdminGate>
      <OrgDashboardContent />
    </OrgAdminGate>
  );
}
