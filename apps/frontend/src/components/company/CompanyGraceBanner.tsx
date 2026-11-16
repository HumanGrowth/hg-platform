"use client";

import { Info } from "lucide-react";

import { fill, formatLongDate } from "@/lib/company-lifecycle";
import { useAuthStore } from "@/lib/auth-store";
import { getCopy, type Lang } from "@/lib/i18n";

/** Presentación del aviso de gracia (testeable sin store). */
export function GraceBanner({ graceEndsAt, lang = "es" }: { graceEndsAt?: string | null; lang?: Lang }) {
  const c = getCopy(lang).companyLifecycle.banner;
  const text = graceEndsAt
    ? fill(c.withDate, { date: formatLongDate(graceEndsAt, lang) })
    : c.noDate;
  return (
    <div
      role="status"
      data-testid="grace-banner"
      className="flex w-full items-center justify-center gap-2 bg-warning-bg px-4 py-2 text-warning"
    >
      <Info size={16} strokeWidth={1.75} aria-hidden className="shrink-0" />
      <p className="font-sans text-sm font-medium">{text}</p>
    </div>
  );
}

/** Banner persistente mientras la empresa del usuario está en gracia (ADR-0016). */
export function CompanyGraceBanner() {
  const user = useAuthStore((s) => s.user);
  if (user?.company_status !== "grace" || user.role === "superadmin") return null;
  return <GraceBanner graceEndsAt={user.grace_ends_at} />;
}
