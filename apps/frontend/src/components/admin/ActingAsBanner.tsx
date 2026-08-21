"use client";

import { useRouter } from "next/navigation";

import { clearActingOrg, useActingOrg } from "@/lib/acting-org";
import { clearActingCompany, useActingCompany } from "@/lib/acting-company";

/**
 * Banner sticky cuando un superadmin está "actuando como" otra entidad:
 * - Empresa (Fase 1): gestiona todo /admin/empresa/* como esa empresa.
 * - Org (legado AC-01): inspecciona el dashboard RRHH de una org.
 * La empresa tiene prioridad (es el contexto de gestión principal).
 */
export function ActingAsBanner() {
  const router = useRouter();
  const company = useActingCompany();
  const org = useActingOrg();

  if (company) {
    return (
      <div className="sticky top-0 z-50 flex items-center justify-between gap-3 bg-warning-bg px-4 py-2 text-sm text-warning">
        <span>
          Gestionando la empresa <strong>{company.name}</strong> (no es tu org real).
        </span>
        <button
          type="button"
          onClick={() => {
            clearActingCompany();
            router.push("/admin/companies");
          }}
          className="rounded-md border border-warning/40 px-3 py-1 font-semibold hover:bg-warning/10"
        >
          Salir
        </button>
      </div>
    );
  }

  if (org) {
    return (
      <div className="sticky top-0 z-50 flex items-center justify-between gap-3 bg-warning-bg px-4 py-2 text-sm text-warning">
        <span>
          Viendo como <strong>{org.name}</strong> (no es tu org real).
        </span>
        <button
          type="button"
          onClick={() => {
            clearActingOrg();
            router.push("/admin/orgs");
          }}
          className="rounded-md border border-warning/40 px-3 py-1 font-semibold hover:bg-warning/10"
        >
          Volver a HG
        </button>
      </div>
    );
  }

  return null;
}
