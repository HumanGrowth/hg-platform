import type { AssessmentPillarCode, AssessmentResponseType, PillarResult } from "@/lib/types";

/** Etiquetas de los extremos/puntos de cada escala likert (es-CR). */
export function labelsForScale(type: AssessmentResponseType): string[] {
  switch (type) {
    case "likert_0_4":
      return ["Nunca", "Pocas veces", "A veces", "Regularmente", "Siempre"];
    case "likert_1_5":
      return [
        "Totalmente en desacuerdo",
        "En desacuerdo",
        "Neutral",
        "De acuerdo",
        "Totalmente de acuerdo",
      ];
    case "likert_1_7":
      return [
        "Totalmente en desacuerdo",
        "En desacuerdo",
        "Algo en desacuerdo",
        "Neutral",
        "Algo de acuerdo",
        "De acuerdo",
        "Totalmente de acuerdo",
      ];
    default:
      return [];
  }
}

export const PILLAR_NAMES: Record<AssessmentPillarCode, string> = {
  P1: "Carrera e impacto",
  P2: "Propósito y significado",
  P3: "Relaciones y conexión",
  P4: "Salud y bienestar",
  P5: "Paz interior y claridad",
  P6A: "Resiliencia",
  P6B: "Bienestar financiero",
};

export function nextStepLabel(result: PillarResult): string {
  return result.suggested_next_step ?? "Seguí explorando este pilar.";
}

export function sourceLabel(source: PillarResult["source"]): string {
  return source === "confirmed" ? "Confirmado" : "Estimación rápida";
}

/** ¿Se puede re-evaluar ya? (confirmed + ventana de re-take cumplida). */
export function canRetake(result: PillarResult): boolean {
  if (result.source !== "confirmed") return false;
  return new Date(result.next_retake_eligible_at).getTime() <= Date.now();
}
