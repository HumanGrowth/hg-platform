"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import * as React from "react";

import { SuperadminGate } from "@/components/SuperadminGate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Display } from "@/components/ui/display";
import { Eyebrow } from "@/components/ui/eyebrow";
import {
  apiAdminListPerspectives,
  apiCreatePerspective,
  apiDeletePerspective,
  apiPublishPerspective,
} from "@/lib/api";
import { toast } from "@/lib/toast-store";
import type { Perspective, PerspectiveContentType } from "@/lib/types";

const TYPE_LABEL: Record<PerspectiveContentType, string> = {
  blog: "Blog",
  article: "Artículo",
  business_case: "Business Case",
  whitepaper: "Whitepaper",
};

function PerspectivasAdminInner() {
  const router = useRouter();
  const [rows, setRows] = React.useState<Perspective[] | null>(null);
  const [newOpen, setNewOpen] = React.useState(false);
  const [creating, setCreating] = React.useState(false);

  const load = React.useCallback(() => {
    apiAdminListPerspectives().then(setRows).catch(() => setRows([]));
  }, []);
  React.useEffect(() => load(), [load]);

  async function createNew(type: PerspectiveContentType) {
    setCreating(true);
    try {
      const p = await apiCreatePerspective(type, { title: "Sin título" });
      router.push(`/admin/perspectivas/${p.id}` as Route);
    } catch {
      toast("No pudimos crear la perspectiva.", "danger");
      setCreating(false);
    }
  }

  async function togglePublish(p: Perspective) {
    try {
      await apiPublishPerspective(p.id, p.published_at === null);
      load();
    } catch {
      toast("No pudimos cambiar el estado.", "danger");
    }
  }

  async function remove(id: string) {
    try {
      await apiDeletePerspective(id);
      load();
    } catch {
      toast("No pudimos eliminar.", "danger");
    }
  }

  return (
    <main className="mx-auto w-full max-w-app px-8 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Eyebrow accent>Contenido</Eyebrow>
          <Display variant="display-3" className="mt-1">
            Perspectivas
          </Display>
        </div>
        <Button onClick={() => setNewOpen(true)}>
          <Plus size={16} strokeWidth={2} /> Nueva perspectiva
        </Button>
      </div>

      <Card className="mt-8 overflow-x-auto overflow-y-hidden p-0">
        <table className="w-full text-left">
          <thead className="border-b border-border bg-bg-sunken">
            <tr className="font-sans text-micro uppercase tracking-meta text-fg-muted">
              <th className="px-5 py-3 font-semibold">Título</th>
              <th className="px-5 py-3 font-semibold">Tipo</th>
              <th className="px-5 py-3 font-semibold">Pilar</th>
              <th className="px-5 py-3 font-semibold">Estado</th>
              <th className="px-5 py-3 font-semibold">Editado</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows === null ? (
              <tr><td colSpan={6} className="px-5 py-8 text-center text-sm text-fg-muted">Cargando…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="px-5 py-8 text-center text-sm text-fg-muted">Sin perspectivas todavía.</td></tr>
            ) : (
              rows.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-3 text-sm font-medium text-fg">{p.title}</td>
                  <td className="px-5 py-3"><Badge>{TYPE_LABEL[p.content_type]}</Badge></td>
                  <td className="px-5 py-3 text-sm text-fg-muted">{p.pillar_code ?? "—"}</td>
                  <td className="px-5 py-3">
                    <Badge variant={p.published_at ? "success" : "default"}>
                      {p.published_at ? "Publicado" : "Borrador"}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-sm text-fg-muted">
                    {new Date(p.updated_at).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => togglePublish(p)}>
                        {p.published_at ? "Despublicar" : "Publicar"}
                      </Button>
                      <button
                        type="button"
                        aria-label="Editar"
                        onClick={() => router.push(`/admin/perspectivas/${p.id}` as Route)}
                        className="rounded-md p-1.5 text-fg-muted hover:bg-bg-sunken hover:text-fg"
                      >
                        <Pencil size={16} strokeWidth={1.75} />
                      </button>
                      <button
                        type="button"
                        aria-label="Eliminar"
                        onClick={() => void remove(p.id)}
                        className="rounded-md p-1.5 text-fg-muted hover:bg-bg-sunken hover:text-danger"
                      >
                        <Trash2 size={16} strokeWidth={1.75} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      <Dialog open={newOpen} onClose={() => setNewOpen(false)} title="Nueva perspectiva">
        <div className="flex flex-col gap-3">
          <p className="text-sm text-fg-muted">Elegí el tipo de contenido:</p>
          {(["blog", "article", "business_case", "whitepaper"] as PerspectiveContentType[]).map((t) => (
            <Button key={t} variant="secondary" disabled={creating} onClick={() => void createNew(t)}>
              {TYPE_LABEL[t]}
            </Button>
          ))}
        </div>
      </Dialog>
    </main>
  );
}

export default function PerspectivasAdminPage() {
  return (
    <SuperadminGate>
      <PerspectivasAdminInner />
    </SuperadminGate>
  );
}
