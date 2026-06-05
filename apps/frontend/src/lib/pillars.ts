import type { BadgeProps } from "@/components/ui/badge";

export interface Pillar {
  id: "P1" | "P2" | "P3" | "P4" | "P5" | "P6";
  name: string;
  /** clase de color de texto/acento del pilar */
  dot: string;
  badge: NonNullable<BadgeProps["variant"]>;
}

/** Las 6 dimensiones del crecimiento (colores alineados al DS). */
export const PILLARS: Pillar[] = [
  { id: "P1", name: "Carrera e impacto", dot: "bg-pillar-p1", badge: "pillar-p1" },
  { id: "P2", name: "Propósito y significado", dot: "bg-pillar-p2", badge: "pillar-p2" },
  { id: "P3", name: "Relaciones y conexión", dot: "bg-pillar-p3", badge: "pillar-p3" },
  { id: "P4", name: "Salud y bienestar", dot: "bg-pillar-p4", badge: "pillar-p4" },
  { id: "P5", name: "Paz interior y claridad", dot: "bg-pillar-p5", badge: "pillar-p5" },
  { id: "P6", name: "Estabilidad emocional y material", dot: "bg-pillar-p6", badge: "pillar-p6" },
];
