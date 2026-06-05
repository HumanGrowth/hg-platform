"use client";

import { Library as LibraryIcon } from "lucide-react";
import * as React from "react";

import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Display } from "@/components/ui/display";
import { Eyebrow } from "@/components/ui/eyebrow";
import { PILLARS } from "@/lib/pillars";

const LEVELS = ["L1", "L2", "L3", "L4a", "L4b"] as const;

function toggle<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

export default function LibraryPage() {
  const [pillars, setPillars] = React.useState<Set<string>>(new Set());
  const [levels, setLevels] = React.useState<Set<string>>(new Set());

  return (
    <main className="mx-auto w-full max-w-app px-6 py-10">
      <Eyebrow accent>Biblioteca</Eyebrow>
      <Display variant="display-2" className="mt-2">
        Carrera
      </Display>
      <p className="mt-3 max-w-prose text-md text-fg-muted">
        Cursos y rutas de tu organización. Filtrá por dimensión y nivel.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[260px_1fr]">
        {/* Filtros */}
        <aside className="flex flex-col gap-6">
          <div>
            <Eyebrow className="mb-3">Dimensión</Eyebrow>
            <div className="flex flex-wrap gap-2">
              {PILLARS.map((p) => (
                <Chip
                  key={p.id}
                  active={pillars.has(p.id)}
                  onClick={() => setPillars((s) => toggle(s, p.id))}
                >
                  {p.id}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <Eyebrow className="mb-3">Nivel</Eyebrow>
            <div className="flex flex-wrap gap-2">
              {LEVELS.map((l) => (
                <Chip
                  key={l}
                  active={levels.has(l)}
                  onClick={() => setLevels((s) => toggle(s, l))}
                >
                  {l}
                </Chip>
              ))}
            </div>
          </div>
        </aside>

        {/* Grid de cursos (vacío en v1) */}
        <section>
          <Card className="flex flex-col items-center justify-center gap-3 py-20 text-center">
            <LibraryIcon size={32} strokeWidth={1.75} className="text-fg-subtle" />
            <p className="font-sans text-md font-semibold text-fg">
              No hay cursos disponibles en tu organización.
            </p>
            <p className="max-w-sm text-sm text-fg-muted">
              Vuelve pronto. Cuando tu organización publique contenido, vas a verlo acá
              {pillars.size || levels.size ? " — incluso con estos filtros" : ""}.
            </p>
          </Card>
        </section>
      </div>
    </main>
  );
}
