"use client";

import { useMemo, useState } from "react";

import { FilterChip } from "@/components/marketing/fx/FilterChip";
import { Reveal, RevealGroup } from "@/components/marketing/fx/Reveal";
import { useMarketingCopy } from "@/components/marketing/LanguageProvider";
import { GROWTH_PATHS, LEVELS, type Level, type DimensionId } from "@/lib/growth-paths";
import { DIMENSIONS_META } from "@/lib/dimension-styles";

import { PathCard } from "./PathCard";

export default function PathsCatalog() {
  const copy = useMarketingCopy();
  const ui = copy.pathsPage;
  const dimNames = Object.fromEntries(copy.sixDimensions.items.map((d) => [d.code, d.title]));
  const [pillar, setDimension] = useState<DimensionId | "all">("all");
  const [level, setLevel] = useState<Level | "all">("all");

  const filtered = useMemo(
    () =>
      GROWTH_PATHS.map((p, i) => ({ ...p, ...ui.items[i] })).filter(
        (p) => (pillar === "all" || p.pillar === pillar) && (level === "all" || p.level === level),
      ),
    [pillar, level, ui.items],
  );

  return (
    <section className="mx-auto w-full max-w-marketing px-5 pb-24 md:px-8">
      <Reveal>
        <div className="mb-3 flex flex-wrap gap-2">
          <FilterChip active={pillar === "all"} onClick={() => setDimension("all")}>
            {ui.allDimensions}
          </FilterChip>
          {DIMENSIONS_META.map((p) => (
            <FilterChip key={p.id} active={pillar === p.id} onClick={() => setDimension(p.id)}>
              {dimNames[p.id] ?? p.name}
            </FilterChip>
          ))}
        </div>
        <div className="mb-8 flex flex-wrap gap-2">
          <FilterChip active={level === "all"} onClick={() => setLevel("all")}>
            {ui.allLevels}
          </FilterChip>
          {LEVELS.map((l) => (
            <FilterChip key={l} active={level === l} onClick={() => setLevel(l)}>
              {ui.levels[l]}
            </FilterChip>
          ))}
        </div>
      </Reveal>

      <p className="body-sm mb-6 text-fg-muted" aria-live="polite">
        {filtered.length} {ui.count}
      </p>
      {/* key = filtros → el grid se re-monta y las cards vuelven a entrar */}
      <RevealGroup key={`${pillar}-${level}`} className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3" step={0.05}>
        {filtered.map((p) => (
          <PathCard key={p.title} path={p} cohortLabel={ui.cohort} />
        ))}
      </RevealGroup>
    </section>
  );
}
