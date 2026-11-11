"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import * as React from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { apiCreateSupportTicket, apiErrorMessage } from "@/lib/api";
import { SUPPORT_CATEGORIES_LIST, SUPPORT_CATEGORY_LABELS } from "@/lib/support";
import { toast } from "@/lib/toast-store";
import type { SupportTicketDetail } from "@/lib/types";
import { supportTicketSchema, type SupportTicketValues } from "@/lib/validation";

/** Ruta de la app desde la que llegó el usuario (solo mismo origen), para dar contexto al ticket. */
function referrerPath(): string | undefined {
  try {
    if (!document.referrer) return undefined;
    const url = new URL(document.referrer);
    return url.origin === window.location.origin ? url.pathname : undefined;
  } catch {
    return undefined;
  }
}

export function SupportTicketForm({
  onCreated,
}: {
  onCreated: (ticket: SupportTicketDetail) => void;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SupportTicketValues>({
    resolver: zodResolver(supportTicketSchema),
    defaultValues: { category: "question", subject: "", body: "" },
  });

  async function onSubmit(values: SupportTicketValues) {
    try {
      const ticket = await apiCreateSupportTicket({
        ...values,
        page_url: referrerPath(),
        locale: navigator.language.slice(0, 2),
      });
      toast(`Recibimos tu solicitud ${ticket.code}.`, "success");
      reset({ category: "question", subject: "", body: "" });
      onCreated(ticket);
    } catch (err) {
      toast(apiErrorMessage(err, "No pudimos enviar tu solicitud. Probá de nuevo."), "danger");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <div>
        <Label htmlFor="support-category">¿Qué pasa?</Label>
        <select
          id="support-category"
          {...register("category")}
          className="h-10 w-full rounded-md border border-border bg-bg-raised px-3 text-sm text-fg"
        >
          {SUPPORT_CATEGORIES_LIST.map((c) => (
            <option key={c} value={c}>
              {SUPPORT_CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="support-subject">Asunto</Label>
        <Input id="support-subject" maxLength={200} aria-invalid={!!errors.subject} {...register("subject")} />
        {errors.subject && <p className="mt-1 text-sm text-danger">{errors.subject.message}</p>}
      </div>
      <div>
        <Label htmlFor="support-body">Detalle</Label>
        <textarea
          id="support-body"
          rows={5}
          maxLength={5000}
          aria-invalid={!!errors.body}
          {...register("body")}
          className="w-full resize-y rounded-md border border-border bg-bg-raised px-3 py-2 text-sm text-fg"
          placeholder="Contanos qué estabas haciendo y qué esperabas que pasara."
        />
        {errors.body && <p className="mt-1 text-sm text-danger">{errors.body.message}</p>}
      </div>
      <p className="text-xs text-fg-muted">
        Incluimos automáticamente tu rol, la versión de la plataforma y tu navegador para
        ayudarnos a entender el problema. No incluyas contraseñas.
      </p>
      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Enviando…" : "Enviar solicitud"}
        </Button>
      </div>
    </form>
  );
}
