import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Concatena clases de Tailwind respetando precedencia. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
