"use client";

import { KeyRound, LogIn, Plus } from "lucide-react";
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
import { Input, Label } from "@/components/ui/input";
import {
  apiCreateCompany,
  apiGetCompanyAccess,
  apiListAreas,
  apiListCompanies,
  apiSetCompanyAccess,
  ApiError,
} from "@/lib/api";
import { setActingCompany } from "@/lib/acting-company";
import { toast } from "@/lib/toast-store";
import type { Area, Company } from "@/lib/types";

function CompaniesContent() {
  const router = useRouter();
  const [companies, setCompanies] = React.useState<Company[] | null>(null);
  const [areas, setAreas] = React.useState<Area[]>([]);
  const [openCreate, setOpenCreate] = React.useState(false);
  const [form, setForm] = React.useState({ name: "", slug: "", licenses_total: 50 });
  const [submitting, setSubmitting] = React.useState(false);

  // Access editor
  const [accessFor, setAccessFor] = React.useState<Company | null>(null);
  const [enabled, setEnabled] = React.useState<Set<string>>(new Set());
  const [savingAccess, setSavingAccess] = React.useState(false);

  const load = React.useCallback(() => {
    apiListCompanies()
      .then(setCompanies)
      .catch(() => setCompanies([]));
    apiListAreas()
      .then(setAreas)
      .catch(() => setAreas([]));
  }, []);
  React.useEffect(load, [load]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiCreateCompany({
        name: form.name.trim(),
        slug: form.slug.trim(),
        licenses_total: form.licenses_total,
      });
      toast("Empresa creada.", "success");
      setOpenCreate(false);
      setForm({ name: "", slug: "", licenses_total: 50 });
      load();
    } catch (err) {
      toast(
        err instanceof ApiError && err.status === 409
          ? "Ese slug ya existe."
          : "No se pudo crear la empresa.",
        "danger",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function openAccess(company: Company) {
    setAccessFor(company);
    setEnabled(new Set());
    try {
      const access = await apiGetCompanyAccess(company.id);
      setEnabled(new Set(access.area_codes));
    } catch {
      toast("No se pudo cargar el acceso de la empresa.", "danger");
    }
  }

  async function saveAccess() {
    if (!accessFor) return;
    setSavingAccess(true);
    try {
      await apiSetCompanyAccess(accessFor.id, [...enabled]);
      toast("Acceso actualizado.", "success");
      setAccessFor(null);
    } catch {
      toast("No se pudo guardar el acceso.", "danger");
    } finally {
      setSavingAccess(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-app px-5 py-10 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow accent>Panel HG</Eyebrow>
          <Display variant="display-3" className="mt-1">
            Empresas
          </Display>
        </div>
        <Button onClick={() => setOpenCreate(true)}>
          <Plus size={18} strokeWidth={1.75} />
          Nueva empresa
        </Button>
      </div>

      <Card className="mt-8 overflow-x-auto overflow-y-hidden p-0">
        <table className="w-full text-left">
          <thead className="border-b border-border bg-bg-sunken">
            <tr className="font-sans text-micro uppercase tracking-meta text-fg-muted">
              <th className="px-5 py-3 font-semibold">Nombre</th>
              <th className="px-5 py-3 font-semibold">Slug</th>
              <th className="px-5 py-3 font-semibold">Orgs</th>
              <th className="px-5 py-3 font-semibold">Licencias (pool)</th>
              <th className="px-5 py-3 font-semibold">Áreas</th>
            </tr>
          </thead>
          <tbody>
            {companies?.map((c) => (
              <tr key={c.id} className="border-b border-border last:border-0">
                <td className="px-5 py-3 font-sans text-sm font-semibold text-fg">{c.name}</td>
                <td className="px-5 py-3 font-mono text-xs text-fg-muted">{c.slug}</td>
                <td className="px-5 py-3 font-mono text-sm text-fg">{c.org_count}</td>
                <td className="px-5 py-3 font-mono text-sm text-fg">
                  {c.licenses_used}/{c.licenses_total}
                </td>
                <td className="px-5 py-3">
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        // Setea el contexto acting-company (persistente) y entra al
                        // panel de empresa; de ahí gestiona TODO reusando /admin/empresa/*.
                        setActingCompany({ id: c.id, name: c.name });
                        router.push("/admin/empresa" as Route);
                      }}
                    >
                      <LogIn size={14} strokeWidth={1.75} />
                      Gestionar
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => openAccess(c)}>
                      <KeyRound size={14} strokeWidth={1.75} />
                      Acceso
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {companies && companies.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-fg-muted">Todavía no hay empresas.</p>
        ) : null}
        {companies === null ? (
          <p className="px-5 py-10 text-center text-sm text-fg-muted">Cargando…</p>
        ) : null}
      </Card>

      <Dialog
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        title="Nueva empresa"
        description="La empresa agrupa organizaciones y define el pool de licencias."
      >
        <form onSubmit={onCreate} className="flex flex-col gap-4" noValidate>
          <div>
            <Label htmlFor="cname">Nombre</Label>
            <Input
              id="cname"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="cslug">Slug</Label>
            <Input
              id="cslug"
              placeholder="acme"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="clic">Licencias (pool)</Label>
            <Input
              id="clic"
              type="number"
              min={0}
              value={form.licenses_total}
              onChange={(e) => setForm({ ...form, licenses_total: Number(e.target.value) })}
            />
          </div>
          <div className="mt-2 flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setOpenCreate(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting || !form.name.trim() || !form.slug.trim()}>
              {submitting ? "Creando…" : "Crear"}
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={accessFor !== null}
        onClose={() => setAccessFor(null)}
        title={accessFor ? `Acceso de ${accessFor.name}` : "Acceso"}
        description="Marcá las áreas que esta empresa puede ver. El contenido general siempre es visible."
      >
        <div className="flex flex-col gap-3">
          {areas.length === 0 ? (
            <p className="text-sm text-fg-muted">No hay áreas en el catálogo.</p>
          ) : (
            areas.map((a) => (
              <label key={a.code} className="flex items-center gap-3 text-sm text-fg">
                <input
                  type="checkbox"
                  checked={enabled.has(a.code)}
                  onChange={(e) => {
                    const next = new Set(enabled);
                    if (e.target.checked) next.add(a.code);
                    else next.delete(a.code);
                    setEnabled(next);
                  }}
                  className="h-4 w-4 rounded border-border"
                />
                <span className="font-mono text-xs font-semibold">{a.code}</span>
                <span className="text-fg-muted">{a.name}</span>
                {!a.is_active ? <Badge>inactiva</Badge> : null}
              </label>
            ))
          )}
          <div className="mt-2 flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setAccessFor(null)}>
              Cancelar
            </Button>
            <Button onClick={saveAccess} disabled={savingAccess}>
              {savingAccess ? "Guardando…" : "Guardar acceso"}
            </Button>
          </div>
        </div>
      </Dialog>
    </main>
  );
}

export default function AdminCompaniesPage() {
  return (
    <SuperadminGate>
      <CompaniesContent />
    </SuperadminGate>
  );
}
