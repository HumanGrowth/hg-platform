"use client";

import { Download } from "lucide-react";
import * as React from "react";

import { OrgAdminGate } from "@/components/OrgAdminGate";
import { OrgDashboard } from "@/components/admin/dashboard/OrgDashboard";
import { Card } from "@/components/ui/card";
import { Display } from "@/components/ui/display";
import { Eyebrow } from "@/components/ui/eyebrow";
import { useActingOrg } from "@/lib/acting-org";
import { useActingCompany } from "@/lib/acting-company";
import { apiExportOrgUsersCsv, apiGetOrgMetrics } from "@/lib/api";
import { toast } from "@/lib/toast-store";
import type { OrgMetrics } from "@/lib/types";

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
          <div className="mt-8">
            <OrgDashboard m={m} orgId={orgId} companyId={companyId} />
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
