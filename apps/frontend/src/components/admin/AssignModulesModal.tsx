"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input, Label } from "@/components/ui/input";
import { apiAssignModules, apiListAssignableUnits } from "@/lib/api";
import { dimensionToPillar, pillarShortName } from "@/lib/pillars";
import { toast } from "@/lib/toast-store";
import type { AssignableUnit } from "@/lib/types";

/**
 * Modal para asignar módulos a un colaborador (cierre-beta TASK 3). Multi-select
 * de units publicadas con filtro por dimensión + nivel + búsqueda, due date y nota.
 */
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
  const [units, setUnits] = React.useState<AssignableUnit[]>([]);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [q, setQ] = React.useState("");
  const [dueDate, setDueDate] = React.useState("");
  const [note, setNote] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setSelected(new Set());
    setQ("");
    setDueDate("");
    setNote("");
    apiListAssignableUnits().then(setUnits).catch(() => setUnits([]));
  }, [open]);

  const filtered = units.filter((u) => u.title.toLowerCase().includes(q.toLowerCase()));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function submit() {
    if (selected.size === 0) return;
    setSaving(true);
    try {
      await apiAssignModules(
        userId,
        [...selected],
        dueDate ? new Date(dueDate).toISOString() : null,
        note.trim() || null,
      );
      toast(`Módulos asignados a ${userName}.`, "success");
      onAssigned();
      onClose();
    } catch {
      toast("No pudimos asignar los módulos.", "danger");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={`Asignar módulos a ${userName}`}>
      <div className="flex flex-col gap-4">
        <Input placeholder="Buscar módulo…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="max-h-64 overflow-y-auto rounded-md border border-border">
          {filtered.length === 0 ? (
            <p className="p-4 text-sm text-fg-muted">No hay módulos publicados.</p>
          ) : (
            filtered.map((u) => {
              const assigned = alreadyAssignedIds.has(u.id);
              return (
                <label
                  key={u.id}
                  className="flex cursor-pointer items-center gap-3 border-b border-border px-3 py-2 last:border-0 hover:bg-bg-sunken"
                >
                  <input
                    type="checkbox"
                    disabled={assigned}
                    checked={assigned || selected.has(u.id)}
                    onChange={() => toggle(u.id)}
                    className="h-4 w-4 shrink-0"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-1 text-sm font-medium text-fg">{u.title}</span>
                    <span className="text-xs text-fg-muted">
                      {pillarShortName(dimensionToPillar(u.dimension_code))} · {u.level_code}
                      {assigned ? " · ya asignado" : ""}
                    </span>
                  </span>
                </label>
              );
            })
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="due">Fecha límite (opcional)</Label>
            <Input id="due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="note">Nota (opcional)</Label>
            <Input id="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Empezá por…" />
          </div>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-fg-muted">{selected.size} seleccionado(s)</span>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={() => void submit()} disabled={saving || selected.size === 0}>
              {saving ? "Asignando…" : "Asignar"}
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
