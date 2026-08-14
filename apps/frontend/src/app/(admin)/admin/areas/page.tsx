"use client";

import { Plus } from "lucide-react";
import * as React from "react";

import { SuperadminGate } from "@/components/SuperadminGate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Display } from "@/components/ui/display";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Input, Label } from "@/components/ui/input";
import { apiCreateArea, apiListAreas, apiUpdateArea, ApiError } from "@/lib/api";
import { toast } from "@/lib/toast-store";
import type { Area } from "@/lib/types";

function AreasContent() {
  const [areas, setAreas] = React.useState<Area[] | null>(null);
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState({ code: "", name: "", description: "" });
  const [submitting, setSubmitting] = React.useState(false);

  const load = React.useCallback(() => {
    apiListAreas()
      .then(setAreas)
      .catch(() => setAreas([]));
  }, []);
  React.useEffect(load, [load]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiCreateArea({
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        description: form.description.trim() || undefined,
      });
      toast("Área creada.", "success");
      setOpen(false);
      setForm({ code: "", name: "", description: "" });
      load();
    } catch (err) {
      toast(
        err instanceof ApiError && err.status === 409
          ? "Ese código ya existe."
          : "No se pudo crear el área.",
        "danger",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(area: Area) {
    try {
      await apiUpdateArea(area.code, { is_active: !area.is_active });
      load();
    } catch {
      toast("No se pudo actualizar el área.", "danger");
    }
  }

  return (
    <main className="mx-auto w-full max-w-app px-5 py-10 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow accent>Panel HG</Eyebrow>
          <Display variant="display-3" className="mt-1">
            Áreas de contenido
          </Display>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus size={18} strokeWidth={1.75} />
          Nueva área
        </Button>
      </div>

      <p className="mt-3 max-w-prose text-sm text-fg-muted">
        Las áreas segmentan el contenido por vertical (Manufactura, IT, Cost center…). El contenido
        sin área es <strong>general</strong> (visible para todas las empresas). El acceso por empresa
        se gestiona desde cada Empresa.
      </p>

      <Card className="mt-8 overflow-x-auto overflow-y-hidden p-0">
        <table className="w-full text-left">
          <thead className="border-b border-border bg-bg-sunken">
            <tr className="font-sans text-micro uppercase tracking-meta text-fg-muted">
              <th className="px-5 py-3 font-semibold">Código</th>
              <th className="px-5 py-3 font-semibold">Nombre</th>
              <th className="px-5 py-3 font-semibold">Descripción</th>
              <th className="px-5 py-3 font-semibold">Estado</th>
            </tr>
          </thead>
          <tbody>
            {areas?.map((a) => (
              <tr key={a.code} className="border-b border-border last:border-0">
                <td className="px-5 py-3 font-mono text-sm font-semibold text-fg">{a.code}</td>
                <td className="px-5 py-3 text-sm text-fg">{a.name}</td>
                <td className="px-5 py-3 text-sm text-fg-muted">{a.description ?? "—"}</td>
                <td className="px-5 py-3">
                  <button type="button" onClick={() => toggleActive(a)} className="cursor-pointer">
                    {a.is_active ? (
                      <Badge variant="success">Activa</Badge>
                    ) : (
                      <Badge>Inactiva</Badge>
                    )}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {areas && areas.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-fg-muted">Todavía no hay áreas.</p>
        ) : null}
        {areas === null ? (
          <p className="px-5 py-10 text-center text-sm text-fg-muted">Cargando…</p>
        ) : null}
      </Card>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Nueva área"
        description="El código es 2–3 letras mayúsculas (ej. MFG, IT). Es inmutable."
      >
        <form onSubmit={onCreate} className="flex flex-col gap-4" noValidate>
          <div>
            <Label htmlFor="code">Código</Label>
            <Input
              id="code"
              maxLength={3}
              placeholder="MFG"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
            />
          </div>
          <div>
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="description">Descripción (opcional)</Label>
            <Input
              id="description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="mt-2 flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting || form.code.length < 2 || !form.name.trim()}>
              {submitting ? "Creando…" : "Crear"}
            </Button>
          </div>
        </form>
      </Dialog>
    </main>
  );
}

export default function AdminAreasPage() {
  return (
    <SuperadminGate>
      <AreasContent />
    </SuperadminGate>
  );
}
