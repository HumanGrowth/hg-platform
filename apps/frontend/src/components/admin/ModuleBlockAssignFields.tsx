"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { apiAssignModules, apiListAssignableUnits } from "@/lib/api";
import { blocksFor, cpCatalog, cpLevels, type BlockMode } from "@/lib/cp-blocks";
import { toast } from "@/lib/toast-store";
import { cn } from "@/lib/utils";
import type { AssignableUnit } from "@/lib/types";

/**
 * Picker de módulos por bloque (pilar/skill), CP-only — contenido compartido
 * entre `AssignModulesModal` (panel admin standalone) y la pestaña "Módulos"
 * de `AssignPathDialog` en team/[id] (corrección post-2.4: un solo punto de
 * entrada para asignar contenido). Nunca expone módulos individuales.
 */
export function ModuleBlockAssignFields({
  userId,
  userName,
  alreadyAssignedIds,
  onAssigned,
  onCancel,
}: {
  userId: string;
  userName: string;
  alreadyAssignedIds: Set<string>;
  onAssigned: () => void;
  onCancel: () => void;
}) {
  const [units, setUnits] = React.useState<AssignableUnit[]>([]);
  const [mode, setMode] = React.useState<BlockMode>("pillar");
  const [levelF, setLevelF] = React.useState("");
  const [selectedKeys, setSelectedKeys] = React.useState<Set<string>>(new Set());
  const [dueDate, setDueDate] = React.useState("");
  const [note, setNote] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    setSelectedKeys(new Set());
    setMode("pillar");
    setLevelF("");
    setDueDate("");
    setNote("");
    apiListAssignableUnits().then(setUnits).catch(() => setUnits([]));
  }, [userId]);

  const levels = cpLevels(units);
  const blocks = blocksFor(cpCatalog(units, levelF), mode);

  function blockStatus(unitIds: string[]): "assigned" | "partial" | "available" {
    const assignedCount = unitIds.filter((id) => alreadyAssignedIds.has(id)).length;
    if (assignedCount === 0) return "available";
    return assignedCount === unitIds.length ? "assigned" : "partial";
  }

  function toggleBlock(key: string) {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const pendingUnitIds = new Set(
    blocks
      .filter((b) => selectedKeys.has(b.key))
      .flatMap((b) => b.unitIds)
      .filter((id) => !alreadyAssignedIds.has(id)),
  );

  async function submit() {
    if (pendingUnitIds.size === 0 || !dueDate) return;
    setSaving(true);
    try {
      await apiAssignModules(
        userId,
        [...pendingUnitIds],
        new Date(dueDate).toISOString(),
        note.trim() || null,
      );
      toast(`Módulos asignados a ${userName}.`, "success");
      onAssigned();
    } catch {
      toast("No pudimos asignar los módulos.", "danger");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-fg-subtle">
        Solo contenido de Carrera Profesional, por pilar o skill — las demás dimensiones se
        asignan según el score del assessment.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <div role="tablist" aria-label="Agrupar por" className="inline-flex rounded-md border border-border">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "pillar"}
            onClick={() => { setMode("pillar"); setSelectedKeys(new Set()); }}
            className={cn(
              "px-3 py-1.5 font-sans text-xs font-semibold transition-colors",
              mode === "pillar" ? "bg-hg-green-100 text-primary" : "text-fg-muted hover:bg-bg-sunken",
            )}
          >
            Pilar
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "skill"}
            onClick={() => { setMode("skill"); setSelectedKeys(new Set()); }}
            className={cn(
              "border-l border-border px-3 py-1.5 font-sans text-xs font-semibold transition-colors",
              mode === "skill" ? "bg-hg-green-100 text-primary" : "text-fg-muted hover:bg-bg-sunken",
            )}
          >
            Skill
          </button>
        </div>
        <Select value={levelF} onChange={(e) => setLevelF(e.target.value)} className="w-auto">
          <option value="">Todos los niveles</option>
          {levels.map((l) => (
            <option key={l} value={l}>Nivel {l.replace("L", "")}</option>
          ))}
        </Select>
      </div>

      <div className="grid max-h-72 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
        {blocks.length === 0 ? (
          <p className="p-4 text-sm text-fg-muted sm:col-span-2">
            No hay módulos de Carrera Profesional para este filtro.
          </p>
        ) : (
          blocks.map((b) => {
            const status = blockStatus(b.unitIds);
            const selected = selectedKeys.has(b.key);
            return (
              <button
                key={b.key}
                type="button"
                disabled={status === "assigned"}
                onClick={() => toggleBlock(b.key)}
                className={cn(
                  "flex items-center justify-between gap-2 rounded-lg border p-3 text-left transition-colors",
                  status === "assigned"
                    ? "cursor-not-allowed border-border bg-bg-sunken opacity-60"
                    : selected
                      ? "border-primary bg-hg-green-100"
                      : "border-border bg-bg-raised hover:border-primary hover:bg-hg-green-100",
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-1 font-sans text-sm font-semibold text-fg">{b.label}</span>
                  <span className="text-xs text-fg-muted">
                    {b.unitIds.length} módulo(s)
                    {status === "assigned" ? " · ya asignado" : status === "partial" ? " · parcial" : ""}
                  </span>
                </span>
              </button>
            );
          })
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="due">Fecha límite</Label>
          <Input
            id="due"
            type="date"
            required
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="note">Nota (opcional)</Label>
          <Input id="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Empezá por…" />
        </div>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-fg-muted">{pendingUnitIds.size} módulo(s) a asignar</span>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
          <Button onClick={() => void submit()} disabled={saving || pendingUnitIds.size === 0 || !dueDate}>
            {saving ? "Asignando…" : "Asignar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
