"use client";

import { Download } from "lucide-react";
import * as React from "react";

import { OrgAdminGate } from "@/components/OrgAdminGate";
import { Card } from "@/components/ui/card";

const OrgWidgetsSection = React.lazy(
  () => import("@/components/widgets/sections/OrgWidgetsSection"),
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
import { apiExportOrgUsersCsv, apiGetOrgMetrics } from "@/lib/api";
import { PILLARS, pillarShortName } from "@/lib/pillars";
import { toast } from "@/lib/toast-store";
import type { OrgMetrics } from "@/lib/types";

const PILLAR_CODES = ["P1", "P2", "P3", "P4", "P5", "P6"] as const;
const PILLAR_DOT: Record<string, string> = Object.fromEntries(PILLARS.map((p) => [p.id, p.dot]));
const LEVELS = ["L1", "L2", "L3", "L4", "L5", "L6"];

function pct(v: number): string {
  return `${Math.round(v * 100)}%`;
}

function Kpi({ value, label, sub }: { value: string; label: string; sub: string }) {
  return (
    <Card className="flex flex-col gap-1 bg-bg-raised">
      <span className="font-display text-4xl text-fg">{value}</span>
      <span className="font-sans text-sm font-semibold text-fg">{label}</span>
      <span className="text-xs text-fg-muted">{sub}</span>
    </Card>
  );
}

function OrgDashboardContent() {
  const acting = useActingOrg();
  const orgId = acting?.id;
  const [status, setStatus] = React.useState<"loading" | "error" | "ok">("loading");
  const [m, setM] = React.useState<OrgMetrics | null>(null);
  const [downloading, setDownloading] = React.useState(false);

  const load = React.useCallback(async () => {
    setStatus("loading");
    try {
      setM(await apiGetOrgMetrics(orgId));
      setStatus("ok");
    } catch {
      setStatus("error");
    }
  }, [orgId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function downloadCsv() {
    setDownloading(true);
    try {
      await apiExportOrgUsersCsv(orgId);
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
      <p className="mt-3 text-md text-fg-muted">Métricas en vivo de toda la organización.</p>

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
            className="rounded-md bg-orange px-5 py-2 font-sans text-sm font-semibold text-white hover:bg-orange-600"
          >
            Reintentar
          </button>
        </Card>
      )}

      {status === "ok" && m && (
        <>
          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
            <Kpi value={pct(m.adoption_rate)} label="Adopción" sub={`${m.active_licenses}/${m.total_licenses} activos`} />
            <Kpi value={pct(m.completion_rate_global)} label="Completion" sub={`${m.total_courses_completed} completados`} />
            <Kpi value={String(m.active_licenses)} label="Activos" sub="últimos 30 días" />
            <Kpi value={String(m.inactive_users_count)} label="Inactivos" sub=">7 días sin actividad" />
          </div>

          {/* Tendencias — widgets lazy-loaded */}
          <React.Suspense fallback={<OrgWidgetsSkeleton />}>
            <OrgWidgetsSection orgId={orgId} />
          </React.Suspense>

          <section className="mt-10">
            <Eyebrow className="mb-3">Completion por pilar</Eyebrow>
            <div className="flex flex-col gap-3 rounded-lg border border-border bg-bg-raised p-5">
              {PILLAR_CODES.map((code) => {
                const pm = m.by_pillar[code];
                const rate = pm?.completion_rate ?? 0;
                return (
                  <div key={code} className="flex items-center gap-3">
                    <span className="w-24 shrink-0 text-xs text-fg-muted">
                      {pillarShortName(code)}
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
              <div className="flex flex-col gap-2 rounded-lg border border-border bg-bg-raised p-5">
                {LEVELS.map((l) => {
                  const count = m.by_career_level[l] ?? 0;
                  return (
                    <div key={l} className="flex items-center gap-3">
                      <span className="w-6 font-mono text-xs text-fg-subtle">{l}</span>
                      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-bg-sunken">
                        <div className="h-full rounded-full bg-orange" style={{ width: `${(count / maxLevel) * 100}%` }} />
                      </div>
                      <span className="w-8 text-right font-mono text-xs text-fg-muted">{count}</span>
                    </div>
                  );
                })}
              </div>
            </section>

            <section>
              <Eyebrow className="mb-3">Top performers</Eyebrow>
              <div className="rounded-lg border border-border bg-bg-raised p-5">
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
              className="inline-flex items-center gap-2 rounded-md bg-ink-900 px-5 py-2.5 font-sans text-sm font-semibold text-cream-50 hover:opacity-90 disabled:opacity-50"
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
