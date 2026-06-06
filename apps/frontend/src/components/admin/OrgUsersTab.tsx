"use client";

import { MoreHorizontal } from "lucide-react";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Label } from "@/components/ui/input";
import { apiListOrgUsers, apiUpdateUser } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { toast } from "@/lib/toast-store";
import type { AdminUser, Org, UserRole } from "@/lib/types";

const ROLE_OPTIONS: UserRole[] = ["admin", "manager", "collaborator"];
const PAGE_SIZE = 50;

function fmtDate(v: string | null): string {
  return v ? new Date(v).toLocaleDateString() : "—";
}

export function OrgUsersTab({ org, onMutated }: { org: Org | null; onMutated: () => void }) {
  const me = useAuthStore((s) => s.user);
  const orgId = org?.id;
  const [data, setData] = React.useState<{ items: AdminUser[]; total: number } | null>(null);
  const [statusF, setStatusF] = React.useState("all");
  const [roleF, setRoleF] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [menuFor, setMenuFor] = React.useState<string | null>(null);
  const [roleModal, setRoleModal] = React.useState<AdminUser | null>(null);
  const [mgrModal, setMgrModal] = React.useState<AdminUser | null>(null);

  const load = React.useCallback(() => {
    if (!orgId) return;
    apiListOrgUsers(orgId, {
      status: statusF,
      role: roleF || undefined,
      page,
      page_size: PAGE_SIZE,
    })
      .then(setData)
      .catch(() => setData({ items: [], total: 0 }));
  }, [orgId, statusF, roleF, page]);
  React.useEffect(load, [load]);

  const nameById = React.useMemo(() => {
    const m = new Map<string, string>();
    data?.items.forEach((u) => m.set(u.id, u.full_name));
    return m;
  }, [data]);

  const noLicenses = !!org && org.licenses_used >= org.licenses_total;

  async function mutate(userId: string, payload: Partial<AdminUser>, ok: string) {
    try {
      await apiUpdateUser(userId, payload);
      toast(ok, "success");
      setMenuFor(null);
      setRoleModal(null);
      setMgrModal(null);
      load();
      onMutated(); // refresca la card de la org (licencias)
    } catch (e) {
      const detail =
        (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "No se pudo actualizar.";
      toast(detail, "danger");
    }
  }

  const canActOn = (u: AdminUser) =>
    !(me?.role !== "superadmin" && u.id === me?.id); // admin no se toca a sí mismo

  return (
    <div>
      {noLicenses ? (
        <div className="mb-4">
          <Badge variant="warning">
            Sin licencias disponibles · no puedes reactivar usuarios
          </Badge>
        </div>
      ) : null}

      {/* Filtros */}
      <div className="mb-4 flex flex-wrap gap-3">
        <select
          aria-label="Estado"
          value={statusF}
          onChange={(e) => {
            setPage(1);
            setStatusF(e.target.value);
          }}
          className="h-9 rounded-md border border-border bg-bg-raised px-3 font-sans text-sm text-fg focus:border-orange-500 focus:outline-none"
        >
          <option value="all">Todos</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
        </select>
        <select
          aria-label="Rol"
          value={roleF}
          onChange={(e) => {
            setPage(1);
            setRoleF(e.target.value);
          }}
          className="h-9 rounded-md border border-border bg-bg-raised px-3 font-sans text-sm text-fg focus:border-orange-500 focus:outline-none"
        >
          <option value="">Todos los roles</option>
          {ROLE_OPTIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      <Card className="overflow-visible p-0">
        <table className="w-full text-left">
          <thead className="border-b border-border bg-bg-sunken">
            <tr className="font-sans text-micro uppercase tracking-meta text-fg-muted">
              <th className="px-5 py-3 font-semibold">Usuario</th>
              <th className="px-5 py-3 font-semibold">Rol</th>
              <th className="px-5 py-3 font-semibold">Nivel</th>
              <th className="px-5 py-3 font-semibold">Manager</th>
              <th className="px-5 py-3 font-semibold">Última actividad</th>
              <th className="px-5 py-3 font-semibold">Estado</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {data?.items.map((u) => (
              <tr key={u.id} className="border-b border-border last:border-0">
                <td className="px-5 py-3">
                  <div className="font-sans text-sm font-semibold text-fg">{u.full_name}</div>
                  <div className="font-sans text-xs text-fg-muted">{u.email}</div>
                </td>
                <td className="px-5 py-3">
                  <Badge>{u.role}</Badge>
                </td>
                <td className="px-5 py-3 text-sm text-fg-muted">{u.career_level ?? "—"}</td>
                <td className="px-5 py-3 text-sm text-fg-muted">
                  {u.manager_id ? (nameById.get(u.manager_id) ?? "—") : "—"}
                </td>
                <td className="px-5 py-3 font-mono text-xs text-fg-muted">
                  {fmtDate(u.last_active_at)}
                </td>
                <td className="px-5 py-3">
                  <Badge variant={u.is_active ? "success" : "default"}>
                    {u.is_active ? "activo" : "inactivo"}
                  </Badge>
                </td>
                <td className="relative px-5 py-3 text-right">
                  {canActOn(u) ? (
                    <button
                      type="button"
                      aria-label="Acciones"
                      onClick={() => setMenuFor(menuFor === u.id ? null : u.id)}
                      className="rounded-md p-1 text-fg-muted hover:bg-bg-sunken hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                    >
                      <MoreHorizontal size={18} strokeWidth={1.75} />
                    </button>
                  ) : (
                    <span title="No puedes modificar tu propia cuenta" className="text-fg-subtle">
                      —
                    </span>
                  )}
                  {menuFor === u.id ? (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setMenuFor(null)} />
                      <div
                        role="menu"
                        className="absolute right-5 z-50 mt-1 w-52 rounded-lg border border-border bg-bg-raised p-2 text-left shadow-md"
                      >
                        <button
                          type="button"
                          disabled={!u.is_active && noLicenses}
                          onClick={() =>
                            mutate(
                              u.id,
                              { is_active: !u.is_active },
                              u.is_active ? "Usuario desactivado." : "Usuario reactivado.",
                            )
                          }
                          className="block w-full rounded-md px-3 py-2 text-left font-sans text-sm text-fg hover:bg-bg-sunken disabled:opacity-40"
                        >
                          {u.is_active ? "Desactivar" : "Reactivar"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setMenuFor(null);
                            setRoleModal(u);
                          }}
                          className="block w-full rounded-md px-3 py-2 text-left font-sans text-sm text-fg hover:bg-bg-sunken"
                        >
                          Cambiar rol
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setMenuFor(null);
                            setMgrModal(u);
                          }}
                          className="block w-full rounded-md px-3 py-2 text-left font-sans text-sm text-fg hover:bg-bg-sunken"
                        >
                          Reasignar manager
                        </button>
                      </div>
                    </>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data && data.items.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-fg-muted">
            No hay usuarios con estos filtros.
          </p>
        ) : null}
        {data === null ? (
          <p className="px-5 py-12 text-center text-sm text-fg-muted">Cargando…</p>
        ) : null}
      </Card>

      {/* Paginación */}
      {data && data.total > PAGE_SIZE ? (
        <div className="mt-4 flex items-center justify-between text-sm text-fg-muted">
          <span>
            {data.total} usuarios · página {page}
          </span>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Anterior
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page * PAGE_SIZE >= data.total}
              onClick={() => setPage((p) => p + 1)}
            >
              Siguiente
            </Button>
          </div>
        </div>
      ) : null}

      {/* Modal cambiar rol */}
      <Dialog
        open={!!roleModal}
        onClose={() => setRoleModal(null)}
        title="Cambiar rol"
        description={roleModal?.full_name}
      >
        <div className="flex flex-col gap-4">
          <div>
            <Label htmlFor="new-role">Nuevo rol</Label>
            <select
              id="new-role"
              defaultValue={roleModal?.role}
              className="h-10 w-full rounded-md border border-border bg-bg-raised px-3 font-sans text-sm text-fg focus:border-orange-500 focus:outline-none"
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setRoleModal(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                const el = document.getElementById("new-role") as HTMLSelectElement | null;
                if (roleModal && el)
                  mutate(roleModal.id, { role: el.value as UserRole }, "Rol actualizado.");
              }}
            >
              Guardar
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Modal reasignar manager */}
      <Dialog
        open={!!mgrModal}
        onClose={() => setMgrModal(null)}
        title="Reasignar manager"
        description={mgrModal?.full_name}
      >
        <div className="flex flex-col gap-4">
          <div>
            <Label htmlFor="new-mgr">Manager (misma organización)</Label>
            <select
              id="new-mgr"
              defaultValue={mgrModal?.manager_id ?? ""}
              className="h-10 w-full rounded-md border border-border bg-bg-raised px-3 font-sans text-sm text-fg focus:border-orange-500 focus:outline-none"
            >
              <option value="">— sin manager —</option>
              {data?.items
                .filter((u) => u.id !== mgrModal?.id && u.is_active)
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name} ({u.role})
                  </option>
                ))}
            </select>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setMgrModal(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                const el = document.getElementById("new-mgr") as HTMLSelectElement | null;
                if (mgrModal && el)
                  mutate(
                    mgrModal.id,
                    { manager_id: el.value ? el.value : null },
                    "Manager actualizado.",
                  );
              }}
            >
              Guardar
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
