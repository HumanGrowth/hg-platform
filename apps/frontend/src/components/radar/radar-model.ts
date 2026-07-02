export type PillarCode = "P1" | "P2" | "P3" | "P4" | "P5" | "P6";

export type RadarValues = Partial<Record<PillarCode, number>>;

export const PILLAR_LABEL: Record<PillarCode, string> = {
  P1: "Carrera",
  P2: "Propósito",
  P3: "Relaciones",
  P4: "Salud",
  P5: "Paz interior",
  P6: "Estabilidad",
};