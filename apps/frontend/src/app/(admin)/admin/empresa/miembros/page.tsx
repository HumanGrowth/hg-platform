"use client";

import { FileEdit, Plus, Trash2, Upload } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import * as React from "react";

import { CompanyAdminGate } from "@/components/CompanyAdminGate";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Display } from "@/components/ui/display";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Input, Label } from "@/components/ui/input";
import { useScopedCompanyId } from "@/lib/acting-company";
import {
  apiCompanyInvite,
  apiCompanyMembers,
  apiCompanyOrgs,
  apiDeleteUser,
  apiUpdateCompanyMember,
  ApiError,
} from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { toast } from "@/lib/toast-store";
import type { CompanyMember, CompanyOrg } from "@/lib/types";

const ROLE_OPTIONS = [
  { value: "collaborator", label: "Colaborador" },
  { value: "manager", label: "Manager" },
  { value: "admin", label: "Admin" },
];

const CELL_SELECT =
  "h-8 w-full min-w-[7rem] rounded-md border border-border bg-bg-raised px-2 font-sans text-sm text-fg focus:border-primary focus:outline-none focus:ring-2 focus:ring-hg-amber/40 disabled:opacity-50";

function MembersContent() {
  // Superadmin gestiona la empresa que eligió (contexto acting-company); el
  // company_admin lo omite → su propia empresa. CE-06.
  const { companyId, ready } = useScopedCompanyId();
  const me = useAuthStore((s) => s.user);
  const isSuperadmin = me?.role === "superadmin";

  const [members, setMembers] = React.useState<CompanyMember[] | null>(null);
  const [orgs, setOrgs] = React.useState<CompanyOrg[]>([]);
  const [savingId, setSavingId] = React.useState<string | null>(null);

  // Filtros + búsqueda (client-side).
  const [statusF, setStatusF] = React.useState<"all" | "active" | "inactive">("all");
  const [roleF, setRoleF] = React.useState("");
  const [orgF, setOrgF] = React.useState("");
  const [query, setQuery] = React.useState("");

  // Invitar.
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState({ org_id: "", email: "", name: "", role: "collaborator" });
  const [submitting, setSubmitting] = React.useState(false);

  // Eliminar (solo superadmin).
  const [deleteModal, setDeleteModal] = React.useState<CompanyMember | null>(null);
  const [confirmEmail, setConfirmEmail] = React.useState("");
  const [deleting, setDeleting] = React.useState(false);

  const load = React.useCallback(() => {
    if (!ready) return;
    apiCompanyMembers(companyId)
      .then(setMembers)
      .catch(() => setMembers([]));
    apiCompanyOrgs(companyId)
      .then(setOrgs)
      .catch(() => setOrgs([]));
  }, [companyId, ready]);
  React.useEffect(load, [load]);

  // Un miembro no puede editarse a sí mismo (rol/org/manager/estado/borrado).
  const canEdit = React.useCallback((m: CompanyMember) => m.id !== me?.id, [me]);

  async function patchMember(
    m: CompanyMember,
    body: { org_id?: string; manager_id?: string | null; is_active?: boolean; role?: string },
    okMsg: string,
  ) {
    setSavingId(m.id);
    try {
      await apiUpdateCompanyMember(m.id, body, companyId);
      toast(okMsg, "success");
      load();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "No se pudo actualizar.", "danger");
      load(); // revierte el select a su valor real
    } finally {
      setSavingId(null);
    }
  }

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
      toast(err instanceof ApiError ? err.message : "No se pudo enviar la invitación.", "danger");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteModal) return;
    setDeleting(true);
    try {
      await apiDeleteUser(deleteModal.id);
      toast("Usuario eliminado definitivamente.", "success");
      setDeleteModal(null);
      setConfirmEmail("");
      load();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "No se pudo eliminar el usuario.", "danger");
    } finally {
      setDeleting(false);
    }
  }

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return (members ?? []).filter((m) => {
      if (statusF === "active" && !m.is_active) return false;
      if (statusF === "inactive" && m.is_active) return false;
      if (roleF && m.role !== roleF) return false;
      if (orgF && m.org_id !== orgF) return false;
      if (q && !m.full_name.toLowerCase().includes(q) && !m.email.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [members, statusF, roleF, orgF, query]);

  if (!ready) return null; // superadmin sin empresa elegida → el hook redirige al selector.

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

      {/* Filtros + búsqueda */}
      <div className="mt-6 flex flex-wrap gap-3">
        <select
          aria-label="Estado"
          value={statusF}
          onChange={(e) => setStatusF(e.target.value as "all" | "active" | "inactive")}
          className="h-9 rounded-md border border-border bg-bg-raised px-3 font-sans text-sm text-fg focus:border-primary focus:outline-none"
        >
          <option value="all">Todos los estados</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
        </select>
        <select
          aria-label="Rol"
          value={roleF}
          onChange={(e) => setRoleF(e.target.value)}
          className="h-9 rounded-md border border-border bg-bg-raised px-3 font-sans text-sm text-fg focus:border-primary focus:outline-none"
        >
          <option value="">Todos los roles</option>
          {ROLE_OPTIONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
        <select
          aria-label="Organización"
          value={orgF}
          onChange={(e) => setOrgF(e.target.value)}
          className="h-9 rounded-md border border-border bg-bg-raised px-3 font-sans text-sm text-fg focus:border-primary focus:outline-none"
        >
          <option value="">Todas las organizaciones</option>
          {orgs.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
        <Input
          type="search"
          placeholder="Buscar por nombre o email…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-9 max-w-xs"
        />
      </div>

      <Card className="mt-4 overflow-x-auto overflow-y-hidden p-0">
        <table className="w-full min-w-[52rem] text-left">
          <thead className="border-b border-border bg-bg-sunken">
            <tr className="font-sans text-micro uppercase tracking-meta text-fg-muted">
              <th className="px-4 py-3 font-semibold">Nombre</th>
              <th className="px-4 py-3 font-semibold">Organización</th>
              <th className="px-4 py-3 font-semibold">Rol</th>
              <th className="px-4 py-3 font-semibold">Manager</th>
              <th className="px-4 py-3 font-semibold">Estado</th>
              <th className="px-4 py-3 font-semibold">Módulos</th>
              <th className="px-4 py-3 text-right font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => {
              const editable = canEdit(m);
              const busy = savingId === m.id;
              // Managers candidatos: activos de la MISMA org, distintos del propio.
              const managerOptions = (members ?? []).filter(
                (u) => u.org_id === m.org_id && u.id !== m.id && u.is_active,
              );
              return (
                <tr key={m.id} className="border-b border-border last:border-0 align-middle">
                  <td className="px-4 py-3">
                    <div className="font-sans text-sm font-semibold text-fg">{m.full_name}</div>
                    <div className="break-all font-mono text-xs text-fg-muted">{m.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      aria-label={`Organización de ${m.full_name}`}
                      className={CELL_SELECT}
                      value={m.org_id}
                      disabled={!editable || busy}
                      onChange={(e) =>
                        patchMember(m, { org_id: e.target.value }, "Organización actualizada.")
                      }
                    >
                      {orgs.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      aria-label={`Rol de ${m.full_name}`}
                      className={CELL_SELECT}
                      value={m.role}
                      disabled={!editable || busy}
                      onChange={(e) => patchMember(m, { role: e.target.value }, "Rol actualizado.")}
                    >
                      {ROLE_OPTIONS.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                      {/* Rol actual fuera del set editable (ej. company_admin legado). */}
                      {!ROLE_OPTIONS.some((r) => r.value === m.role) && (
                        <option value={m.role}>{m.role}</option>
                      )}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      aria-label={`Manager de ${m.full_name}`}
                      className={CELL_SELECT}
                      value={m.manager_id ?? ""}
                      disabled={!editable || busy}
                      onChange={(e) =>
                        patchMember(
                          m,
                          { manager_id: e.target.value || null },
                          "Manager actualizado.",
                        )
                      }
                    >
                      <option value="">— sin manager —</option>
                      {managerOptions.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.full_name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      aria-label={`Estado de ${m.full_name}`}
                      className={CELL_SELECT}
                      value={m.is_active ? "active" : "inactive"}
                      disabled={!editable || busy}
                      onChange={(e) =>
                        patchMember(
                          m,
                          { is_active: e.target.value === "active" },
                          e.target.value === "active" ? "Reactivado." : "Desactivado.",
                        )
                      }
                    >
                      <option value="active">Activo</option>
                      <option value="inactive">Inactivo</option>
                    </select>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-sm text-fg">
                    {m.modules_completed} ✓ · {m.modules_in_progress} ⋯
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={
                          `/admin/org/users/${m.id}/assignments?name=${encodeURIComponent(m.full_name)}` as Route
                        }
                        aria-label={`Asignar módulos a ${m.full_name}`}
                        title="Asignar módulos"
                        className="rounded-md p-1.5 text-fg-muted hover:bg-bg-sunken hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hg-amber"
                      >
                        <FileEdit size={16} strokeWidth={1.75} />
                      </Link>
                      {isSuperadmin && editable && (
                        <button
                          type="button"
                          aria-label={`Eliminar a ${m.full_name}`}
                          title="Eliminar usuario"
                          onClick={() => {
                            setConfirmEmail("");
                            setDeleteModal(m);
                          }}
                          className="rounded-md p-1.5 text-danger hover:bg-danger/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/40"
                        >
                          <Trash2 size={16} strokeWidth={1.75} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {members && filtered.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-fg-muted">
            {members.length === 0
              ? "Todavía no hay miembros. Invitá o importá desde Excel."
              : "No hay miembros con estos filtros."}
          </p>
        ) : null}
        {members === null ? (
          <p className="px-5 py-10 text-center text-sm text-fg-muted">Cargando…</p>
        ) : null}
      </Card>

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

      {/* Borrado DEFINITIVO — solo superadmin, con confirmación por email. */}
      <Dialog
        open={deleteModal !== null}
        onClose={() => {
          setDeleteModal(null);
          setConfirmEmail("");
        }}
        title="Eliminar usuario"
        description="Acción irreversible: borra al usuario y TODOS sus datos (evaluaciones, progreso, badges, consentimientos…)."
      >
        {deleteModal ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-fg-muted">
              Para confirmar, escribí el email{" "}
              <span className="font-semibold text-fg">{deleteModal.email}</span>.
            </p>
            <Label htmlFor="confirm-email" className="sr-only">
              Email de confirmación
            </Label>
            <Input
              id="confirm-email"
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              placeholder={deleteModal.email}
              autoComplete="off"
            />
            <div className="flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setDeleteModal(null);
                  setConfirmEmail("");
                }}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                disabled={
                  deleting || confirmEmail.trim().toLowerCase() !== deleteModal.email.toLowerCase()
                }
                onClick={handleDelete}
              >
                Eliminar definitivamente
              </Button>
            </div>
          </div>
        ) : null}
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
