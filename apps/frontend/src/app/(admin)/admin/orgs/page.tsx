"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useForm } from "react-hook-form";

import { SuperadminGate } from "@/components/SuperadminGate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Display } from "@/components/ui/display";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Input, Label } from "@/components/ui/input";
import { apiCreateOrg, apiListOrgs, ApiError } from "@/lib/api";
import { toast } from "@/lib/toast-store";
import type { Org } from "@/lib/types";
import { createOrgSchema, type CreateOrgValues } from "@/lib/validation";

function AdminOrgsContent() {
  const router = useRouter();
  const [orgs, setOrgs] = React.useState<Org[] | null>(null);
  const [open, setOpen] = React.useState(false);

  const load = React.useCallback(() => {
    apiListOrgs()
      .then((r) => setOrgs(r.items))
      .catch(() => setOrgs([]));
  }, []);
  React.useEffect(load, [load]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateOrgValues>({
    resolver: zodResolver(createOrgSchema),
    defaultValues: { tier: "B", licenses_total: 10 },
  });

  async function onCreate(values: CreateOrgValues) {
    try {
      await apiCreateOrg({
        name: values.name,
        slug: values.slug,
        tier: values.tier,
        country: values.country || undefined,
        licenses_total: values.licenses_total,
      });
      toast("Organización creada.", "success");
      setOpen(false);
      reset();
      load();
    } catch (err) {
      toast(
        err instanceof ApiError && err.status === 409
          ? "Ese slug ya existe."
          : "No se pudo crear la organización.",
        "danger",
      );
    }
  }

  return (
    <main className="mx-auto w-full max-w-app px-8 py-10">
      <div className="flex items-end justify-between">
        <div>
          <Eyebrow accent>Panel HG</Eyebrow>
          <Display variant="display-3" className="mt-1">
            Organizaciones
          </Display>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus size={18} strokeWidth={1.75} />
          Nueva organización
        </Button>
      </div>

      <Card className="mt-8 overflow-hidden p-0">
        <table className="w-full text-left">
          <thead className="border-b border-border bg-bg-sunken">
            <tr className="font-sans text-micro uppercase tracking-meta text-fg-muted">
              <th className="px-5 py-3 font-semibold">Nombre</th>
              <th className="px-5 py-3 font-semibold">Slug</th>
              <th className="px-5 py-3 font-semibold">Tier</th>
              <th className="px-5 py-3 font-semibold">Licencias</th>
              <th className="px-5 py-3 font-semibold">Estado</th>
            </tr>
          </thead>
          <tbody>
            {orgs?.map((o) => (
              <tr
                key={o.id}
                onClick={() => router.push(`/admin/orgs/${o.id}`)}
                className="cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-bg-sunken"
              >
                <td className="px-5 py-3 font-sans text-sm font-semibold text-fg">{o.name}</td>
                <td className="px-5 py-3 font-mono text-xs text-fg-muted">{o.slug}</td>
                <td className="px-5 py-3">
                  <Badge>{o.tier}</Badge>
                </td>
                <td className="px-5 py-3 font-mono text-sm text-fg">
                  {o.licenses_used}/{o.licenses_total}
                </td>
                <td className="px-5 py-3 text-sm text-fg-muted">{o.billing_status}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {orgs && orgs.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-fg-muted">Todavía no hay organizaciones.</p>
        ) : null}
        {orgs === null ? (
          <p className="px-5 py-10 text-center text-sm text-fg-muted">Cargando…</p>
        ) : null}
      </Card>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Nueva organización"
        description="Solo el superadmin de HG puede crearla."
      >
        <form onSubmit={handleSubmit(onCreate)} className="flex flex-col gap-4" noValidate>
          <div>
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" {...register("name")} />
            {errors.name ? <p className="mt-1 text-xs text-danger">{errors.name.message}</p> : null}
          </div>
          <div>
            <Label htmlFor="slug">Slug</Label>
            <Input id="slug" placeholder="acme" {...register("slug")} />
            {errors.slug ? <p className="mt-1 text-xs text-danger">{errors.slug.message}</p> : null}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="country">País</Label>
              <Input id="country" maxLength={2} placeholder="AR" {...register("country")} />
            </div>
            <div>
              <Label htmlFor="tier">Tier</Label>
              <select
                id="tier"
                {...register("tier")}
                className="h-10 w-full rounded-md border border-border bg-bg-raised px-3 font-sans text-sm text-fg focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/40"
              >
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
              </select>
            </div>
            <div>
              <Label htmlFor="licenses_total">Licencias</Label>
              <Input id="licenses_total" type="number" min={0} {...register("licenses_total")} />
            </div>
          </div>
          <div className="mt-2 flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creando…" : "Crear"}
            </Button>
          </div>
        </form>
      </Dialog>
    </main>
  );
}

export default function AdminOrgsPage() {
  return (
    <SuperadminGate>
      <AdminOrgsContent />
    </SuperadminGate>
  );
}
