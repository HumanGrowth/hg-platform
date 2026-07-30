"use client";

import { Pencil, Plus, Star, Trash2 } from "lucide-react";
import * as React from "react";

import { SuperadminGate } from "@/components/SuperadminGate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Display } from "@/components/ui/display";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Input, Label } from "@/components/ui/input";
import {
  apiAdminListCommunityEvents,
  apiCreateCommunityEvent,
  apiDeleteCommunityEvent,
  apiUpdateCommunityEvent,
} from "@/lib/api";
import { toast } from "@/lib/toast-store";
import type { CommunityEvent, CommunityEventInput, CommunityEventType } from "@/lib/types";

const TYPE_LABELS: Record<CommunityEventType, string> = {
  live_webinar: "Webinar en vivo",
  recorded_webinar: "Webinar grabado",
  masterclass_live: "Masterclass en vivo",
  masterclass_replay: "Masterclass grabada",
  material: "Material",
};

const EMPTY: CommunityEventInput = {
  type: "live_webinar",
  title: "",
  description: "",
  hero_image_url: "",
  cta_url: "",
  cta_label: "",
  starts_at: null,
  ends_at: null,
  is_featured: false,
  sort_order: 0,
};

/** ISO → valor de <input type="datetime-local"> (hora local). */
function isoToLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
}
function localToIso(local: string): string | null {
  return local ? new Date(local).toISOString() : null;
}

