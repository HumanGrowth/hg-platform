"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import * as React from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Display } from "@/components/ui/display";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Input, Label } from "@/components/ui/input";
import { apiForgotPassword } from "@/lib/api";
import { forgotPasswordSchema, type ForgotPasswordValues as FormValues } from "@/lib/validation";

export default function ForgotPasswordPage() {
  const [sentTo, setSentTo] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(forgotPasswordSchema) });

  async function onSubmit(values: FormValues) {
    setFormError(null);
    try {
      await apiForgotPassword(values.email.trim());
      setSentTo(values.email.trim());
    } catch {
      setFormError("No pudimos procesar la solicitud. Probá de nuevo en unos minutos.");
    }
  }

  return (
    <Card className="p-8 md:p-10">
      <Eyebrow accent className="mb-2">
        Human Growth
      </Eyebrow>
      <Display variant="display-3" className="mb-3">
        Recuperá tu contraseña
      </Display>

      {sentTo ? (
        <div className="flex flex-col gap-4">
          <p role="status" className="rounded-md bg-success-bg px-3 py-2 text-sm text-success">
            Si <span className="font-semibold">{sentTo}</span> tiene una cuenta activa, te
            enviamos un enlace para elegir una nueva contraseña. Vence en 60 minutos.
          </p>
          <p className="text-sm text-fg-muted">
            ¿No lo ves? Revisá spam o promociones. Si sigue sin llegar, pedile a tu admin que
            verifique tu correo.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <p className="text-sm text-fg-muted">
            Ingresá el email de tu cuenta y te mandamos un enlace para restablecerla.
          </p>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="nombre@empresa.com"
              aria-invalid={!!errors.email}
              {...register("email")}
            />
            {errors.email ? (
              <p className="mt-1 text-xs text-danger">{errors.email.message}</p>
            ) : null}
          </div>

          {formError ? (
            <p role="alert" className="rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">
              {formError}
            </p>
          ) : null}

          <Button type="submit" size="lg" disabled={isSubmitting} className="mt-2 w-full">
            {isSubmitting ? "Enviando…" : "Enviar enlace"}
          </Button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-fg-muted">
        <Link href="/login" className="font-semibold text-primary hover:underline">
          Volver a iniciar sesión
        </Link>
      </p>
    </Card>
  );
}
