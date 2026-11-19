import type { Lang } from "@/lib/i18n";
import type { CompanyStatus } from "@/lib/types";

/** Espejo de `ALLOWED_TRANSITIONS` del backend (company/lifecycle.py · ADR-0016).
 * El backend es la fuente de verdad (responde 409 si no); esto solo arma la UI. */
export const ALLOWED_TRANSITIONS: Record<CompanyStatus, CompanyStatus[]> = {
  trial: ["active", "grace"],
  active: ["grace", "suspended"], // active→suspended = corte de emergencia
  grace: ["active", "suspended"],
  suspended: ["active", "terminated"],
  terminated: ["suspended"], // rescate
};

/** Destinos que exigen motivo y confirmación escribiendo el slug. */
export const DESTRUCTIVE_TARGETS: readonly CompanyStatus[] = ["suspended", "terminated"];

export const needsConfirmation = (to: CompanyStatus) => DESTRUCTIVE_TARGETS.includes(to);

export type StatusBadgeVariant = "info" | "success" | "warning" | "danger";

export const STATUS_BADGE: Record<CompanyStatus, StatusBadgeVariant> = {
  trial: "info",
  active: "success",
  grace: "warning",
  suspended: "danger",
  terminated: "danger",
};

/** Roles tal como los nombra la UI de admin. */
export const ROLE_LABELS: Record<string, string> = {
  collaborator: "Colaboradores",
  manager: "Managers",
  admin: "Administradores",
  company_admin: "RRHH",
  superadmin: "Superadmin",
};

export function formatLongDate(iso: string, lang: Lang = "es"): string {
  return new Intl.DateTimeFormat(lang === "es" ? "es-CR" : "en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

export function formatDateTime(iso: string, lang: Lang = "es"): string {
  return new Intl.DateTimeFormat(lang === "es" ? "es-CR" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** Reemplaza `{clave}` en un texto de copy. */
export function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? `{${k}}`);
}
