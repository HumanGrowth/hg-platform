"use client";

import { stripCitationMarkers } from "@/lib/parsers/stripCitationMarkers";
import { cn } from "@/lib/utils";

import { Typewriter } from "./Typewriter";

/** Explicación de una pregunta al corregir. Si arranca con "Correcto" /
 * "Incorrecto", esa palabra se colorea (verde éxito / rojo) para reforzar el
 * feedback; el resto se revela con el typewriter. Limpia los markers `[n]`. */
export function QuizExplanation({ text, className }: { text: string; className?: string }) {
  const clean = stripCitationMarkers(text);
  const m = /^(\s*¡?\s*)(correcto|incorrecto)\b/i.exec(clean);
  if (!m) return <Typewriter text={clean} className={className} />;

  const prefix = m[1];
  const word = m[2];
  const rest = clean.slice(m[0].length);
  const isCorrect = word.toLowerCase() === "correcto";

  return (
    <p className={className}>
      {prefix}
      <span className={cn("font-semibold", isCorrect ? "text-success" : "text-danger")}>{word}</span>
      <Typewriter text={rest} />
    </p>
  );
}
