"use client";

/**
 * Empresa (billing/licencias) — pantalla del company_admin. Muestra la Empresa
 * (entidad de contrato + pool de licencias, CE-06) separada del Dashboard de
 * datos (/admin/org) y de la gestión de miembros (/admin/empresa/miembros).
 * Lee GET /company (apiGetMyCompany).
 */
import * as React from "react";

import { CompanyAdminGate } from "@/components/CompanyAdminGate";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Display } from "@/components/ui/display";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Progress } from "@/components/ui/progress";
import { useScopedCompanyId } from "@/lib/acting-company";
import { apiGetMyCompany } from "@/lib/api";
import type { Company } from "@/lib/types";

const TIER_LABEL: Record<string, string> = { A: "Plan A", B: "Plan B", C: "Plan C" };

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <div className="text-2xl font-semibold tabular-nums text-fg">{value}</div>
      <div className="text-xs text-fg-muted">{label}</div>
    </div>
  );
}

function EmpresaContent() {
  const { companyId, ready } = useScopedCompanyId();
  const [company, setCompany] = React.useState<Company | null>(null);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    if (!ready) return;
    apiGetMyCompany(companyId)
      .then(setCompany)
      .catch(() => setError(true));
  }, [companyId, ready]);

  if (!ready) return null; // superadmin sin empresa elegida → el hook redirige al selector.
  if (error) {
    return <p className="px-6 py-12 text-sm text-fg-muted">No se pudo cargar la empresa.</p>;
  }
  if (!company) {
    return <p className="px-6 py-12 text-sm text-fg-muted">Cargando…</p>;
  }

  const available = Math.max(company.licenses_total - company.licenses_used, 0);
  const pct =
    company.licenses_total > 0
      ? Math.round((company.licenses_used / company.licenses_total) * 100)
      : 0;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-8">
      <div>
        <Eyebrow accent>Empresa</Eyebrow>
        <Display className="mt-1">{company.name}</Display>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge>{TIER_LABEL[company.tier] ?? company.tier}</Badge>
          <Badge variant={company.billing_status === "active" ? "success" : "default"}>
            {company.billing_status}
          </Badge>
          {!company.is_active ? <Badge variant="default">inactiva</Badge> : null}
        </div>
      </div>

      <Card className="flex flex-col gap-4 bg-bg-raised">
        <div className="flex items-baseline justify-between">
          <span className="font-sans text-sm font-semibold text-fg">Licencias</span>
          <span className="text-sm tabular-nums text-fg-muted">
            {company.licenses_used} / {company.licenses_total} usadas
          </span>
        </div>
        <Progress value={pct} label={`Licencias usadas: ${pct}%`} />
        <div className="grid grid-cols-3 gap-4 text-center">
          <Stat value={company.licenses_used} label="Usadas" />
          <Stat value={available} label="Disponibles" />
          <Stat value={company.org_count} label="Organizaciones" />
        </div>
        <p className="text-xs text-fg-subtle">
          El pool de licencias pertenece a la Empresa y se cuenta por usuarios activos de todas sus
          organizaciones (CE-06).
        </p>
      </Card>
    </div>
  );
}

export default function EmpresaPage() {
  return (
    <CompanyAdminGate>
      <EmpresaContent />
    </CompanyAdminGate>
  );
}
