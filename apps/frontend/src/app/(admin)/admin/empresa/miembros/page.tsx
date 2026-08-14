"use client";

import { Plus, Upload } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import * as React from "react";

import { CompanyAdminGate } from "@/components/CompanyAdminGate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Display } from "@/components/ui/display";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Input, Label } from "@/components/ui/input";
import { apiCompanyInvite, apiCompanyMembers, apiCompanyOrgs, ApiError } from "@/lib/api";
import { toast } from "@/lib/toast-store";
import type { CompanyMember, CompanyOrg } from "@/lib/types";

function MembersContent() {
  // Superadmin puede scopear a una empresa con ?company_id (vista de empresa
  // seleccionada, CE-06). El company_admin lo omite → su propia empresa.
  const companyId = useSearchParams().get("company_id") ?? undefined;
  const [members, setMembers] = React.useState<CompanyMember[] | null>(null);
  const [orgs, setOrgs] = React.useState<CompanyOrg[]>([]);
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState({ org_id: "", email: "", name: "", role: "collaborator" });
  const [submitting, setSubmitting] = React.useState(false);

  const load = React.useCallback(() => {
    apiCompanyMembers(companyId)
      .then(setMembers)
      .catch(() => setMembers([]));
    apiCompanyOrgs(companyId)
      .then(setOrgs)
      .catch(() => setOrgs([]));
  }, [companyId]);
  React.useEffect(load, [load]);

  async function onInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!form.org_id || !form.email.trim()) {
      toast("Elegí una organización y un email.", "danger");
      return;
    }
    setSubmitting(true);
    try {
      await apiCompanyInvite(
        form.org_id,
        { email: form.email.trim(), role: form.role, name: form.name.trim() || undefined },
        companyId,
      );
      toast("Invitación enviada.", "success");
      setOpen(false);
      setForm({ org_id: "", email: "", name: "", role: "collaborator" });
      load();
    } catch (err) {
      toast(
        err instanceof ApiError ? err.message : "No se pudo enviar la invitación.",
        "danger",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-app px-5 py-10 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow accent>Empresa</Eyebrow>
          <Display variant="display-3" className="mt-1">
            Miembros
          </Display>
        </div>
        <div className="flex gap-3">
          <Link href={"/admin/empresa/importar" as Route}>
            <Button variant="secondary">
              <Upload size={18} strokeWidth={1.75} />
              Importar Excel
            </Button>
          </Link>
          <Button onClick={() => setOpen(true)}>
            <Plus size={18} strokeWidth={1.75} />
            Invitar
          </Button>
        </div>
      </div>

      <Card className="mt-8 overflow-x-auto overflow-y-hidden p-0">
        <table className="w-full text-left">
          <thead className="border-b border-border bg-bg-sunken">
            <tr className="font-sans text-micro uppercase tracking-meta text-fg-muted">
              <th className="px-5 py-3 font-semibold">Nombre</th>
              <th className="px-5 py-3 font-semibold">Organización</th>
              <th className="px-5 py-3 font-semibold">Rol</th>
              <th className="px-5 py-3 font-semibold">Estado</th>
              <th className="px-5 py-3 font-semibold">Módulos</th>
              <th className="px-5 py-3 font-semibold">Assessment</th>
            </tr>
          </thead>
          <tbody>
            {members?.map((m) => {
              const dims = Object.keys(m.dimension_states).length;
              return (
                <tr key={m.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-3">
                    <div className="font-sans text-sm font-semibold text-fg">{m.full_name}</div>
                    <div className="font-mono text-xs text-fg-muted">{m.email}</div>
                  </td>
                  <td className="px-5 py-3 text-sm text-fg-muted">{m.org_name}</td>
                  <td className="px-5 py-3">
                    <Badge>{m.role}</Badge>
                  </td>
                  <td className="px-5 py-3">
                    {m.is_active ? (
                      <Badge variant="success">Activo</Badge>
                    ) : (
                      <Badge variant="default">Inactivo</Badge>
                    )}
                  </td>
                  <td className="px-5 py-3 font-mono text-sm text-fg">
                    {m.modules_completed} ✓ · {m.modules_in_progress} ⋯
                  </td>
                  <td className="px-5 py-3 text-sm text-fg-muted">
                    {dims > 0 ? `${dims} dimensiones` : "sin datos"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {members && members.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-fg-muted">
            Todavía no hay miembros. Invitá o importá desde Excel.
          </p>
        ) : null}
        {members === null ? (
          <p className="px-5 py-10 text-center text-sm text-fg-muted">Cargando…</p>
        ) : null}
      </Card>

      <p className="mt-3 text-xs text-fg-muted">
        El estado del assessment por dimensión solo se muestra si el colaborador aceptó el
        consentimiento de privacidad; si no, aparece &ldquo;sin datos&rdquo;.
      </p>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Invitar miembro"
        description="Se envía un email de invitación a la organización elegida."
      >
        <form onSubmit={onInvite} className="flex flex-col gap-4" noValidate>
          <div>
            <Label htmlFor="org">Organización</Label>
            <select
              id="org"
              value={form.org_id}
              onChange={(e) => setForm({ ...form, org_id: e.target.value })}
              className="h-10 w-full rounded-md border border-border bg-bg-raised px-3 font-sans text-sm text-fg focus:border-primary focus:outline-none focus:ring-2 focus:ring-hg-amber/40"
            >
              <option value="">Elegí una organización…</option>
              {orgs.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="name">Nombre (opcional)</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="role">Rol</Label>
            <select
              id="role"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="h-10 w-full rounded-md border border-border bg-bg-raised px-3 font-sans text-sm text-fg focus:border-primary focus:outline-none focus:ring-2 focus:ring-hg-amber/40"
            >
              <option value="collaborator">Colaborador</option>
              <option value="manager">Manager</option>
            </select>
          </div>
          <div className="mt-2 flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Enviando…" : "Enviar invitación"}
            </Button>
          </div>
        </form>
      </Dialog>
    </main>
  );
}

export default function CompanyMembersPage() {
  return (
    <CompanyAdminGate>
      <React.Suspense fallback={null}>
        <MembersContent />
      </React.Suspense>
    </CompanyAdminGate>
  );
}
