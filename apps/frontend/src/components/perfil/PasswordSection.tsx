"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { ApiError, apiChangePassword, apiForgotPassword, apiLogout } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { toast } from "@/lib/toast-store";
import { changePasswordSchema, type ChangePasswordValues } from "@/lib/validation";

function statusOf(err: unknown): number | undefined {
  if (err instanceof ApiError) return err.status;
  const s = (err as { response?: { status?: number } } | null)?.response?.status;
  return typeof s === "number" ? s : undefined;
}

function PasswordField({
  id,
  label,
  autoComplete,
  error,
  helpId,
  inputProps,
}: {
  id: string;
  label: string;
  autoComplete: string;
  error?: string;
  helpId?: string;
  inputProps: React.InputHTMLAttributes<HTMLInputElement>;
}) {
  const [shown, setShown] = React.useState(false);
  const errId = `${id}-error`;
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={shown ? "text" : "password"}
          autoComplete={autoComplete}
          aria-invalid={!!error}
          aria-describedby={[error ? errId : null, helpId ?? null].filter(Boolean).join(" ") || undefined}
          className="pr-11"
          {...inputProps}
        />
        <button
          type="button"
          onClick={() => setShown((v) => !v)}
          aria-label={shown ? `Ocultar ${label.toLowerCase()}` : `Mostrar ${label.toLowerCase()}`}
          aria-pressed={shown}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-md text-fg-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hg-amber/60"
        >
          {shown ? <EyeOff aria-hidden className="h-4 w-4" /> : <Eye aria-hidden className="h-4 w-4" />}
        </button>
      </div>
      {error ? (
        <p id={errId} role="alert" className="mt-1 text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Cambio de contraseña autenticado + alternativa por link (NT-02). */
export function PasswordSection() {
  const router = useRouter();
  const email = useAuthStore((s) => s.user?.email ?? "");
  const clear = useAuthStore((s) => s.clear);
  const [open, setOpen] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [linkState, setLinkState] = React.useState<"idle" | "sending" | "sent" | "error">("idle");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { current_password: "", password: "", confirm: "" },
  });

  async function onSubmit(values: ChangePasswordValues) {
    setFormError(null);
    try {
      await apiChangePassword(values.current_password, values.password);
    } catch (err) {
      const status = statusOf(err);
      if (status === 429) setFormError("Hiciste demasiados intentos. Probá de nuevo en una hora.");
      else if (status === 400)
        setFormError("La contraseña actual no es correcta, o la nueva es igual a la actual.");
      else setFormError("No pudimos cambiar tu contraseña. Probá de nuevo.");
      return;
    }
    // Éxito: el backend cerró todas las sesiones. Limpiamos campos y la sesión local.
    reset();
    setOpen(false);
    try {
      await apiLogout();
    } catch {
      // best-effort: la cookie ya no sirve igual
    }
    clear();
    toast("Cambiaste tu contraseña. Entrá de nuevo con la nueva.", "success");
    router.replace("/login" as Route);
  }

  async function sendLink() {
    setLinkState("sending");
    try {
      await apiForgotPassword(email);
      setLinkState("sent");
    } catch {
      setLinkState("error");
    }
  }

  return (
    <Card className="bg-surface-card" role="region" aria-labelledby="password-title">
      <h2 id="password-title" className="font-sans text-sm font-semibold text-fg">
        Contraseña
      </h2>

      {!open ? (
        <div className="mt-2">
          <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
            Cambiar contraseña
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-3 flex flex-col gap-4">
          <PasswordField
            id="current_password"
            label="Contraseña actual"
            autoComplete="current-password"
            error={errors.current_password?.message}
            inputProps={register("current_password")}
          />
          <PasswordField
            id="new_password"
            label="Nueva contraseña"
            autoComplete="new-password"
            error={errors.password?.message}
            helpId="new_password-help"
            inputProps={register("password")}
          />
          <p id="new_password-help" className="-mt-2 text-xs text-fg-muted">
            Mínimo 6 caracteres.
          </p>
          <PasswordField
            id="confirm_password"
            label="Repetir la nueva contraseña"
            autoComplete="new-password"
            error={errors.confirm?.message}
            inputProps={register("confirm")}
          />

          {formError ? (
            <p role="alert" className="rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">
              {formError}
            </p>
          ) : null}

          <p className="text-xs text-fg-muted">
            Al cambiarla cerramos tu sesión en todos tus dispositivos y vas a tener que entrar de
            nuevo.
          </p>

          <div className="flex items-center gap-3">
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting ? "Cambiando…" : "Cambiar contraseña"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={isSubmitting}
              onClick={() => {
                reset();
                setFormError(null);
                setOpen(false);
              }}
            >
              Cancelar
            </Button>
          </div>
        </form>
      )}

      <div className="mt-4 border-t border-border pt-3">
        <p className="text-xs text-fg-muted">¿No recordás tu contraseña actual?</p>
        <button
          type="button"
          onClick={() => void sendLink()}
          disabled={linkState === "sending" || !email}
          className="mt-1 text-sm font-medium text-fg underline disabled:opacity-40"
        >
          {linkState === "sending" ? "Enviando…" : "Te enviamos un link"}
        </button>
        <p role="status" aria-live="polite" className="mt-1 text-xs text-fg-muted">
          {linkState === "sent" && "Si el email existe, te enviamos un link."}
          {linkState === "error" && "No pudimos enviar el link. Probá de nuevo en unos minutos."}
        </p>
      </div>
    </Card>
  );
}
