"use client";

import { Trash2 } from "lucide-react";
import * as React from "react";

import { ModuleBlockAssignFields } from "@/components/admin/ModuleBlockAssignFields";
import { Dialog } from "@/components/ui/dialog";
import {
  apiAssignModulesToOrg,
  apiErrorMessage,
  apiListOrgModules,
  apiRemoveOrgModule,
} from "@/lib/api";
import { toast } from "@/lib/toast-store";
import type { OrgModule } from "@/lib/types";

/**
 * Módulos de una organización. Lo que se asigna acá lo reciben los miembros
 * actuales y, automáticamente, todo miembro que se sume a la org. Quitar un
 * módulo solo afecta a quienes entren después (no borra lo ya asignado).
 */
export function OrgModulesDialog({
  open,
  onClose,
  orgId,
  orgName,
  companyId,
  onChanged,
}: {
  open: boolean;
  onClose: () => void;
  orgId: string;
  orgName: string;
  companyId?: string;
  onChanged?: () => void;
}) {
  const [modules, setModules] = React.useState<OrgModule[] | null>(null);

  const load = React.useCallback(() => {
    apiListOrgModules(orgId, companyId)
      .then(setModules)
      .catch(() => setModules([]));
  }, [orgId, companyId]);

  React.useEffect(() => {
    if (open) {
      setModules(null);
      load();
    }
  }, [open, load]);

  async function remove(unitId: string) {
    try {
      await apiRemoveOrgModule(orgId, unitId, companyId);
      toast("Módulo quitado de la organización.", "success");
      load();
      onChanged?.();
    } catch (err) {
      toast(apiErrorMessage(err, "No se pudo quitar el módulo."), "danger");
    }
  }

  const assignedIds = React.useMemo(
    () => new Set((modules ?? []).map((m) => m.learning_unit_id)),
    [modules],
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Módulos de ${orgName}`}
      description="Los reciben los miembros actuales y todo miembro que se sume a esta organización."
    >
      <div className="flex flex-col gap-5">
        <div>
          <p className="mb-2 font-sans text-xs font-semibold uppercase tracking-meta text-fg-muted">
            Asignados a la organización
          </p>
          {modules === null ? (
            <p className="text-sm text-fg-muted">Cargando…</p>
          ) : modules.length === 0 ? (
            <p className="text-sm text-fg-muted">Todavía no hay módulos asignados.</p>
          ) : (
            <ul className="flex max-h-40 flex-col gap-1 overflow-y-auto">
              {modules.map((m) => (
                <li
                  key={m.learning_unit_id}
                  className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
                >
                  <span className="min-w-0 truncate text-sm text-fg">{m.unit_title}</span>
                  <button
                    type="button"
                    aria-label={`Quitar ${m.unit_title}`}
                    onClick={() => void remove(m.learning_unit_id)}
                    className="rounded-md p-1.5 text-fg-muted hover:bg-bg-sunken hover:text-danger"
                  >
                    <Trash2 size={16} strokeWidth={1.75} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <ModuleBlockAssignFields
          userId={orgId}
          userName={orgName}
          alreadyAssignedIds={assignedIds}
          assign={(unitIds, dueIso, note) => apiAssignModulesToOrg(orgId, unitIds, dueIso, note, companyId)}
          onAssigned={() => {
            load();
            onChanged?.();
          }}
          onCancel={onClose}
        />
      </div>
    </Dialog>
  );
}