function AdminEventsContent() {
  const [events, setEvents] = React.useState<CommunityEvent[] | null>(null);
  const [open, setOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<CommunityEventInput>(EMPTY);
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(() => {
    apiAdminListCommunityEvents()
      .then(setEvents)
      .catch(() => setEvents([]));
  }, []);
  React.useEffect(load, [load]);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY);
    setOpen(true);
  }
  function openEdit(e: CommunityEvent) {
    setEditingId(e.id);
    setForm({
      type: e.type,
      title: e.title,
      description: e.description ?? "",
      hero_image_url: e.hero_image_url ?? "",
      cta_url: e.cta_url ?? "",
      cta_label: e.cta_label ?? "",
      starts_at: e.starts_at,
      ends_at: e.ends_at,
      is_featured: e.is_featured,
      sort_order: e.sort_order,
    });
    setOpen(true);
  }

  async function save() {
    if (!form.title.trim()) {
      toast("El título es obligatorio.", "danger");
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await apiUpdateCommunityEvent(editingId, form);
        toast("Evento actualizado.", "success");
      } else {
        await apiCreateCommunityEvent(form);
        toast("Evento creado.", "success");
      }
      setOpen(false);
      load();
    } catch {
      toast("No se pudo guardar el evento.", "danger");
    } finally {
      setSaving(false);
    }
  }

  async function remove(e: CommunityEvent) {
    if (!window.confirm(`¿Eliminar "${e.title}"?`)) return;
    try {
      await apiDeleteCommunityEvent(e.id);
      toast("Evento eliminado.", "success");
      load();
    } catch {
      toast("No se pudo eliminar.", "danger");
    }
  }

  const set = <K extends keyof CommunityEventInput>(k: K, v: CommunityEventInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <main className="mx-auto w-full max-w-app px-8 py-10">
      <div className="flex items-end justify-between">
        <div>
          <Eyebrow accent>Panel HG</Eyebrow>
          <Display variant="display-3" className="mt-1">
            Eventos
          </Display>
        </div>
        <Button onClick={openCreate}>
          <Plus size={18} strokeWidth={1.75} />
          Nuevo evento
        </Button>
      </div>

      <Card className="mt-8 overflow-hidden p-0">
        <table className="w-full text-left">
          <thead className="border-b border-border bg-bg-sunken">
            <tr className="font-sans text-micro uppercase tracking-meta text-fg-muted">
              <th className="px-5 py-3 font-semibold">Título</th>
              <th className="px-5 py-3 font-semibold">Tipo</th>
              <th className="px-5 py-3 font-semibold">Fecha</th>
              <th className="px-5 py-3 font-semibold">Hero</th>
              <th className="px-5 py-3 font-semibold" />
            </tr>
          </thead>
          <tbody>
            {events?.map((e) => (
              <tr key={e.id} className="border-b border-border last:border-0 hover:bg-bg-sunken">
                <td className="px-5 py-3 font-sans text-sm font-semibold text-fg">
                  {e.is_featured && (
                    <Star size={13} className="mr-1 inline text-hg-amber" aria-label="Destacado" />
                  )}
                  {e.title}
                </td>
                <td className="px-5 py-3">
                  <Badge>{TYPE_LABELS[e.type]}</Badge>
                </td>
                <td className="px-5 py-3 text-sm text-fg-muted">
                  {e.starts_at ? new Date(e.starts_at).toLocaleDateString("es") : "—"}
                </td>
                <td className="px-5 py-3 text-sm text-fg-muted">{e.hero_image_url ? "Sí" : "—"}</td>
                <td className="px-5 py-3">
                  <div className="flex justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(e)}
                      aria-label="Editar"
                      className="rounded p-1.5 text-fg-muted hover:bg-bg-raised hover:text-fg"
                    >
                      <Pencil size={16} strokeWidth={1.75} />
                    </button>
                    <button
                      type="button"
                      onClick={() => void remove(e)}
                      aria-label="Eliminar"
                      className="rounded p-1.5 text-fg-muted hover:bg-bg-raised hover:text-danger"
                    >
                      <Trash2 size={16} strokeWidth={1.75} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {events && events.length === 0 && (
          <p className="px-5 py-10 text-center text-sm text-fg-muted">Todavía no hay eventos.</p>
        )}
        {events === null && (
          <p className="px-5 py-10 text-center text-sm text-fg-muted">Cargando…</p>
        )}
      </Card>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={editingId ? "Editar evento" : "Nuevo evento"}
        description="Los eventos aparecen en /eventos. Marcá 'Destacado' para el hero rotativo."
      >
        <div className="flex flex-col gap-4">
          <div>
            <Label htmlFor="ev-title">Título</Label>
            <Input id="ev-title" value={form.title} onChange={(e) => set("title", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="ev-type">Tipo</Label>
              <select
                id="ev-type"
                value={form.type}
                onChange={(e) => set("type", e.target.value as CommunityEventType)}
                className="h-10 w-full rounded-md border border-border bg-bg-raised px-3 font-sans text-sm text-fg focus:border-primary focus:outline-none focus:ring-2 focus:ring-hg-amber/40"
              >
                {(Object.keys(TYPE_LABELS) as CommunityEventType[]).map((t) => (
                  <option key={t} value={t}>
                    {TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="ev-order">Orden</Label>
              <Input
                id="ev-order"
                type="number"
                value={form.sort_order ?? 0}
                onChange={(e) => set("sort_order", Number(e.target.value))}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="ev-desc">Descripción</Label>
            <textarea
              id="ev-desc"
              value={form.description ?? ""}
              onChange={(e) => set("description", e.target.value)}
              rows={2}
              className="w-full rounded-md border border-border bg-bg-raised px-3 py-2 font-sans text-sm text-fg focus:border-primary focus:outline-none focus:ring-2 focus:ring-hg-amber/40"
            />
          </div>
          <div>
            <Label htmlFor="ev-hero">Imagen hero (URL)</Label>
            <Input
              id="ev-hero"
              value={form.hero_image_url ?? ""}
              onChange={(e) => set("hero_image_url", e.target.value)}
              placeholder="https://…"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="ev-cta-url">CTA link</Label>
              <Input
                id="ev-cta-url"
                value={form.cta_url ?? ""}
                onChange={(e) => set("cta_url", e.target.value)}
                placeholder="https://…"
              />
            </div>
            <div>
              <Label htmlFor="ev-cta-label">CTA texto</Label>
              <Input
                id="ev-cta-label"
                value={form.cta_label ?? ""}
                onChange={(e) => set("cta_label", e.target.value)}
                placeholder="Registrarme"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="ev-start">Inicio</Label>
              <Input
                id="ev-start"
                type="datetime-local"
                value={isoToLocal(form.starts_at)}
                onChange={(e) => set("starts_at", localToIso(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="ev-end">Fin</Label>
              <Input
                id="ev-end"
                type="datetime-local"
                value={isoToLocal(form.ends_at)}
                onChange={(e) => set("ends_at", localToIso(e.target.value))}
              />
            </div>
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-fg">
            <input
              type="checkbox"
              checked={form.is_featured ?? false}
              onChange={(e) => set("is_featured", e.target.checked)}
              className="accent-primary"
            />
            Destacado (aparece en el hero rotativo)
          </label>
          <div className="mt-2 flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => void save()} disabled={saving}>
              {saving ? "Guardando…" : editingId ? "Guardar" : "Crear"}
            </Button>
          </div>
        </div>
      </Dialog>
    </main>
  );
}

export default function AdminEventsPage() {
  return (
    <SuperadminGate>
      <AdminEventsContent />
    </SuperadminGate>
  );
}
