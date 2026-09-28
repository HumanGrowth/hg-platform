"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { useForm } from "react-hook-form";

import { useMarketingCopy } from "@/components/marketing/LanguageProvider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { apiSubmitInquiry } from "@/lib/api";
import { toast } from "@/lib/toast-store";
import { contactSchema, type ContactValues } from "@/lib/validation";

const ROLES = ["RRHH", "Líder", "IT", "Otro"] as const;

export default function ContactForm({ source = "contacto" }: { source?: string }) {
  const f = useMarketingCopy().contact.form;
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
      toast(f.errorToast, "danger");
    }
  }

  if (sentTo) {
    return (
      <Card className="text-center py-12">
        <CheckCircle2 size={48} strokeWidth={1.5} className="text-hg-green mx-auto mb-4" />
        <h2 className="display text-2xl text-fg mb-3">{f.thanksTitle}</h2>
        <p className="text-hg-charcoal mb-8">{f.thanksBody}</p>
        <Link href="/" className="text-primary font-semibold hover:underline">
          {f.backHome}
        </Link>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="glass-surface-strong max-w-[960px] mx-auto p-8 flex flex-col gap-5">
      <div>
        <Label htmlFor="name" className="text-left">{f.name}</Label>
        <Input id="name" autoComplete="name" {...register("name")} />
        {errors.name && <p className="text-danger text-sm mt-1">{f.errors.name}</p>}
      </div>
      <div>
        <Label htmlFor="email" className="text-left">{f.email}</Label>
        <Input id="email" type="email" autoComplete="email" {...register("email")} />
        {errors.email && <p className="text-danger text-sm mt-1">{errors.email.type === "invalid_string" ? f.errors.emailInvalid : f.errors.emailRequired}</p>}
      </div>
      <div>
        <Label htmlFor="company" className="text-left">{f.company}</Label>
        <Input id="company" autoComplete="organization" {...register("company")} />
        {errors.company && <p className="text-danger text-sm mt-1">{f.errors.company}</p>}
      </div>
      <div>
        <Label htmlFor="role" className="text-left">{f.role}</Label>
        <select
          id="role"
          {...register("role")}
          className="w-full h-10 px-3 rounded-md border border-border bg-bg-raised text-fg text-sm"
          defaultValue=""
        >
          <option value="">{f.rolePlaceholder}</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {f.roles[r]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="message">{f.message}</Label>
        <textarea
          id="message"
          rows={4}
          {...register("message")}
          className="w-full px-3 py-2 rounded-md border border-border bg-bg-raised text-fg text-sm resize-y"
          placeholder={f.messagePlaceholder}
        />
      </div>
      <Button type="submit" size="lg" disabled={isSubmitting}>
        {isSubmitting ? f.sending : f.submit}
      </Button>
    </form>
  );
}
