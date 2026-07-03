"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { apiSubmitInquiry } from "@/lib/api";
import { toast } from "@/lib/toast-store";
import { contactSchema, type ContactValues } from "@/lib/validation";

const ROLES = ["RRHH", "Líder", "IT", "Otro"] as const;

export default function ContactForm({ source = "contacto" }: { source?: string }) {
  const [sentTo, setSentTo] = React.useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ContactValues>({ resolver: zodResolver(contactSchema) });

  async function onSubmit(values: ContactValues) {
    try {
      await apiSubmitInquiry({
        name: values.name,
        email: values.email,
        company: values.company,
        role: values.role || undefined,
        message: values.message || undefined,
        source,
      });
      setSentTo(values.name);
    } catch {
      toast("No pudimos enviar tu mensaje. Probá de nuevo en un momento.", "danger");
    }
  }

  if (sentTo) {
    return (
      <Card className="text-center py-12">
        <CheckCircle2 size={48} strokeWidth={1.5} className="text-hg-green mx-auto mb-4" />
        <h2 className="display text-2xl text-fg mb-3">¡Gracias por escribirnos!</h2>
        <p className="text-hg-charcoal mb-8">Te respondemos en menos de 24 horas.</p>
        <Link href="/" className="text-primary font-semibold hover:underline">
          Volver al inicio →
        </Link>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-surface-card border border-border rounded-lg p-8 flex flex-col gap-5">
      <div>
        <Label htmlFor="name">Nombre *</Label>
        <Input id="name" autoComplete="name" {...register("name")} />
        {errors.name && <p className="text-danger text-sm mt-1">{errors.name.message}</p>}
      </div>
      <div>
        <Label htmlFor="email">Email *</Label>
        <Input id="email" type="email" autoComplete="email" {...register("email")} />
        {errors.email && <p className="text-danger text-sm mt-1">{errors.email.message}</p>}
      </div>
      <div>
        <Label htmlFor="company">Empresa *</Label>
        <Input id="company" autoComplete="organization" {...register("company")} />
        {errors.company && <p className="text-danger text-sm mt-1">{errors.company.message}</p>}
      </div>
      <div>
        <Label htmlFor="role">Rol</Label>
        <select
          id="role"
          {...register("role")}
          className="w-full h-10 px-3 rounded-md border border-border bg-bg-raised text-fg text-sm"
          defaultValue=""
        >
          <option value="">Seleccioná (opcional)</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="message">Mensaje</Label>
        <textarea
          id="message"
          rows={4}
          {...register("message")}
          className="w-full px-3 py-2 rounded-md border border-border bg-bg-raised text-fg text-sm resize-y"
          placeholder="Contanos brevemente qué necesitás (opcional)"
        />
      </div>
      <Button type="submit" size="lg" disabled={isSubmitting}>
        {isSubmitting ? "Enviando…" : "Conversemos →"}
      </Button>
    </form>
  );
}
