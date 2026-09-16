"use client";

import { Check } from "lucide-react";
import * as React from "react";

import { Dialog } from "@/components/ui/dialog";
import { apiAssignCustomPathToUser, apiAssignPath, apiListAvailableCustomPaths } from "@/lib/api";
import { DIMENSIONS_META } from "@/lib/dimension-styles";
import { toast } from "@/lib/toast-store";
import type { Enrollment, UserCustomPath } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  alreadyAssignedCodes: string[];
  alreadyAssignedCustomPathIds: string[];
  onAssigned: (enrollment: Enrollment) => void;
  onCustomPathAssigned: (path: UserCustomPath) => void;
}

/** "Asignar nuevo path" (corrección post-2.4): ofrece los 6 pilares
 * (career-path/Enrollment, como antes) O una ruta personalizada de la
 * Empresa/Org del colaborador (CustomPath, FASE 2.2) — antes solo mostraba
 * pilares, desactualizado frente a las rutas custom ya en uso. */
export function AssignPathDialog({
  open,
  onClose,
  userId,
  userName,
  alreadyAssignedCodes,
  alreadyAssignedCustomPathIds,
  onAssigned,
  onCustomPathAssigned,
}: Props) {
  const [tab, setTab] = React.useState<"pillars" | "custom">("pillars");
  const [pending, setPending] = React.useState<string | null>(null);
  const [customPaths, setCustomPaths] = React.useState<UserCustomPath[]>([]);
  const [customStatus, setCustomStatus] = React.useState<"loading" | "ok" | "error">("loading");

  React.useEffect(() => {
    if (!open) return;
    setTab("pillars");
    setCustomStatus("loading");
    apiListAvailableCustomPaths(userId)
      .then((paths) => {
        setCustomPaths(paths);
        setCustomStatus("ok");
      })
      .catch(() => setCustomStatus("error"));
  }, [open, userId]);

  async function assign(code: string) {
    setPending(code);
    try {
      const enrollment = await apiAssignPath(userId, code);
      toast(`Asignaste ${code} a ${userName}`, "success");
      onAssigned(enrollment);
      onClose();
    } catch {
      toast("No se pudo asignar el path. Probá de nuevo.", "danger");
    } finally {
      setPending(null);
    }
  }

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
      description="Elegí un pilar o una ruta personalizada de la empresa para agregar a su ruta."
      className="max-w-lg"
    >
      <div role="tablist" aria-label="Tipo de path" className="mb-4 inline-flex rounded-md border border-border">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "pillars"}
          onClick={() => setTab("pillars")}
          className={cn(
            "px-3 py-1.5 font-sans text-xs font-semibold transition-colors",
            tab === "pillars" ? "bg-hg-green-100 text-primary" : "text-fg-muted hover:bg-bg-sunken",
          )}
        >
          Pilares
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

      {tab === "pillars" ? (
        <div className="grid grid-cols-2 gap-3">
          {DIMENSIONS_META.map((p) => {
            const assigned = alreadyAssignedCodes.includes(p.id);
            const busy = pending === p.id;
            return (
              <button
                key={p.id}
                type="button"
                disabled={assigned || busy}
                onClick={() => void assign(p.id)}
                className={cn(
                  "flex items-start gap-2 rounded-lg border p-3 text-left transition-colors",
                  assigned
                    ? "cursor-not-allowed border-border bg-bg-sunken opacity-60"
                    : "border-border bg-bg-raised hover:border-primary hover:bg-hg-green-100",
                )}
              >
                <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${p.dot}`} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1 font-sans text-sm font-semibold text-fg">
                    {p.id}
                    {assigned && <Check size={14} strokeWidth={2.5} className="text-success" />}
                  </span>
                  <span className="block text-xs text-fg-muted">{p.name}</span>
                </span>
              </button>
            );
          })}
        </div>
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
