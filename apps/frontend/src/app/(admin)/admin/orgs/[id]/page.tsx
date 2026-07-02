"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Copy, Eye } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import * as React from "react";
import { useForm } from "react-hook-form";

import { OrgUsersTab } from "@/components/admin/OrgUsersTab";
import { SuperadminGate } from "@/components/SuperadminGate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Display } from "@/components/ui/display";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Input, Label } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { setActingOrg } from "@/lib/acting-org";
import { apiCreateInvite, apiListInvites, apiListOrgs, apiRevokeInvite } from "@/lib/api";
import { toast } from "@/lib/toast-store";
import type { Invitation, Org } from "@/lib/types";
import { inviteSchema, type InviteValues } from "@/lib/validation";

type Status = "pending" | "accepted" | "revoked" | "expired";

function inviteStatus(i: Invitation): Status {
  if (i.revoked_at) return "revoked";
  if (i.accepted_at) return "accepted";
  if (new Date(i.expires_at).getTime() < Date.now()) return "expired";
  return "pending";
}

const STATUS_BADGE: Record<Status, React.ComponentProps<typeof Badge>["variant"]> = {
  pending: "warning",
  accepted: "success",
  revoked: "danger",
  expired: "default",
};

function AdminOrgDetailContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const orgId = params.id;
  const [org, setOrg] = React.useState<Org | null>(null);
  const [invites, setInvites] = React.useState<Invitation[] | null>(null);
  const [open, setOpen] = React.useState(false);
  const [created, setCreated] = React.useState<{ url: string; email: string } | null>(null);

  const loadOrg = React.useCallback(() => {
    apiListOrgs().then((r) => setOrg(r.items.find((o) => o.id === orgId) ?? null));
  }, [orgId]);
  const loadInvites = React.useCallback(() => {
    apiListInvites(orgId).then(setInvites).catch(() => setInvites([]));
  }, [orgId]);
  React.useEffect(() => {
    loadOrg();
    loadInvites();
  }, [loadOrg, loadInvites]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InviteValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { role: "collaborator" },
  });

  async function onInvite(values: InviteValues) {
    try {
      const res = await apiCreateInvite(orgId, values.email, values.role);
      setCreated({ url: res.invite_url, email: res.email });
      reset();
      loadInvites();
      loadOrg();
    } catch {
      toast("No se pudo crear la invitación (¿licencias agotadas?).", "danger");
    }
  }

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      toast("Link copiado.", "success");
    } catch {
      toast("Copialo manualmente.", "default");
    }
  }

  async function revoke(id: string) {
    try {
      await apiRevokeInvite(id);
      toast("Invitación revocada.", "success");
      loadInvites();
    } catch {
      toast("No se pudo revocar.", "danger");
    }
  }

  return (
    <main className="mx-auto w-full max-w-app px-8 py-10">
      <Link
        href="/admin/orgs"
        className="mb-4 inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg"
      >
        <ArrowLeft size={16} strokeWidth={1.75} />
        Organizaciones
      </Link>

      <Eyebrow accent>Organización</Eyebrow>
      <div className="mt-1 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Display variant="display-3">{org?.name ?? "Cargando…"}</Display>
          {org ? (
            <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-fg-muted">
              <Badge>{org.tier}</Badge>
              <span className="font-mono text-xs">{org.slug}</span>
              <span>
                · {org.licenses_used}/{org.licenses_total} licencias · {org.billing_status}
              </span>
              {org.country ? <span className="text-xs">· {org.country}</span> : null}
              <span className="text-xs">
                · Creada {new Date(org.created_at).toLocaleDateString("es")}
              </span>
            </p>
          ) : null}
        </div>
        {org ? (
          <Button
            variant="secondary"
            onClick={() => {
              setActingOrg({ id: org.id, name: org.name });
              router.push("/admin/org");
            }}
          >
            <Eye size={16} strokeWidth={1.75} />
            Ver dashboard como esta org
          </Button>
        ) : null}
      </div>

      <Tabs defaultValue="usuarios" className="mt-8">
        <TabsList>
          <TabsTrigger value="usuarios">Usuarios</TabsTrigger>
          <TabsTrigger value="invitaciones">Invitaciones</TabsTrigger>
        </TabsList>

        <TabsContent value="usuarios">
          <OrgUsersTab org={org} onMutated={loadOrg} />
        </TabsContent>

        <TabsContent value="invitaciones">
          <div className="mb-4 flex justify-end">
            <Button
              onClick={() => {
                setCreated(null);
                setOpen(true);
              }}
            >
              Enviar invitación
            </Button>
          </div>
          <Card className="overflow-hidden p-0">
            <table className="w-full text-left">
              <thead className="border-b border-border bg-bg-sunken">
                <tr className="font-sans text-micro uppercase tracking-meta text-fg-muted">
                  <th className="px-5 py-3 font-semibold">Email</th>
                  <th className="px-5 py-3 font-semibold">Rol</th>
                  <th className="px-5 py-3 font-semibold">Estado</th>
                  <th className="px-5 py-3 font-semibold">Vence</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {invites?.map((i) => {
                  const st = inviteStatus(i);
                  return (
                    <tr key={i.id} className="border-b border-border last:border-0">
                      <td className="px-5 py-3 font-sans text-sm text-fg">{i.email}</td>
                      <td className="px-5 py-3 text-sm text-fg-muted">{i.role}</td>
                      <td className="px-5 py-3">
                        <Badge variant={STATUS_BADGE[st]}>{st}</Badge>
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-fg-muted">
                        {new Date(i.expires_at).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3 text-right">
                        {st === "pending" ? (
                          <Button variant="ghost" size="sm" onClick={() => revoke(i.id)}>
                            Revocar
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {invites && invites.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-fg-muted">Sin invitaciones.</p>
            ) : null}
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Enviar invitación"
        description={created ? "Copiá el link ahora — solo se muestra una vez." : org?.name}
      >
        {created ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-fg-muted">
              Invitación para <span className="font-semibold text-fg">{created.email}</span>.
            </p>
            <div className="flex items-center gap-2">
              <Input readOnly value={created.url} className="font-mono text-xs" />
              <Button variant="secondary" onClick={() => copy(created.url)}>
                <Copy size={16} strokeWidth={1.75} />
                Copiar
              </Button>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setOpen(false)}>Listo</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onInvite)} className="flex flex-col gap-4" noValidate>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="persona@empresa.com" {...register("email")} />
              {errors.email ? (
                <p className="mt-1 text-xs text-danger">{errors.email.message}</p>
              ) : null}
            </div>
            <div>
              <Label htmlFor="role">Rol</Label>
              <select
                id="role"
                {...register("role")}
                className="h-10 w-full rounded-md border border-border bg-bg-raised px-3 font-sans text-sm text-fg focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/40"
              >
                <option value="collaborator">collaborator</option>
                <option value="manager">manager</option>
                <option value="admin">admin</option>
              </select>
            </div>
            <div className="mt-2 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Enviando…" : "Crear invitación"}
              </Button>
            </div>
          </form>
        )}
      </Dialog>
    </main>
  );
}

export default function AdminOrgDetailPage() {
  return (
    <SuperadminGate>
      <AdminOrgDetailContent />
    </SuperadminGate>
  );
}
