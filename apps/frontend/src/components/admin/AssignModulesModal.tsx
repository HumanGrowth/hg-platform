"use client";

import { Dialog } from "@/components/ui/dialog";
import { ModuleBlockAssignFields } from "@/components/admin/ModuleBlockAssignFields";

/** Wrapper standalone del picker de módulos por bloque (ver
 * `ModuleBlockAssignFields`) — usado desde el panel admin de asignaciones
 * (admin/org/users/[user_id]/assignments). En team/[id] este picker vive
 * embebido en la pestaña "Módulos" de `AssignPathDialog` (corrección
 * post-2.4: un solo punto de entrada, sin botón separado). */
export function AssignModulesModal({
  open,
  onClose,
  userId,
  userName,
  alreadyAssignedIds,
  onAssigned,
}: {
  open: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  alreadyAssignedIds: Set<string>;
  onAssigned: () => void;
}) {
  return (
    <Dialog open={open} onClose={onClose} title={`Asignar módulos a ${userName}`}>
      <ModuleBlockAssignFields
        userId={userId}
        userName={userName}
        alreadyAssignedIds={alreadyAssignedIds}
        onAssigned={() => { onAssigned(); onClose(); }}
        onCancel={onClose}
      />
    </Dialog>
  );
}
