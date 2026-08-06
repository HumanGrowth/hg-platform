"use client";

import { BookmarkPlus, Check } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { apiSaveTip } from "@/lib/api";
import { toast } from "@/lib/toast-store";
import { cn } from "@/lib/utils";

/**
 * Botón "Guardar en mi cuaderno" (cierre-beta TASK 5): abre un modal con el
 * texto prellenado (editable) y lo guarda en el Plan de Acción del usuario.
 * Reemplaza el placeholder AISoonBadge.
 */
export function SaveTipButton({
  prefillText = "",
  dimensionCode,
  unitId,
  blockId,
  source = "solution",
  label = "Guardar en mi cuaderno",
  className,
}: {
  prefillText?: string;
  dimensionCode?: string | null;
  unitId?: string | null;
  blockId?: string | null;
  source?: "solution" | "reflection" | "custom";
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [text, setText] = React.useState(prefillText);
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  async function submit() {
    if (!text.trim()) return;
    setSaving(true);
    try {
      await apiSaveTip({
        tip_text: text.trim(), source, unit_id: unitId ?? null,
        block_id: blockId ?? null, dimension_code: dimensionCode ?? null,
      });
      setSaved(true);
      setOpen(false);
      toast("Guardado en tu Plan de Acción.", "success");
    } catch {
      toast("No pudimos guardar el tip.", "danger");
    } finally {
      setSaving(false);
    }
  }

  if (saved) {
    return (
      <span className={cn("inline-flex items-center gap-1.5 text-sm font-medium text-success", className)}>
        <Check size={16} strokeWidth={2} /> Guardado ·{" "}
        <Link href={"/plan-accion" as Route} className="underline hover:text-primary">
          Ver en Plan de Acción
        </Link>
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setText(prefillText);
          setOpen(true);
        }}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-border bg-bg-raised px-3 py-1.5 font-sans text-sm font-medium text-fg hover:border-primary hover:text-primary",
          className,
        )}
      >
        <BookmarkPlus size={15} strokeWidth={1.75} /> {label}
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Guardar en mi cuaderno">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-fg-muted">
            Editá la idea que querés aplicar. La vas a encontrar en tu Plan de Acción.
          </p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            className="w-full rounded-md border border-border bg-bg-raised px-3 py-2 font-sans text-sm text-fg focus:border-primary focus:outline-none focus:ring-2 focus:ring-hg-amber/40"
          />
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => void submit()} disabled={saving || !text.trim()}>
              {saving ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
