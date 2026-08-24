"use client";

/**
 * Organización — ABM de las organizaciones de la Empresa (unidad operativa,
 * CE-06). Separado de Miembros (/admin/empresa/miembros). Lista las orgs y
 * permite crear nuevas (apiCreateCompanyOrg). company_admin ve las suyas;
 * superadmin gestiona la empresa que eligió (contexto acting-company).
 */
import { LineChart, Plus } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import * as React from "react";

import { CompanyAdminGate } from "@/components/CompanyAdminGate";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Display } from "@/components/ui/display";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Input, Label } from "@/components/ui/input";
import { setActingOrg } from "@/lib/acting-org";
import { useScopedCompanyId } from "@/lib/acting-company";
import {
  apiCompanyOrgs,
  apiCreateCompanyOrg,
  apiGetMyCompany,
  apiSetOrgQuota,
  ApiError,
} from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { toast } from "@/lib/toast-store";
import type { Company, CompanyOrg } from "@/lib/types";

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
  const router = useRouter();
  // Solo el superadmin puede abrir el dashboard RRHH de una org (OrgAdminGate).
  const isSuperadmin = useAuthStore((s) => s.user?.role) === "superadmin";
  const [orgs, setOrgs] = React.useState<CompanyOrg[] | null>(null);
  const [company, setCompany] = React.useState<Company | null>(null);
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState({ name: "", slug: "", country: "", quota: "0" });
  const [slugEdited, setSlugEdited] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  // Edición inline del cupo por org: { [orgId]: valorEnEdición }.
  const [quotaEdit, setQuotaEdit] = React.useState<Record<string, string>>({});
  const [savingQuota, setSavingQuota] = React.useState<string | null>(null);

  const load = React.useCallback(() => {
    if (!ready) return;
    apiCompanyOrgs(companyId)
      .then(setOrgs)
      .catch(() => setOrgs([]));
    apiGetMyCompany(companyId)
      .then(setCompany)
      .catch(() => setCompany(null));
  }, [companyId, ready]);
  React.useEffect(load, [load]);

  const assigned = (orgs ?? []).reduce((s, o) => s + o.license_quota, 0);
  const pool = company?.licenses_total ?? 0;
  const available = Math.max(pool - assigned, 0);

  async function saveQuota(orgId: string) {
    const raw = quotaEdit[orgId];
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0) {
      toast("Ingresá un cupo válido.", "danger");
      return;
    }
    setSavingQuota(orgId);
    try {
      await apiSetOrgQuota(orgId, value, companyId);
      toast("Cupo actualizado.", "success");
      setQuotaEdit((q) => {
        const next = { ...q };
        delete next[orgId];
        return next;
      });
      load();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "No se pudo actualizar el cupo.", "danger");
    } finally {
      setSavingQuota(null);
    }
  }

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
      await apiCreateCompanyOrg(
        { name, slug, country: form.country.trim() || null, license_quota: Number(form.quota) || 0 },
        companyId,
      );
      toast("Organización creada.", "success");
      setOpen(false);
      setForm({ name: "", slug: "", country: "", quota: "0" });
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

      {/* Resumen del pool de licencias de la empresa (CE-07). */}
      {company && (
        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-border bg-bg-raised px-5 py-4">
          <div>
            <span className="font-mono text-2xl font-semibold text-fg">{assigned}</span>
            <span className="font-mono text-lg text-fg-muted"> / {pool}</span>
            <span className="ml-2 text-sm text-fg-muted">licencias asignadas</span>
          </div>
          <div className="h-2 min-w-[8rem] flex-1 overflow-hidden rounded-full bg-bg-sunken">
            <div
              className={pool > 0 && assigned > pool ? "h-full bg-danger" : "h-full bg-primary"}
              style={{ width: `${pool > 0 ? Math.min((assigned / pool) * 100, 100) : 0}%` }}
            />
          </div>
          <span className="text-sm font-semibold text-fg">{available} disponibles</span>
        </div>
      )}

      <Card className="mt-6 overflow-x-auto overflow-y-hidden p-0">
        <table className="w-full min-w-[38rem] text-left">
          <thead className="border-b border-border bg-bg-sunken">
            <tr className="font-sans text-micro uppercase tracking-meta text-fg-muted">
              <th className="px-5 py-3 font-semibold">Nombre</th>
              <th className="px-5 py-3 font-semibold">País</th>
              <th className="px-5 py-3 font-semibold">Miembros</th>
              <th className="px-5 py-3 font-semibold">Cupo (licencias)</th>
              {isSuperadmin && <th className="px-5 py-3 font-semibold">Dashboard</th>}
            </tr>
          </thead>
          <tbody>
            {orgs?.map((o) => {
              const editing = quotaEdit[o.id] !== undefined;
              const overCapacity = o.user_count > o.license_quota;
              return (
              <tr key={o.id} className="border-b border-border last:border-0">
                <td className="px-5 py-3">
                  <div className="font-sans text-sm font-semibold text-fg">{o.name}</div>
                  <div className="font-mono text-xs text-fg-muted">{o.slug}</div>
                </td>
                <td className="px-5 py-3 text-sm text-fg-muted">{o.country ?? "—"}</td>
                <td className="px-5 py-3 font-mono text-sm tabular-nums text-fg">{o.user_count}</td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      value={editing ? quotaEdit[o.id] : String(o.license_quota)}
                      onChange={(e) =>
                        setQuotaEdit((q) => ({ ...q, [o.id]: e.target.value }))
                      }
                      className="h-8 w-20 rounded-md border border-border bg-bg-raised px-2 font-mono text-sm text-fg tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hg-amber"
                    />
                    {editing && (
                      <Button
                        size="sm"
                        onClick={() => void saveQuota(o.id)}
                        disabled={savingQuota === o.id}
                      >
                        {savingQuota === o.id ? "…" : "Guardar"}
                      </Button>
                    )}
                    {!editing && overCapacity && (
                      <span
                        title="Hay más miembros que el cupo asignado"
                        className="rounded-full bg-warning-bg px-2 py-0.5 text-[10px] font-semibold text-warning"
                      >
                        excedido
                      </span>
                    )}
                  </div>
                </td>
                {isSuperadmin && (
                  <td className="px-5 py-3">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        // Scopea el dashboard RRHH a esta org (acting-org) y lo abre.
                        setActingOrg({ id: o.id, name: o.name });
                        router.push("/admin/org" as Route);
                      }}
                    >
                      <LineChart size={14} strokeWidth={1.75} />
                      Ver dashboard
                    </Button>
                  </td>
                )}
              </tr>
              );
            })}
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
          <div>
            <Label htmlFor="org-quota">Cupo de licencias</Label>
            <Input
              id="org-quota"
              type="number"
              min={0}
              value={form.quota}
              onChange={(e) => setForm((f) => ({ ...f, quota: e.target.value }))}
            />
            <p className="mt-1 text-xs text-fg-muted">
              {available} disponibles del pool de la empresa.
            </p>
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
