"use client";

import { useMemo, useState } from "react";

import { PILLARS } from "@/lib/pillars";

import { PathCard, type Path } from "./PathCard";

type Level = "Inicial" | "Intermedio" | "Avanzado";
type PillarId = (typeof PILLARS)[number]["id"];

type CatalogPath = Path & { pillar: PillarId; level: Level };

const FACE_SETS: string[][] = [
  ["#C8A76E", "#4A7A54", "#A8C4A0"],
  ["#1A1A1A", "#C8A76E", "#6B7061"],
  ["#A8C4A0", "#E8530A", "#2A2826"],
];

// Catálogo placeholder (DEC-02): 12 rutas, 2 por pilar. Se conecta a
// /api/v1/marketing/featured-paths más adelante.
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

const CATALOG: CatalogPath[] = RAW.map((p, i) => ({
  ...p,
  faces: FACE_SETS[i % FACE_SETS.length],
  cohort: 60 + ((i * 37) % 260),
  dark: i % 5 === 2,
}));

const LEVELS: Level[] = ["Inicial", "Intermedio", "Avanzado"];

export default function PathsCatalog() {
  const [pillar, setPillar] = useState<PillarId | "all">("all");
  const [level, setLevel] = useState<Level | "all">("all");

  const filtered = useMemo(
    () =>
      CATALOG.filter(
        (p) => (pillar === "all" || p.pillar === pillar) && (level === "all" || p.level === level),
      ),
    [pillar, level],
  );

  const chip = (active: boolean) =>
    `px-3.5 py-2 rounded-full text-[13px] font-medium cursor-pointer transition-colors border ${
      active
        ? "bg-hg-ink text-hg-cream border-transparent"
        : "bg-transparent text-hg-charcoal border-border-strong hover:bg-bg-sunken"
    }`;

  return (
    <section className="max-w-marketing mx-auto px-8 pb-32">
      {/* Filtro por pilar */}
      <div className="flex gap-2 flex-wrap mb-3">
        <button className={chip(pillar === "all")} onClick={() => setPillar("all")}>
          Todos los pilares
        </button>
        {PILLARS.map((p) => (
          <button key={p.id} className={chip(pillar === p.id)} onClick={() => setPillar(p.id)}>
            {p.name}
          </button>
        ))}
      </div>
      {/* Filtro por nivel */}
      <div className="flex gap-2 flex-wrap mb-10">
        <button className={chip(level === "all")} onClick={() => setLevel("all")}>
          Todos los niveles
        </button>
        {LEVELS.map((l) => (
          <button key={l} className={chip(level === l)} onClick={() => setLevel(l)}>
            {l}
          </button>
        ))}
      </div>

      <p className="body-sm mb-6">{filtered.length} rutas</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((p) => (
          <PathCard key={p.title} path={p} cohortLabel="en esta cohorte" />
        ))}
      </div>
    </section>
  );
}
