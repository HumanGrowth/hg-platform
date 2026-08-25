"use client";

import { ChevronDown, FileEdit, ListFilter, Plus, Trash2, Upload } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import * as React from "react";

import { CompanyAdminGate } from "@/components/CompanyAdminGate";
import { SelectPopover } from "@/components/admin/SelectPopover";
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
import { cn } from "@/lib/utils";

const ROLE_OPTIONS = [
  { value: "collaborator", label: "Colaborador" },
  { value: "manager", label: "Manager" },
  { value: "admin", label: "Admin" },
];
const ESTADO_OPTIONS = [
  { value: "active", label: "Activo" },
  { value: "inactive", label: "Inactivo" },
];
const ROLE_CHIP: Record<string, string> = {
  collaborator: "bg-bg-sunken text-fg-muted",
  manager: "bg-warning-bg text-warning",
  admin: "bg-hg-green-100 text-primary",
};

/** Chip con la opción actual (rol/estado); la flecha aparece si es editable. */
function ValueChip({
  label,
  tone,
  open,
  editable,
}: {
  label: string;
  tone: string;
  open: boolean;
  editable: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
        tone,
      )}
    >
      {label}
      {editable && (
        <ChevronDown
          size={13}
          strokeWidth={2}
          className={cn("transition-transform", open && "rotate-180")}
        />
      )}
    </span>
  );
}

/** Texto plano (organización/manager) con flecha de "editable" al costado. */
function ValueText({
  label,
  open,
  editable,
  muted,
}: {
  label: string;
  open: boolean;
  editable: boolean;
  muted?: boolean;
}) {
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1 text-sm", muted ? "text-fg-muted" : "text-fg")}>
      <span className="truncate">{label}</span>
      {editable && (
        <ChevronDown
          size={14}
          strokeWidth={1.75}
          className={cn("shrink-0 text-fg-subtle transition-transform", open && "rotate-180")}
        />
      )}
    </span>
  );
}

/** Header que abre un filtro de columna; se resalta cuando el filtro está activo. */
function HeaderFilterLabel({ label, active }: { label: string; active: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-1", active ? "text-primary" : "text-fg-muted")}>
      {label}
      <ListFilter size={12} strokeWidth={2} className={active ? "text-primary" : "text-fg-subtle"} />
    </span>
  );
}

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

      {/* Solo búsqueda arriba; los filtros por columna viven en los headers. */}
      <div className="mt-6">
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
              <th className="px-4 py-3 font-semibold">
                <SelectPopover
                  value={orgF}
                  menuLabel="Filtrar por organización"
                  options={[{ value: "", label: "Todas las orgs" }, ...orgs.map((o) => ({ value: o.id, label: o.name }))]}
                  onSelect={setOrgF}
                  renderTrigger={() => <HeaderFilterLabel label="Organización" active={Boolean(orgF)} />}
                />
              </th>
              <th className="px-4 py-3 font-semibold">
                <SelectPopover
                  value={roleF}
                  menuLabel="Filtrar por rol"
                  options={[{ value: "", label: "Todos los roles" }, ...ROLE_OPTIONS]}
                  onSelect={setRoleF}
                  renderTrigger={() => <HeaderFilterLabel label="Rol" active={Boolean(roleF)} />}
                />
              </th>
              <th className="px-4 py-3 font-semibold">Manager</th>
              <th className="px-4 py-3 font-semibold">
                <SelectPopover
                  value={statusF}
                  menuLabel="Filtrar por estado"
                  options={[
                    { value: "all", label: "Todos" },
                    { value: "active", label: "Activos" },
                    { value: "inactive", label: "Inactivos" },
                  ]}
                  onSelect={(v) => setStatusF(v as "all" | "active" | "inactive")}
                  renderTrigger={() => <HeaderFilterLabel label="Estado" active={statusF !== "all"} />}
                />
              </th>
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
                  <td className="max-w-[12rem] px-4 py-3">
                    <SelectPopover
                      value={m.org_id}
                      disabled={!editable || busy}
                      menuLabel={`Organización de ${m.full_name}`}
                      options={orgs.map((o) => ({ value: o.id, label: o.name }))}
                      onSelect={(v) => patchMember(m, { org_id: v }, "Organización actualizada.")}
                      renderTrigger={({ open, label }) => (
                        <ValueText label={label} open={open} editable={editable} />
                      )}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <SelectPopover
                      value={m.role}
                      disabled={!editable || busy}
                      menuLabel={`Rol de ${m.full_name}`}
                      options={
                        ROLE_OPTIONS.some((r) => r.value === m.role)
                          ? ROLE_OPTIONS
                          : [...ROLE_OPTIONS, { value: m.role, label: m.role }]
                      }
                      onSelect={(v) => patchMember(m, { role: v }, "Rol actualizado.")}
                      renderTrigger={({ open, label }) => (
                        <ValueChip
                          label={label}
                          open={open}
                          editable={editable}
                          tone={ROLE_CHIP[m.role] ?? "bg-bg-sunken text-fg-muted"}
                        />
                      )}
                    />
                  </td>
                  <td className="max-w-[12rem] px-4 py-3">
                    <SelectPopover
                      value={m.manager_id ?? ""}
                      disabled={!editable || busy}
                      menuLabel={`Manager de ${m.full_name}`}
                      options={[
                        { value: "", label: "— sin manager —" },
                        ...managerOptions.map((u) => ({ value: u.id, label: u.full_name })),
                      ]}
                      onSelect={(v) =>
                        patchMember(m, { manager_id: v || null }, "Manager actualizado.")
                      }
                      renderTrigger={({ open, label }) => (
                        <ValueText label={label} open={open} editable={editable} muted={!m.manager_id} />
                      )}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <SelectPopover
                      value={m.is_active ? "active" : "inactive"}
                      disabled={!editable || busy}
                      menuLabel={`Estado de ${m.full_name}`}
                      options={ESTADO_OPTIONS}
                      onSelect={(v) =>
                        patchMember(
                          m,
                          { is_active: v === "active" },
                          v === "active" ? "Reactivado." : "Desactivado.",
                        )
                      }
                      renderTrigger={({ open, label }) => (
                        <ValueChip
                          label={label}
                          open={open}
                          editable={editable}
                          tone={m.is_active ? "bg-hg-green-100 text-primary" : "bg-bg-sunken text-fg-muted"}
                        />
                      )}
                    />
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
