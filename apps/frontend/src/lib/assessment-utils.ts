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

// El radar es numérico (0-100); el estado es la verdad (se muestra en texto).
// Esto es solo para posicionar el eje visualmente.
const STATE_TO_VALUE: Record<string, number> = {
  // P1 PMM
  L1: 17, L2: 33, L3: 50, L4: 67, L5: 83, L6: 100,
  // P2 Damon
  Latente: 25, Explorador: 50, Direccionado: 75, Integrado: 100,
  // P3 / P5 niveles
  N1: 25, N2: 50, N3: 75, N4: 100,
  // P4 Prochaska
  E1: 20, E2: 40, E3: 60, E4: 80, E5: 100,
  // P6A
  Baja: 33, Media: 66, Alta: 100,
  // P6B
  Frágil: 33, Vulnerable: 66, Estable: 100,
};

export function stateToRadarValue(stateCode: string): number {
  return STATE_TO_VALUE[stateCode] ?? 0;
}

/** Mapea los 7 estados a los 6 ejes del radar (P6 = promedio P6A+P6B). */
export function radarValuesFromResults(results: PillarResult[]): Record<string, number> {
  const by = new Map(results.map((r) => [r.pillar_code, stateToRadarValue(r.state_code)]));
  const p6a = by.get("P6A");
  const p6b = by.get("P6B");
  const p6 =
    p6a != null && p6b != null
      ? Math.round((p6a + p6b) / 2)
      : (p6a ?? p6b ?? 0);
  return {
    P1: by.get("P1") ?? 0,
    P2: by.get("P2") ?? 0,
    P3: by.get("P3") ?? 0,
    P4: by.get("P4") ?? 0,
    P5: by.get("P5") ?? 0,
    P6: p6,
  };
}
