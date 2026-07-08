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

/** Hex por pilar (DS v2 · tailwind pillar.p1..p6) para los badges de eje. */
export const PILLAR_HEX: Record<PillarCode, string> = {
  P1: "#E8530A",
  P2: "#C8A76E",
  P3: "#4A7A54",
  P4: "#A8C4A0",
  P5: "#2C3E50",
  P6: "#E8A030",
};