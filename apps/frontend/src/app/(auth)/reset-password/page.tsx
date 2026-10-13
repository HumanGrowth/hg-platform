"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Display } from "@/components/ui/display";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Input, Label } from "@/components/ui/input";
import { ApiError, apiResetPassword, apiValidateResetToken } from "@/lib/api";
import { toast } from "@/lib/toast-store";
import { resetPasswordSchema, type ResetPasswordValues as FormValues } from "@/lib/validation";

function ResetPasswordInner() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";

  const [tokenState, setTokenState] = React.useState<"checking" | "ok" | "invalid">("checking");
  const [formError, setFormError] = React.useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(resetPasswordSchema) });

  React.useEffect(() => {
    if (!token) {
      setTokenState("invalid");
      return;
    }
    apiValidateResetToken(token)
      .then(() => setTokenState("ok"))
      .catch(() => setTokenState("invalid"));
  }, [token]);

  async function onSubmit(values: FormValues) {
    setFormError(null);
    try {
      await apiResetPassword(token, values.password);
      toast("Contraseña actualizada — iniciá sesión con la nueva.", "success");
      router.replace("/login");
    } catch (err) {
      if (err instanceof ApiError && err.status === 410) {
        setTokenState("invalid");
        return;
      }
      setFormError("No pudimos actualizar la contraseña. Probá de nuevo.");
    }
  }

  if (tokenState === "invalid") {
    return (
      <Card className="p-8">
        <Eyebrow className="mb-2">Recuperar contraseña</Eyebrow>
        <Display variant="display-3" className="mb-3">
          Enlace no válido
        </Display>
        <p className="mb-6 text-fg-muted">
          Este enlace venció, ya se usó o no es correcto. Pedí uno nuevo.
        </p>
        <Link href="/forgot-password" className="font-semibold text-primary hover:underline">
          Pedir un enlace nuevo
        </Link>
      </Card>
    );
  }

  return (
    <Card className="p-8 md:p-10">
      <Eyebrow accent className="mb-2">
        Human Growth
      </Eyebrow>
      <Display variant="display-3" className="mb-6">
        Elegí tu nueva contraseña
      </Display>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <div>
          <Label htmlFor="password">Nueva contraseña</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            aria-invalid={!!errors.password}
            {...register("password")}
          />
          {errors.password ? (
            <p className="mt-1 text-xs text-danger">{errors.password.message}</p>
          ) : (
            <p className="mt-1 text-xs text-fg-subtle">Mínimo 6 caracteres.</p>
          )}
        </div>
        <div>
          <Label htmlFor="confirm">Repetí la contraseña</Label>
          <Input
            id="confirm"
            type="password"
            autoComplete="new-password"
            aria-invalid={!!errors.confirm}
            {...register("confirm")}
          />
          {errors.confirm ? (
            <p className="mt-1 text-xs text-danger">{errors.confirm.message}</p>
          ) : null}
        </div>

        {formError ? (
          <p role="alert" className="rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">
            {formError}
          </p>
        ) : null}

        <Button
          type="submit"
          size="lg"
          disabled={isSubmitting || tokenState !== "ok"}
          className="mt-2 w-full"
        >
          {isSubmitting ? "Guardando…" : "Guardar contraseña"}
        </Button>
      </form>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <React.Suspense fallback={<p className="text-center text-fg-muted">Cargando…</p>}>
      <ResetPasswordInner />
    </React.Suspense>
  );
}
