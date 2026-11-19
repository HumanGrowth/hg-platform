"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import * as React from "react";

import { NotificationPreferencesSection } from "@/components/perfil/NotificationPreferencesSection";
import { PasswordSection } from "@/components/perfil/PasswordSection";
import { Button } from "@/components/ui/button";
import { Display } from "@/components/ui/display";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Input, Label } from "@/components/ui/input";
import { apiUpdateMe } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { toast } from "@/lib/toast-store";

export default function PerfilEditarPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const setSession = useAuthStore((s) => s.setSession);

  const [fullName, setFullName] = React.useState(user?.full_name ?? "");
  const [jobTitle, setJobTitle] = React.useState(user?.job_title ?? "");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (user) {
      setFullName(user.full_name);
      setJobTitle(user.job_title ?? "");
    }
  }, [user]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) return;
    setSaving(true);
    try {
      const updated = await apiUpdateMe({ full_name: fullName.trim(), job_title: jobTitle || null });
      if (accessToken) setSession(updated, accessToken);
      toast("Datos actualizados.", "success");
      router.push("/perfil");
    } catch {
      toast("No pudimos guardar tus cambios.", "danger");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-xl px-6 py-10">
      <Eyebrow accent>Mi Perfil</Eyebrow>
      <Display variant="display-3" className="mt-1 mb-6">
        Editar mi información
      </Display>

      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        <div>
          <Label htmlFor="full_name">Nombre completo</Label>
          <Input
            id="full_name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            maxLength={255}
            required
          />
        </div>

        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" value={user?.email ?? ""} disabled readOnly />
          <p className="mt-1 text-xs text-fg-muted">El email se cambia desde administración.</p>
        </div>

        <div>
          <Label htmlFor="job_title">Cargo</Label>
          <Input
            id="job_title"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            maxLength={120}
            placeholder="Ej: Product Designer"
          />
        </div>

        <div>
          <Label htmlFor="career_level">Nivel de carrera</Label>
          <Input id="career_level" value={user?.career_level ?? "—"} disabled readOnly />
          <p className="mt-1 text-xs text-fg-muted">Lo asigna tu manager.</p>
        </div>

        <div className="mt-2 flex items-center gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? "Guardando…" : "Guardar cambios"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push("/perfil" as Route)}
          >
            Cancelar
          </Button>
        </div>
      </form>

      <div className="mt-8 flex flex-col gap-5">
        <NotificationPreferencesSection />
        <PasswordSection />
      </div>
    </main>
  );
}
