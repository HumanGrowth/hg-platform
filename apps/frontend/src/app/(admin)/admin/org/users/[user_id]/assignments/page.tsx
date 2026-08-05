"use client";

import { Trash2 } from "lucide-react";
import { useParams, useSearchParams } from "next/navigation";
import * as React from "react";

import { AssignModulesModal } from "@/components/admin/AssignModulesModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Display } from "@/components/ui/display";
import { Eyebrow } from "@/components/ui/eyebrow";
import { apiDeleteAssignment, apiListUserAssignments } from "@/lib/api";
import { toast } from "@/lib/toast-store";
import type { ModuleAssignment } from "@/lib/types";

const STATUS_LABEL: Record<string, string> = {
  assigned: "Asignado",
  in_progress: "En progreso",
  completed: "Completado",
  skipped: "Omitido",
};

export default function UserAssignmentsPage() {
  const params = useParams();
  const userId = String(params.user_id);
  const userName = useSearchParams().get("name") ?? "el colaborador";

  const [rows, setRows] = React.useState<ModuleAssignment[] | null>(null);
  const [open, setOpen] = React.useState(false);

  const load = React.useCallback(() => {
    apiListUserAssignments(userId).then(setRows).catch(() => setRows([]));
  }, [userId]);

  React.useEffect(() => {
    load();
  }, [load]);

  async function remove(id: string) {
    try {
      await apiDeleteAssignment(id);
      load();
    } catch {
      toast("No pudimos quitar la asignación.", "danger");
    }
  }

  const assignedIds = new Set((rows ?? []).map((a) => a.learning_unit_id));

  return (
    <main className="mx-auto w-full max-w-app px-8 py-10">
      <Eyebrow accent>Asignaciones</Eyebrow>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-4">
        <Display variant="display-3">{userName}</Display>
        <Button onClick={() => setOpen(true)}>Asignar módulos</Button>
      </div>
      <p className="mt-2 max-w-prose text-sm text-fg-muted">
        Los módulos asignados aparecen priorizados y marcados en la vista del colaborador. La
        asignación es aditiva: no restringe qué otros módulos puede ver.
      </p>

      <Card className="mt-8 overflow-x-auto overflow-y-hidden p-0">
        <table className="w-full text-left">
          <thead className="border-b border-border bg-bg-sunken">
            <tr className="font-sans text-micro uppercase tracking-meta text-fg-muted">
              <th className="px-5 py-3 font-semibold">Módulo</th>
              <th className="px-5 py-3 font-semibold">Estado</th>
              <th className="px-5 py-3 font-semibold">Vence</th>
              <th className="px-5 py-3 font-semibold">Nota</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows === null ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-sm text-fg-muted">Cargando…</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-sm text-fg-muted">
                  Sin módulos asignados todavía.
                </td>
              </tr>
            ) : (
              rows.map((a) => (
                <tr key={a.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-3 text-sm font-medium text-fg">{a.unit_title}</td>
                  <td className="px-5 py-3">
                    <Badge>{STATUS_LABEL[a.status] ?? a.status}</Badge>
                  </td>
                  <td className="px-5 py-3 text-sm text-fg-muted">
                    {a.due_date ? new Date(a.due_date).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-5 py-3 text-sm text-fg-muted">{a.note ?? "—"}</td>
                  <td className="px-5 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => void remove(a.id)}
                      aria-label="Quitar asignación"
                      className="rounded-md p-1.5 text-fg-muted hover:bg-bg-sunken hover:text-danger"
                    >
                      <Trash2 size={16} strokeWidth={1.75} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      <AssignModulesModal
        open={open}
        onClose={() => setOpen(false)}
        userId={userId}
        userName={userName}
        alreadyAssignedIds={assignedIds}
        onAssigned={load}
      />
    </main>
  );
}
