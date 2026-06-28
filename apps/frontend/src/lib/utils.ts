import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Concatena clases de Tailwind respetando precedencia. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Segundos → "m:ss" (o "h:mm:ss" si ≥ 1h). 432 → "7:12", 3725 → "1:02:05". */
export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

const _RTF_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31_536_000],
  ["month", 2_592_000],
  ["week", 604_800],
  ["day", 86_400],
  ["hour", 3_600],
  ["minute", 60],
];

/** ISO → tiempo relativo en español. null → "—", < 60s → "ahora". */
export function formatRelativeTime(iso: string | null): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const diffMs = then - Date.now();
  const absSec = Math.abs(diffMs) / 1000;
  if (absSec < 60) return "ahora";
  const rtf = new Intl.RelativeTimeFormat("es", { numeric: "auto" });
  for (const [unit, secs] of _RTF_UNITS) {
    if (absSec >= secs) return rtf.format(Math.round(diffMs / 1000 / secs), unit);
  }
  return "ahora";
}

/**
 * Nombre para saludar. Los nombres seed tipo "Acme Corp Collaborator 1" no dan
 * un buen primer token; descartamos números sueltos y roles genéricos. Si no
 * queda nada útil, devolvemos "" (el saludo cae a "Hola" sin nombre).
 */
export function greetingName(fullName: string): string {
  const GENERIC = /^(collaborator|colaborador|manager|admin|corp|inc|ltd|sa|srl)$/i;
  const tokens = fullName
    .trim()
    .split(/\s+/)
    .filter((t) => t && !/^\d+$/.test(t) && !GENERIC.test(t));
  return tokens[0] ?? "";
}
