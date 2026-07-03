import type { Path } from "@/components/marketing/PathCard";
import { PILLARS } from "@/lib/pillars";

// Fuente única de las "Rutas de Crecimiento". La consumen el catálogo completo
// (/paths · PathsCatalog) y la sección "Nuevo este trimestre" del home
// (FeaturedPaths), para que los filtros de ambas carguen el mismo contenido.
// Placeholder (DEC-02): 12 rutas, 2 por pilar. Se conectará a
// /api/v1/marketing/featured-paths más adelante.

export type Level = "Inicial" | "Intermedio" | "Avanzado";
export type PillarId = (typeof PILLARS)[number]["id"];
export type CatalogPath = Path & { pillar: PillarId; level: Level };

export const LEVELS: Level[] = ["Inicial", "Intermedio", "Avanzado"];

const FACE_SETS: string[][] = [
  ["#C8A76E", "#4A7A54", "#A8C4A0"],
  ["#1A1A1A", "#C8A76E", "#6B7061"],
  ["#A8C4A0", "#E8530A", "#2A2826"],
];

const RAW: Array<Omit<CatalogPath, "faces" | "cohort">> = [
  { pillar: "P1", level: "Inicial", category: "CARRERA E IMPACTO", meta: "7 LECCIONES · NIVEL INICIAL", title: "Diseñá tu trayectoria con intención", body: "De \"estoy estancado\" a \"sé a dónde voy\". Herramientas reales, no motivación temporal." },
  { pillar: "P1", level: "Avanzado", category: "CARRERA E IMPACTO", meta: "9 LECCIONES · NIVEL AVANZADO", title: "Liderá sin perder autoridad", body: "Comunicación directa, conflictos y confianza para quien ya gestiona equipos." },
  { pillar: "P2", level: "Inicial", category: "PROPÓSITO Y SIGNIFICADO", meta: "5 LECCIONES · NIVEL INICIAL", title: "Encontrá tu para qué", body: "Un método para conectar tu trabajo diario con algo que de verdad te importa." },
  { pillar: "P2", level: "Intermedio", category: "PROPÓSITO Y SIGNIFICADO", meta: "6 LECCIONES · NIVEL INTERMEDIO", title: "Decisiones con sentido", body: "Cómo elegir proyectos y caminos alineados a tus valores, no al ruido externo." },
  { pillar: "P3", level: "Intermedio", category: "RELACIONES Y CONEXIÓN", meta: "12 LECCIONES · NIVEL INTERMEDIO", title: "Gestioná un equipo que no te escucha", body: "Comunicación, conflictos y confianza sin perder autoridad ni cercanía." },
  { pillar: "P3", level: "Inicial", category: "RELACIONES Y CONEXIÓN", meta: "5 LECCIONES · TODOS LOS NIVELES", title: "Conversaciones difíciles, sin drama", body: "Estructura para dar feedback y pedir lo que necesitás sin quemar puentes." },
  { pillar: "P4", level: "Inicial", category: "SALUD Y BIENESTAR", meta: "5 LECCIONES · TODOS LOS NIVELES", title: "Prevení el burnout antes de que llegue", body: "Señales tempranas, hábitos concretos y desempeño sostenible sin quemarte." },
  { pillar: "P4", level: "Intermedio", category: "SALUD Y BIENESTAR", meta: "7 LECCIONES · NIVEL INTERMEDIO", title: "Energía para el trabajo profundo", body: "Sueño, foco y recuperación aplicados a la realidad de una semana intensa." },
  { pillar: "P5", level: "Inicial", category: "PAZ INTERIOR Y CLARIDAD", meta: "6 LECCIONES · NIVEL INICIAL", title: "Calma bajo presión", body: "Herramientas para pensar claro cuando todo se acelera y la cabeza no para." },
  { pillar: "P5", level: "Avanzado", category: "PAZ INTERIOR Y CLARIDAD", meta: "8 LECCIONES · NIVEL AVANZADO", title: "Claridad para decidir mejor", body: "Marcos para reducir el ruido mental y tomar decisiones con menos ansiedad." },
  { pillar: "P6", level: "Intermedio", category: "ESTABILIDAD EMOCIONAL Y MATERIAL", meta: "7 LECCIONES · NIVEL INTERMEDIO", title: "Tu base financiera, sin culpa", body: "Orden, colchón y hábitos para que el dinero deje de ser una fuente de estrés." },
  { pillar: "P6", level: "Avanzado", category: "ESTABILIDAD EMOCIONAL Y MATERIAL", meta: "9 LECCIONES · NIVEL AVANZADO", title: "Resiliencia para la incertidumbre", body: "Cómo sostener estabilidad emocional cuando el contexto laboral cambia rápido." },
];

export const GROWTH_PATHS: CatalogPath[] = RAW.map((p, i) => ({
  ...p,
  faces: FACE_SETS[i % FACE_SETS.length],
  cohort: 60 + ((i * 37) % 260),
  dark: i % 5 === 2,
}));
