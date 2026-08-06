"use client";

import { ArrowLeft, ExternalLink } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import * as React from "react";

import { ImageUploader } from "@/components/admin/ImageUploader";
import { MarkdownEditor } from "@/components/admin/MarkdownEditor";
import { SuperadminGate } from "@/components/SuperadminGate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Display } from "@/components/ui/display";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  apiAdminGetPerspective,
  apiPublishPerspective,
  apiUpdatePerspective,
} from "@/lib/api";
import { PILLARS } from "@/lib/pillars";
import { toast } from "@/lib/toast-store";
import type { Perspective } from "@/lib/types";

function EditorInner() {
  const id = String(useParams().id);
  const router = useRouter();
  const [p, setP] = React.useState<Perspective | null>(null);
  const [saving, setSaving] = React.useState(false);

  // form state
  const [f, setF] = React.useState({
    title: "", subtitle: "", slug: "", cover_image_url: "", pillar_code: "",
    author_name: "", author_avatar_url: "", tags: "", body_markdown: "", read_minutes: "",
  });

  React.useEffect(() => {
    apiAdminGetPerspective(id)
      .then((data) => {
        setP(data);
        setF({
          title: data.title, subtitle: data.subtitle ?? "", slug: data.slug,
          cover_image_url: data.cover_image_url ?? "", pillar_code: data.pillar_code ?? "",
          author_name: data.author_name ?? "", author_avatar_url: data.author_avatar_url ?? "",
          tags: (data.tags ?? []).join(", "), body_markdown: data.body_markdown ?? "",
          read_minutes: data.read_minutes_estimated?.toString() ?? "",
        });
      })
      .catch(() => toast("No pudimos cargar la perspectiva.", "danger"));
  }, [id]);

  const set = (k: keyof typeof f, v: string) => setF((prev) => ({ ...prev, [k]: v }));

  async function save(): Promise<Perspective | null> {
    setSaving(true);
    try {
      const updated = await apiUpdatePerspective(id, {
        title: f.title, subtitle: f.subtitle || null, slug: f.slug || undefined,
        cover_image_url: f.cover_image_url || null, pillar_code: f.pillar_code || null,
        author_name: f.author_name || null, author_avatar_url: f.author_avatar_url || null,
        tags: f.tags.split(",").map((t) => t.trim()).filter(Boolean),
        body_markdown: f.body_markdown || null,
        read_minutes_estimated: f.read_minutes ? Number(f.read_minutes) : null,
      });
      setP(updated);
      toast("Guardado.", "success");
      return updated;
    } catch {
      toast("No pudimos guardar.", "danger");
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish() {
    const saved = await save();
    if (!saved) return;
    try {
      const res = await apiPublishPerspective(id, saved.published_at === null);
      setP(res);
      toast(res.published_at ? "Publicado." : "Despublicado.", "success");
    } catch {
      toast("No pudimos cambiar el estado.", "danger");
    }
  }

  if (!p) return <main className="mx-auto max-w-app px-8 py-10 text-sm text-fg-muted">Cargando…</main>;

  return (
    <main className="mx-auto w-full max-w-app px-8 py-10">
      <button
        type="button"
        onClick={() => router.push("/admin/perspectivas" as Route)}
        className="mb-4 inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg"
      >
        <ArrowLeft size={16} strokeWidth={1.75} /> Perspectivas
      </button>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Display variant="display-3">{p.content_type === "article" ? "Artículo" : "Blog"}</Display>
        <div className="flex items-center gap-2">
          <Badge variant={p.published_at ? "success" : "default"}>
            {p.published_at ? "Publicado" : "Borrador"}
          </Badge>
          {p.published_at && (
            <Link
              href={`/perspectivas/${p.slug}` as Route}
              target="_blank"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              Ver <ExternalLink size={14} strokeWidth={1.75} />
            </Link>
          )}
          <Button variant="secondary" onClick={() => void togglePublish()}>
            {p.published_at ? "Despublicar" : "Publicar"}
          </Button>
          <Button onClick={() => void save()} disabled={saving}>
            {saving ? "Guardando…" : "Guardar"}
          </Button>
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-5">
        <div>
          <Label htmlFor="title">Título</Label>
          <Input id="title" value={f.title} onChange={(e) => set("title", e.target.value)} />
        </div>
        <div>
          <Label htmlFor="subtitle">Bajada</Label>
          <Input id="subtitle" value={f.subtitle} onChange={(e) => set("subtitle", e.target.value)} />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="slug">Slug</Label>
            <Input id="slug" value={f.slug} onChange={(e) => set("slug", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="pillar">Pilar (opcional)</Label>
            <Select id="pillar" value={f.pillar_code} onChange={(e) => set("pillar_code", e.target.value)}>
              <option value="">Sin pilar</option>
              {PILLARS.map((pl) => (
                <option key={pl.id} value={pl.id}>{pl.name}</option>
              ))}
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="author">Autor</Label>
            <Input id="author" value={f.author_name} onChange={(e) => set("author_name", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="tags">Tags (separados por coma)</Label>
            <Input id="tags" value={f.tags} onChange={(e) => set("tags", e.target.value)} placeholder="liderazgo, carrera" />
          </div>
        </div>
        {p.content_type === "article" && (
          <div className="max-w-[240px]">
            <Label htmlFor="rm">Minutos de lectura</Label>
            <Input id="rm" type="number" value={f.read_minutes} onChange={(e) => set("read_minutes", e.target.value)} />
          </div>
        )}
        <div>
          <Label>Imagen de portada</Label>
          <ImageUploader value={f.cover_image_url} onChange={(url) => set("cover_image_url", url)} />
        </div>
        <div>
          <Label>Contenido (Markdown)</Label>
          <MarkdownEditor value={f.body_markdown} onChange={(v) => set("body_markdown", v)} />
        </div>
      </div>
    </main>
  );
}

export default function PerspectivaEditorPage() {
  return (
    <SuperadminGate>
      <EditorInner />
    </SuperadminGate>
  );
}
