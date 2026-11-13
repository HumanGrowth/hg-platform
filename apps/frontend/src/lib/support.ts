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

// ─────────────── Adjuntos (SP-03) ───────────────
// Mismos límites que el backend (`support/attachments.py`); el backend es quien manda, esto es
// solo para dar feedback inmediato sin subir un archivo que será rechazado.

export const SUPPORT_MAX_FILES = 3;
export const SUPPORT_MAX_BYTES = 5 * 1024 * 1024;
export const SUPPORT_ACCEPT = "image/png,image/jpeg,image/gif,image/webp,application/pdf,.txt,.log,.csv,.json";

const ALLOWED_MIME = new Set(["image/png", "image/jpeg", "image/gif", "image/webp", "application/pdf"]);
const ALLOWED_EXT = new Set(["txt", "log", "csv", "json"]);

export type AttachmentError = "tooMany" | "tooLarge" | "type";

function isAllowed(file: File): boolean {
  if (ALLOWED_MIME.has(file.type)) return true;
  const ext = file.name.includes(".") ? file.name.split(".").pop()!.toLowerCase() : "";
  return ALLOWED_EXT.has(ext);
}

/** Suma `incoming` a `current` respetando los límites; devuelve lo aceptado y el primer error. */
export function addSupportFiles(
  current: File[],
  incoming: File[],
): { files: File[]; error: AttachmentError | null } {
  const files = [...current];
  let error: AttachmentError | null = null;
  for (const f of incoming) {
    if (files.length >= SUPPORT_MAX_FILES) {
      error ??= "tooMany";
      break;
    }
    if (!isAllowed(f)) {
      error ??= "type";
      continue;
    }
    if (f.size > SUPPORT_MAX_BYTES) {
      error ??= "tooLarge";
      continue;
    }
    files.push(f);
  }
  return { files, error };
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/** Imágenes pegadas desde el portapapeles (Cmd/Ctrl+V de un screenshot). */
export function filesFromClipboard(e: { clipboardData: DataTransfer | null }): File[] {
  const items = Array.from(e.clipboardData?.files ?? []);
  return items.filter((f) => f.type.startsWith("image/")).map((f, i) =>
    f.name && f.name !== "image.png" ? f : new File([f], `captura-${Date.now()}-${i + 1}.png`, { type: f.type }),
  );
}
