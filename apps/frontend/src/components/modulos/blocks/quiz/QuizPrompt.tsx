import { stripCitationMarkers } from "@/lib/parsers/stripCitationMarkers";
import { cn } from "@/lib/utils";

/**
 * Enunciado de una pregunta de quiz (Sprint UI · TASK 7): Poppins (font-heading)
 * en tamaño grande, para darle peso de "pregunta" y separarlo de las opciones.
 * Limpia los markers de citación `[n]` (fixes-módulos · Bug #1) cuando el
 * contenido es texto plano.
 */
export function QuizPrompt({ children, className }: { children: React.ReactNode; className?: string }) {
  const content = typeof children === "string" ? stripCitationMarkers(children) : children;
  return (
    <legend className={cn("font-heading text-lg font-semibold leading-snug text-fg", className)}>
      {content}
    </legend>
  );
}
