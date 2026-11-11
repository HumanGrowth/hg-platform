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
import { ApiError, apiSubmitPublicSupportTicket } from "@/lib/api";
import { toast } from "@/lib/toast-store";
import type { SupportCategory } from "@/lib/types";
import { publicSupportSchema, type PublicSupportValues } from "@/lib/validation";

const CATEGORIES: SupportCategory[] = ["access", "bug", "question", "suggestion", "other"];

/** Formulario público de soporte (sin sesión). Honeypot `website`: invisible para personas. */
export default function SupportPublicForm() {
  const f = useMarketingCopy().support.form;
  const [sent, setSent] = React.useState(false);
  const honeypot = React.useRef<HTMLInputElement>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PublicSupportValues>({
    resolver: zodResolver(publicSupportSchema),
    defaultValues: { category: "access" },
  });

  async function onSubmit(values: PublicSupportValues) {
    try {
      await apiSubmitPublicSupportTicket({
        ...values,
        website: honeypot.current?.value || undefined,
        page_url: document.referrer ? safePath(document.referrer) : undefined,
        locale: navigator.language.slice(0, 2),
      });
      setSent(true);
    } catch (err) {
      toast(err instanceof ApiError && err.status === 429 ? f.rateLimited : f.errorToast, "danger");
    }
  }

  if (sent) {
    return (
      <Card className="py-12 text-center" role="status">
        <CheckCircle2 size={48} strokeWidth={1.5} className="mx-auto mb-4 text-hg-green" />
        <h2 className="display mb-3 text-2xl text-fg">{f.thanksTitle}</h2>
        <p className="mx-auto mb-8 max-w-prose text-hg-charcoal">{f.thanksBody}</p>
        <Link href="/" className="font-semibold text-primary hover:underline">
          {f.backHome}
        </Link>
      </Card>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="glass-surface-strong mx-auto flex max-w-[960px] flex-col gap-5 p-8"
      noValidate
    >
      <div>
        <Label htmlFor="sp-name">{f.name}</Label>
        <Input id="sp-name" autoComplete="name" aria-invalid={!!errors.name} {...register("name")} />
        {errors.name && <p className="mt-1 text-sm text-danger">{f.errors.name}</p>}
      </div>
      <div>
        <Label htmlFor="sp-email">{f.email}</Label>
        <Input
          id="sp-email"
          type="email"
          autoComplete="email"
          aria-invalid={!!errors.email}
          {...register("email")}
        />
        {errors.email && (
          <p className="mt-1 text-sm text-danger">
            {errors.email.message === "invalid" ? f.errors.emailInvalid : f.errors.emailRequired}
          </p>
        )}
      </div>
      <div>
        <Label htmlFor="sp-category">{f.category}</Label>
        <select
          id="sp-category"
          {...register("category")}
          className="h-10 w-full rounded-md border border-border bg-bg-raised px-3 text-sm text-fg"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {f.categories[c]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="sp-subject">{f.subject}</Label>
        <Input id="sp-subject" maxLength={200} aria-invalid={!!errors.subject} {...register("subject")} />
        {errors.subject && <p className="mt-1 text-sm text-danger">{f.errors.subject}</p>}
      </div>
      <div>
        <Label htmlFor="sp-body">{f.body}</Label>
        <textarea
          id="sp-body"
          rows={5}
          maxLength={5000}
          aria-invalid={!!errors.body}
          {...register("body")}
          className="w-full resize-y rounded-md border border-border bg-bg-raised px-3 py-2 text-sm text-fg"
          placeholder={f.bodyPlaceholder}
        />
        {errors.body && <p className="mt-1 text-sm text-danger">{f.errors.body}</p>}
      </div>
      {/* Honeypot: fuera de pantalla, sin foco ni lectura por lector de pantalla. */}
      <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="sp-website">Website</label>
        <input id="sp-website" ref={honeypot} type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <Button type="submit" size="lg" disabled={isSubmitting}>
        {isSubmitting ? f.sending : f.submit}
      </Button>
    </form>
  );
}

function safePath(referrer: string): string | undefined {
  try {
    const url = new URL(referrer);
    return url.origin === window.location.origin ? url.pathname : undefined;
  } catch {
    return undefined;
  }
}
