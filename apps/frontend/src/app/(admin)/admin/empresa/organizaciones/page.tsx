"use client";

/**
 * Organización — ABM de las organizaciones de la Empresa (unidad operativa,
 * CE-06). Separado de Miembros (/admin/empresa/miembros). Lista las orgs y
 * permite crear nuevas (apiCreateCompanyOrg). company_admin ve las suyas;
 * superadmin gestiona la empresa que eligió (contexto acting-company).
 */
import { Plus } from "lucide-react";
import * as React from "react";

import { CompanyAdminGate } from "@/components/CompanyAdminGate";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Display } from "@/components/ui/display";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Input, Label } from "@/components/ui/input";
import { useScopedCompanyId } from "@/lib/acting-company";
import { apiCompanyOrgs, apiCreateCompanyOrg, ApiError } from "@/lib/api";
import { toast } from "@/lib/toast-store";
import type { CompanyOrg } from "@/lib/types";

function slugify(v: string): string {
  return v
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function OrganizacionesContent() {
  const { companyId, ready } = useScopedCompanyId();
  const [orgs, setOrgs] = React.useState<CompanyOrg[] | null>(null);
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState({ name: "", slug: "", country: "" });
  const [slugEdited, setSlugEdited] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const load = React.useCallback(() => {
    if (!ready) return;
    apiCompanyOrgs(companyId)
      .then(setOrgs)
      .catch(() => setOrgs([]));
  }, [companyId, ready]);
  React.useEffect(load, [load]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    const name = form.name.trim();
    const slug = (form.slug.trim() || slugify(name)).trim();
    if (!name || !slug) {
      toast("Completá el nombre.", "danger");
      return;
    }
    setSubmitting(true);
    try {
      await apiCreateCompanyOrg({ name, slug, country: form.country.trim() || null }, companyId);
      toast("Organización creada.", "success");
      setOpen(false);
      setForm({ name: "", slug: "", country: "" });
      setSlugEdited(false);
      load();
    } catch (err) {
      toast(
        err instanceof ApiError ? err.message : "No se pudo crear la organización.",
        "danger",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!ready) return null; // superadmin sin empresa elegida → el hook redirige al selector.

  return (
    <main className="mx-auto w-full max-w-app px-5 py-10 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow accent>Empresa</Eyebrow>
          <Display variant="display-3" className="mt-1">
            Organización
          </Display>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus size={18} strokeWidth={1.75} />
          Crear organización
        </Button>
      </div>

      <Card className="mt-8 overflow-x-auto overflow-y-hidden p-0">
        <table className="w-full min-w-[32rem] text-left">
          <thead className="border-b border-border bg-bg-sunken">
            <tr className="font-sans text-micro uppercase tracking-meta text-fg-muted">
              <th className="px-5 py-3 font-semibold">Nombre</th>
              <th className="px-5 py-3 font-semibold">País</th>
              <th className="px-5 py-3 font-semibold">Miembros</th>
            </tr>
          </thead>
          <tbody>
            {orgs?.map((o) => (
              <tr key={o.id} className="border-b border-border last:border-0">
                <td className="px-5 py-3">
                  <div className="font-sans text-sm font-semibold text-fg">{o.name}</div>
                  <div className="font-mono text-xs text-fg-muted">{o.slug}</div>
                </td>
                <td className="px-5 py-3 text-sm text-fg-muted">{o.country ?? "—"}</td>
                <td className="px-5 py-3 font-mono text-sm tabular-nums text-fg">{o.user_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {orgs && orgs.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-fg-muted">
            Todavía no hay organizaciones. Creá la primera.
          </p>
        ) : null}
        {orgs === null ? (
          <p className="px-5 py-10 text-center text-sm text-fg-muted">Cargando…</p>
        ) : null}
      </Card>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Crear organización"
        description="Una unidad operativa dentro de tu empresa (las licencias son del pool de la Empresa)."
      >
        <form onSubmit={onCreate} className="flex flex-col gap-4" noValidate>
          <div>
            <Label htmlFor="org-name">Nombre</Label>
            <Input
              id="org-name"
              value={form.name}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  name: e.target.value,
                  slug: slugEdited ? f.slug : slugify(e.target.value),
                }))
              }
            />
          </div>
          <div>
            <Label htmlFor="org-slug">Slug</Label>
            <Input
              id="org-slug"
              value={form.slug}
              onChange={(e) => {
                setSlugEdited(true);
                setForm((f) => ({ ...f, slug: e.target.value }));
              }}
            />
          </div>
          <div>
            <Label htmlFor="org-country">País (opcional)</Label>
            <Input
              id="org-country"
              value={form.country}
              onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
            />
          </div>
          <div className="mt-2 flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creando…" : "Crear"}
            </Button>
          </div>
        </form>
      </Dialog>
    </main>
  );
}

export default function OrganizacionesPage() {
  return (
    <CompanyAdminGate>
      <React.Suspense fallback={null}>
        <OrganizacionesContent />
      </React.Suspense>
    </CompanyAdminGate>
  );
}
