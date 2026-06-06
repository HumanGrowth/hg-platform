"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Display } from "@/components/ui/display";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Input, Label } from "@/components/ui/input";
import { ApiError, apiAcceptInvite, apiInviteInfo } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import type { InviteInfo } from "@/lib/types";
import { acceptInviteSchema, type AcceptInviteValues as FormValues } from "@/lib/validation";

const schema = acceptInviteSchema;

function AcceptInviteInner() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const setSession = useAuthStore((s) => s.setSession);

  const [info, setInfo] = React.useState<InviteInfo | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  React.useEffect(() => {
    if (!token) {
      setLoadError("Falta el token de invitación.");
      return;
    }
    apiInviteInfo(token)
      .then(setInfo)
      .catch(() => setLoadError("Esta invitación no existe o ya no es válida."));
  }, [token]);

  async function onSubmit(values: FormValues) {
    setFormError(null);
    try {
      const { user, accessToken } = await apiAcceptInvite(token, values.password, values.fullName);
      setSession(user, accessToken);
      router.replace("/home");
    } catch (err) {
      setFormError(
        err instanceof ApiError && err.status === 410
          ? "Esta invitación expiró o ya fue usada."
          : "No pudimos crear la cuenta. Probá de nuevo.",
      );
    }
  }

  if (loadError) {
    return (
      <Card className="p-8">
        <Eyebrow className="mb-2">Invitación</Eyebrow>
        <Display variant="display-3" className="mb-3">
          Link no válido
        </Display>
        <p className="text-fg-muted">{loadError}</p>
      </Card>
    );
  }

  const invalidStatus = info && info.status !== "pending";

  return (
    <Card className="p-8">
      <Eyebrow accent className="mb-2">
        {info ? info.org_name : "Cargando…"}
      </Eyebrow>
      <Display variant="display-3" className="mb-3">
        Creá tu cuenta
      </Display>
      {info ? (
        <p className="mb-6 text-sm text-fg-muted">
          Invitación para <span className="font-semibold text-fg">{info.email}</span> · rol{" "}
          {info.role}.
        </p>
      ) : null}

      {invalidStatus ? (
        <p role="alert" className="rounded-md bg-warning-bg px-3 py-2 text-sm text-warning">
          Esta invitación está {info?.status}. Pedile a tu admin una nueva.
        </p>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <div>
            <Label htmlFor="fullName">Nombre completo</Label>
            <Input id="fullName" autoComplete="name" {...register("fullName")} />
            {errors.fullName ? (
              <p className="mt-1 text-xs text-danger">{errors.fullName.message}</p>
            ) : null}
          </div>
          <div>
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              {...register("password")}
            />
            {errors.password ? (
              <p className="mt-1 text-xs text-danger">{errors.password.message}</p>
            ) : (
              <p className="mt-1 text-xs text-fg-subtle">Mínimo 10 caracteres.</p>
            )}
          </div>

          {formError ? (
            <p role="alert" className="rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">
              {formError}
            </p>
          ) : null}

          <Button type="submit" size="lg" disabled={isSubmitting || !info} className="mt-2 w-full">
            {isSubmitting ? "Creando…" : "Crear cuenta"}
          </Button>
        </form>
      )}
    </Card>
  );
}

export default function AcceptInvitePage() {
  return (
    <React.Suspense fallback={<p className="text-center text-fg-muted">Cargando…</p>}>
      <AcceptInviteInner />
    </React.Suspense>
  );
}
