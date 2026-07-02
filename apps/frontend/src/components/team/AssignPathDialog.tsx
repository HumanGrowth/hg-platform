"use client";

import { Check } from "lucide-react";
import * as React from "react";

import { Dialog } from "@/components/ui/dialog";
import { apiAssignPath } from "@/lib/api";
import { PILLARS } from "@/lib/pillars";
import { toast } from "@/lib/toast-store";
import type { Enrollment } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  alreadyAssignedCodes: string[];
  onAssigned: (enrollment: Enrollment) => void;
}

export function AssignPathDialog({
  open,
  onClose,
  userId,
  userName,
  alreadyAssignedCodes,
  onAssigned,
}: Props) {
  const [pending, setPending] = React.useState<string | null>(null);

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

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Asignar path a ${userName}`}
      description="Elegí el pilar que quieras agregar a su ruta."
      className="max-w-lg"
    >
      <div className="grid grid-cols-2 gap-3">
        {PILLARS.map((p) => {
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
                  : "border-border bg-bg-raised hover:border-orange hover:bg-hg-green-100",
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
    </Dialog>
  );
}
