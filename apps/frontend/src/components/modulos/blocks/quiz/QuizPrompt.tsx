import { cn } from "@/lib/utils";

/**
 * Enunciado de una pregunta de quiz (Sprint UI · TASK 7): Poppins (font-heading)
 * en tamaño grande, para darle peso de "pregunta" y separarlo de las opciones.
 */
export function QuizPrompt({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <legend className={cn("font-heading text-lg font-semibold leading-snug text-fg", className)}>
      {children}
    </legend>
  );
}
