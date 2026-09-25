"use client";

import { Check } from "lucide-react";
import * as React from "react";

import { ModuleBlockAssignFields } from "@/components/admin/ModuleBlockAssignFields";
import { Dialog } from "@/components/ui/dialog";
import {
  apiAssignCustomPathToUser,
  apiAssignPath,
  apiListAvailableCustomPaths,
  apiListPaths,
} from "@/lib/api";
import { toast } from "@/lib/toast-store";
import type { CareerPath, UserCustomPath } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  alreadyAssignedUnitIds: Set<string>;
  alreadyAssignedCustomPathIds: string[];
  /** Códigos (P1..P6) de los paths de carrera con inscripción activa. */
  alreadyEnrolledPathCodes: string[];
  onModulesAssigned: () => void;
  onCustomPathAssigned: (path: UserCustomPath) => void;
  onCareerPathAssigned: () => void;
}

/** "Asignar nuevo path": un solo punto de entrada para asignar contenido a un
 * colaborador — "Módulos" (bloques de pilar/skill de Carrera Profesional, mismo
 * picker que el panel admin), "Rutas personalizadas" (CustomPath de la
 * Empresa/Org) o "Path de carrera" (inscripción a una dimensión: define por qué
 * dimensiones se arma su ruta, ver `sequencing.py` en el backend). */
export function AssignPathDialog({
  open,
  onClose,
  userId,
  userName,
  alreadyAssignedUnitIds,
  alreadyAssignedCustomPathIds,
  alreadyEnrolledPathCodes,
  onModulesAssigned,
  onCustomPathAssigned,
  onCareerPathAssigned,
}: Props) {
  const [tab, setTab] = React.useState<"modules" | "custom" | "career">("modules");
  const [careerPaths, setCareerPaths] = React.useState<CareerPath[]>([]);
  const [careerStatus, setCareerStatus] = React.useState<"loading" | "ok" | "error">("loading");
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
    setCareerStatus("loading");
    apiListPaths()
      .then((paths) => {
        setCareerPaths(paths);
        setCareerStatus("ok");
      })
      .catch(() => setCareerStatus("error"));
  }, [open, userId]);

  async function assignCareerPath(path: CareerPath) {
    setPending(path.code);
    try {
      await apiAssignPath(userId, path.code);
      toast(`Inscribiste a ${userName} en "${path.name}"`, "success");
      onCareerPathAssigned();
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
      description="Elegí módulos por pilar/skill, una ruta personalizada de la empresa o un path de carrera."
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
        <button
          type="button"
          role="tab"
          aria-selected={tab === "career"}
          onClick={() => setTab("career")}
          className={cn(
            "border-l border-border px-3 py-1.5 font-sans text-xs font-semibold transition-colors",
            tab === "career" ? "bg-hg-green-100 text-primary" : "text-fg-muted hover:bg-bg-sunken",
          )}
        >
          Path de carrera
        </button>
      </div>

      {tab === "career" ? (
        careerStatus === "loading" ? (
          <p className="text-sm text-fg-muted">Cargando…</p>
        ) : careerStatus === "error" ? (
          <p className="text-sm text-fg-muted">No pudimos cargar los paths de carrera.</p>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-fg-muted">
              Con paths asignados, la ruta de {userName} solo recorre esas dimensiones. Sin ninguno,
              recorre todas las que tengan contenido.
            </p>
            {careerPaths.map((path) => {
              const enrolled = alreadyEnrolledPathCodes.includes(path.code);
              return (
                <button
                  key={path.id}
                  type="button"
                  disabled={enrolled || pending === path.code}
                  onClick={() => void assignCareerPath(path)}
                  className={cn(
                    "flex items-start gap-2 rounded-lg border p-3 text-left transition-colors",
                    enrolled
                      ? "cursor-not-allowed border-border bg-bg-sunken opacity-60"
                      : "border-border bg-bg-raised hover:border-primary hover:bg-hg-green-100",
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1 font-sans text-sm font-semibold text-fg">
                      {path.name}
                      {enrolled && <Check size={14} strokeWidth={2.5} className="text-success" />}
                    </span>
                    {path.description && (
                      <span className="block text-xs text-fg-muted">{path.description}</span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        )
      ) : tab === "modules" ? (
        <>
          <p className="mb-3 text-xs text-fg-muted">
            Los módulos sueltos le aparecen al colaborador en “Asignados por tu manager”. No cambian
            el orden de su ruta: eso solo lo hace una ruta personalizada.
          </p>
          <ModuleBlockAssignFields
            userId={userId}
            userName={userName}
            alreadyAssignedIds={alreadyAssignedUnitIds}
            onAssigned={() => { onModulesAssigned(); onClose(); }}
            onCancel={onClose}
          />
        </>
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
          <p className="text-xs text-fg-muted">
            Una ruta personalizada sí reordena la ruta del colaborador (prioriza sus módulos).
          </p>
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
