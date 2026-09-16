"use client";

import { Check } from "lucide-react";
import * as React from "react";

import { ModuleBlockAssignFields } from "@/components/admin/ModuleBlockAssignFields";
import { Dialog } from "@/components/ui/dialog";
import { apiAssignCustomPathToUser, apiListAvailableCustomPaths } from "@/lib/api";
import { toast } from "@/lib/toast-store";
import type { UserCustomPath } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  alreadyAssignedUnitIds: Set<string>;
  alreadyAssignedCustomPathIds: string[];
  onModulesAssigned: () => void;
  onCustomPathAssigned: (path: UserCustomPath) => void;
}

/** "Asignar nuevo path" (corrección post-2.4): un solo punto de entrada para
 * asignar contenido a un colaborador — pestaña "Módulos" (bloques de pilar/
 * skill de Carrera Profesional, mismo picker que el panel admin) o "Rutas
 * personalizadas" (CustomPath de la Empresa/Org). El botón "Asignar módulo"
 * separado desaparece: este diálogo cubre ambos casos. */
export function AssignPathDialog({
  open,
  onClose,
  userId,
  userName,
  alreadyAssignedUnitIds,
  alreadyAssignedCustomPathIds,
  onModulesAssigned,
  onCustomPathAssigned,
}: Props) {
  const [tab, setTab] = React.useState<"modules" | "custom">("modules");
  const [pending, setPending] = React.useState<string | null>(null);
  const [customPaths, setCustomPaths] = React.useState<UserCustomPath[]>([]);
  const [customStatus, setCustomStatus] = React.useState<"loading" | "ok" | "error">("loading");

  React.useEffect(() => {
    if (!open) return;
    setTab("modules");
    setCustomStatus("loading");
    apiListAvailableCustomPaths(userId)
      .then((paths) => {
        setCustomPaths(paths);
        setCustomStatus("ok");
      })
      .catch(() => setCustomStatus("error"));
  }, [open, userId]);

  async function assignCustomPath(path: UserCustomPath) {
    setPending(path.id);
    try {
      await apiAssignCustomPathToUser(userId, path.id);
      toast(`Asignaste "${path.name}" a ${userName}`, "success");
      onCustomPathAssigned(path);
      onClose();
    } catch {
      toast("No se pudo asignar la ruta. Probá de nuevo.", "danger");
    } finally {
      setPending(null);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Asignar path a ${userName}`}
      description="Elegí módulos por pilar/skill o una ruta personalizada de la empresa."
      className="max-w-lg"
    >
      <div role="tablist" aria-label="Tipo de path" className="mb-4 inline-flex rounded-md border border-border">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "modules"}
          onClick={() => setTab("modules")}
          className={cn(
            "px-3 py-1.5 font-sans text-xs font-semibold transition-colors",
            tab === "modules" ? "bg-hg-green-100 text-primary" : "text-fg-muted hover:bg-bg-sunken",
          )}
        >
          Módulos
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "custom"}
          onClick={() => setTab("custom")}
          className={cn(
            "border-l border-border px-3 py-1.5 font-sans text-xs font-semibold transition-colors",
            tab === "custom" ? "bg-hg-green-100 text-primary" : "text-fg-muted hover:bg-bg-sunken",
          )}
        >
          Rutas personalizadas
        </button>
      </div>

      {tab === "modules" ? (
        <ModuleBlockAssignFields
          userId={userId}
          userName={userName}
          alreadyAssignedIds={alreadyAssignedUnitIds}
          onAssigned={() => { onModulesAssigned(); onClose(); }}
          onCancel={onClose}
        />
      ) : customStatus === "loading" ? (
        <p className="text-sm text-fg-muted">Cargando…</p>
      ) : customStatus === "error" ? (
        <p className="text-sm text-fg-muted">No pudimos cargar las rutas personalizadas.</p>
      ) : customPaths.length === 0 ? (
        <p className="text-sm text-fg-muted">
          Todavía no hay rutas personalizadas para la empresa/organización de {userName}.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {customPaths.map((path) => {
            const assigned = alreadyAssignedCustomPathIds.includes(path.id);
            const busy = pending === path.id;
            return (
              <button
                key={path.id}
                type="button"
                disabled={assigned || busy}
                onClick={() => void assignCustomPath(path)}
                className={cn(
                  "flex items-start gap-2 rounded-lg border p-3 text-left transition-colors",
                  assigned
                    ? "cursor-not-allowed border-border bg-bg-sunken opacity-60"
                    : "border-border bg-bg-raised hover:border-primary hover:bg-hg-green-100",
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1 font-sans text-sm font-semibold text-fg">
                    {path.name}
                    {assigned && <Check size={14} strokeWidth={2.5} className="text-success" />}
                  </span>
                  {path.description && (
                    <span className="block text-xs text-fg-muted">{path.description}</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </Dialog>
  );
}
