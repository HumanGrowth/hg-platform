import type { BadgeProps } from "@/components/ui/badge";
import type { SupportCategory, SupportSeverity, SupportStatus } from "@/lib/types";

/** Etiquetas de soporte para las pantallas autenticadas (app y admin). */
export const SUPPORT_CATEGORY_LABELS: Record<SupportCategory, string> = {
  bug: "Algo no funciona",
  question: "Tengo una pregunta",
  access: "No puedo entrar",
  suggestion: "Sugerencia",
  other: "Otro",
};

export const SUPPORT_STATUS_LABELS: Record<SupportStatus, string> = {
  new: "Nuevo",
  triaged: "En revisión",
  needs_info: "Necesitamos más información",
  answered: "Respondido",
  fix_proposed: "Corrección en camino",
  resolved: "Resuelto",
  wontfix: "Cerrado sin cambios",
};

export const SUPPORT_SEVERITY_LABELS: Record<SupportSeverity, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
};

type BadgeVariant = NonNullable<BadgeProps["variant"]>;

export const SUPPORT_STATUS_VARIANT: Record<SupportStatus, BadgeVariant> = {
  new: "warning",
  triaged: "info",
  needs_info: "warning",
  answered: "info",
  fix_proposed: "info",
  resolved: "success",
  wontfix: "default",
};

export const SUPPORT_STATUSES = Object.keys(SUPPORT_STATUS_LABELS) as SupportStatus[];
export const SUPPORT_CATEGORIES_LIST = Object.keys(SUPPORT_CATEGORY_LABELS) as SupportCategory[];

/** Quién escribió un mensaje del hilo, en palabras del usuario. */
export function actorLabel(kind: string, viewer: "user" | "admin"): string {
  if (kind === "user") return viewer === "user" ? "Vos" : "Usuario";
  if (kind === "admin") return "Equipo de HG";
  if (kind === "ai") return "Asistente";
  return "Sistema";
}

export function formatSupportDate(iso: string): string {
  return new Date(iso).toLocaleString("es-CR", { dateStyle: "medium", timeStyle: "short" });
}
