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
    // business_case
    org_client_name: "", industry: "", challenge: "", solution: "", metrics: "",
    // whitepaper
    pdf_url: "", abstract: "", gated_email_required: false,
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
          org_client_name: data.business_case?.org_client_name ?? "",
          industry: data.business_case?.industry ?? "",
          challenge: data.business_case?.challenge ?? "",
          solution: data.business_case?.solution ?? "",
          metrics: (data.business_case?.metrics ?? [])
            .map((m) => `${m.label ?? ""}: ${m.value ?? ""}`)
            .join("\n"),
          pdf_url: data.whitepaper?.pdf_url ?? "",
          abstract: data.whitepaper?.abstract ?? "",
          gated_email_required: data.whitepaper?.gated_email_required ?? false,
        });
      })
      .catch(() => toast("No pudimos cargar la perspectiva.", "danger"));
  }, [id]);

  const set = (k: keyof typeof f, v: string) => setF((prev) => ({ ...prev, [k]: v }));

  async function save(): Promise<Perspective | null> {
    if (!p) return null;
    setSaving(true);
    try {
      const base = {
        title: f.title, subtitle: f.subtitle || null, slug: f.slug || undefined,
        cover_image_url: f.cover_image_url || null, pillar_code: f.pillar_code || null,
        author_name: f.author_name || null, author_avatar_url: f.author_avatar_url || null,
        tags: f.tags.split(",").map((t) => t.trim()).filter(Boolean),
        body_markdown: f.body_markdown || null,
        read_minutes_estimated: f.read_minutes ? Number(f.read_minutes) : null,
      };
      const bc = p.content_type === "business_case"
        ? {
            org_client_name: f.org_client_name || null, industry: f.industry || null,
            challenge: f.challenge || null, solution: f.solution || null,
            metrics: f.metrics.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
              const idx = l.indexOf(":");
              return idx >= 0
                ? { label: l.slice(0, idx).trim(), value: l.slice(idx + 1).trim() }
                : { label: l, value: "" };
            }),
          }
        : {};
      const wp = p.content_type === "whitepaper"
        ? { pdf_url: f.pdf_url || null, abstract: f.abstract || null, gated_email_required: f.gated_email_required }
        : {};
      const updated = await apiUpdatePerspective(id, { ...base, ...bc, ...wp });
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
        <Display variant="display-3">
          {{ blog: "Blog", article: "Artículo", business_case: "Business Case", whitepaper: "Whitepaper" }[p.content_type]}
        </Display>
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

        {p.content_type === "business_case" && (
          <div className="flex flex-col gap-5 rounded-lg border border-border p-4">
            <p className="font-sans text-micro uppercase tracking-meta text-fg-muted">Business Case</p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="client">Cliente</Label>
                <Input id="client" value={f.org_client_name} onChange={(e) => set("org_client_name", e.target.value)} placeholder="Empresa cliente (o «redactado»)" />
              </div>
              <div>
                <Label htmlFor="industry">Industria</Label>
                <Input id="industry" value={f.industry} onChange={(e) => set("industry", e.target.value)} />
              </div>
            </div>
            <div>
              <Label htmlFor="challenge">Desafío</Label>
              <textarea id="challenge" rows={3} value={f.challenge} onChange={(e) => set("challenge", e.target.value)}
                className="w-full rounded-md border border-border bg-bg-raised px-3 py-2 font-sans text-sm text-fg focus:border-primary focus:outline-none focus:ring-2 focus:ring-hg-amber/40" />
            </div>
            <div>
              <Label htmlFor="solution">Solución</Label>
              <textarea id="solution" rows={3} value={f.solution} onChange={(e) => set("solution", e.target.value)}
                className="w-full rounded-md border border-border bg-bg-raised px-3 py-2 font-sans text-sm text-fg focus:border-primary focus:outline-none focus:ring-2 focus:ring-hg-amber/40" />
            </div>
            <div>
              <Label htmlFor="metrics">Métricas (una por línea, formato «etiqueta: valor»)</Label>
              <textarea id="metrics" rows={3} value={f.metrics} onChange={(e) => set("metrics", e.target.value)}
                placeholder={"Retención: +12%\nTiempo de ramp-up: -30%"}
                className="w-full rounded-md border border-border bg-bg-raised px-3 py-2 font-mono text-sm text-fg focus:border-primary focus:outline-none focus:ring-2 focus:ring-hg-amber/40" />
            </div>
          </div>
        )}

        {p.content_type === "whitepaper" && (
          <div className="flex flex-col gap-5 rounded-lg border border-border p-4">
            <p className="font-sans text-micro uppercase tracking-meta text-fg-muted">Whitepaper</p>
            <div>
              <Label htmlFor="pdf">PDF (URL) — requerido para publicar</Label>
              <Input id="pdf" value={f.pdf_url} onChange={(e) => set("pdf_url", e.target.value)} placeholder="https://cdn.humangrowth.io/wp/…" />
            </div>
            <div>
              <Label htmlFor="abstract">Abstract</Label>
              <textarea id="abstract" rows={4} value={f.abstract} onChange={(e) => set("abstract", e.target.value)}
                className="w-full rounded-md border border-border bg-bg-raised px-3 py-2 font-sans text-sm text-fg focus:border-primary focus:outline-none focus:ring-2 focus:ring-hg-amber/40" />
            </div>
            <label className="flex items-center gap-2 text-sm text-fg">
              <input type="checkbox" checked={f.gated_email_required}
                onChange={(e) => setF((prev) => ({ ...prev, gated_email_required: e.target.checked }))}
                className="h-4 w-4" />
              Requiere email para descargar (gated)
            </label>
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
