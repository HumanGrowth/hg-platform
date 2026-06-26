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
import { ApiError, apiLogin } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { toast } from "@/lib/toast-store";
import { loginSchema, type LoginValues as FormValues } from "@/lib/validation";

const schema = loginSchema;

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const setSession = useAuthStore((s) => s.setSession);
  const [formError, setFormError] = React.useState<string | null>(null);

  // Tras una sesión expirada el interceptor redirige con ?reason=expired:
  // mostramos el toast acá porque el full reload limpió el del momento.
  React.useEffect(() => {
    if (params.get("reason") === "expired") {
      toast("Sesión expirada — iniciá sesión otra vez.", "danger");
    }
  }, [params]);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setFormError(null);
    try {
      const { user, accessToken } = await apiLogin(values.email, values.password);
      setSession(user, accessToken);
      router.replace("/home");
    } catch (err) {
      setFormError(
        err instanceof ApiError && err.status === 401
          ? "Email o contraseña incorrectos."
          : "No pudimos iniciar sesión. Probá de nuevo.",
      );
    }
  }

  return (
    <Card className="p-8">
      <Eyebrow accent className="mb-2">
        Human Growth
      </Eyebrow>
      <Display variant="display-3" className="mb-6">
        Bienvenido/a
      </Display>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
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

        <div>
          <Label htmlFor="password">Contraseña</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            aria-invalid={!!errors.password}
            {...register("password")}
          />
          {errors.password ? (
            <p className="mt-1 text-xs text-danger">{errors.password.message}</p>
          ) : null}
        </div>

        {formError ? (
          <p role="alert" className="rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">
            {formError}
          </p>
        ) : null}

        <Button type="submit" size="lg" disabled={isSubmitting} className="mt-2 w-full">
          {isSubmitting ? "Entrando…" : "Iniciar sesión"}
        </Button>

        {/* TODO: reactivar cuando exista flow de recovery (B3-07).
        <button
          type="button"
          className="mt-1 self-start text-sm text-fg-muted underline-offset-2 hover:underline"
          onClick={() => setFormError("Pedile a tu admin que te reenvíe la invitación.")}
        >
          Olvidé mi contraseña
        </button>
        */}
      </form>

      <p className="mt-6 text-center text-sm text-fg-muted">
        ¿No tenés cuenta?{" "}
        <Link href="/contacto" className="font-semibold text-orange-700 hover:underline">
          Solicitá unirte
        </Link>
      </p>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense fallback={null}>
      <LoginInner />
    </React.Suspense>
  );
}
