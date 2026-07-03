"use client";

import { useMemo, useState } from "react";

import { GROWTH_PATHS, LEVELS, type Level, type PillarId } from "@/lib/growth-paths";
import { PILLARS } from "@/lib/pillars";

import { PathCard } from "./PathCard";

export default function PathsCatalog() {
  const [pillar, setPillar] = useState<PillarId | "all">("all");
  const [level, setLevel] = useState<Level | "all">("all");

  const filtered = useMemo(
    () =>
      GROWTH_PATHS.filter(
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
