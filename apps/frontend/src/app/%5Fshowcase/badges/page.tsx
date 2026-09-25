"use client";

import * as React from "react";

import { CustomPathBadgePreview } from "@/components/badges/CustomPathBadgePreview";
import { CatalogBadge } from "@/components/badges/CatalogBadge";
import { HgBadge } from "@/components/badges/HgBadge";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Input, Label } from "@/components/ui/input";

// Badges de área reales del catálogo (nombres tal como los devuelve el backend).
const AREA_BADGES: { code: string; name: string }[] = [
  { code: "pillar-cp-p1", name: "Adaptabilidad de aprendizaje" },
  { code: "pillar-cp-p2", name: "Excelencia operativa y colaboración" },
  { code: "pillar-cp-p3", name: "Experticia y pensamiento estratégico" },
  { code: "pillar-cp-p4", name: "Comunicación e influencia" },
  { code: "pillar-cp-p5", name: "Inteligencia emocional y social" },
  { code: "pillar-cp-ai", name: "Inteligencia artificial aplicada" },
  { code: "pillar-pr-v0", name: "Etapa V0" },
];

const CAREER_PATHS = ["P1", "P2", "P3", "P4", "P5", "P6"] as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-b border-border py-10">
      <Eyebrow accent>{title}</Eyebrow>
      <div className="flex flex-wrap items-start gap-6">{children}</div>
    </section>
  );
}

/**
 * Badge Kit showcase — demonstrates <HgBadge> (one badge per dimension, one
 * badge at a fixed level) and <CustomPathBadgePreview> (multi-pillar, live
 * preview). Not linked from the app nav; visit /_showcase/badges directly
 * (folder is named "%5Fshowcase" — Next.js excludes literal `_`-prefixed
 * folders from routing, same convention as the existing `%5Fkit` showcase).
 */
export default function BadgesShowcasePage() {
  const [routeName, setRouteName] = React.useState("Liderazgo integral");
  const [companyName, setCompanyName] = React.useState("Acme Corp");
  const [pillars, setPillars] = React.useState<string[]>(["CP", "PR", "SA"]);

  function togglePillar(code: string) {
    setPillars((prev) => (prev.includes(code) ? prev.filter((p) => p !== code) : [...prev, code]));
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="font-sans text-2xl font-semibold text-fg">HG Badge Kit — showcase</h1>
      <p className="mt-1 text-sm text-fg-muted">
        Piso interno para el badge-kit vendorizado. No enlazado desde la nav de la app.
      </p>

      <Section title="Un badge por dimensión (earned, nivel Sólido)">
        {CAREER_PATHS.map((code) => (
          <div key={code} className="flex flex-col items-center gap-2">
            <HgBadge dimension={code} level="Sólido" rank={2} state="earned" size={120} />
            <span className="text-xs text-fg-muted">{code}</span>
          </div>
        ))}
      </Section>

      <Section title="Badges de área (pillar-*, desbloqueado / bloqueado)">
        {AREA_BADGES.map((b) => (
          <div key={b.code} className="flex flex-col items-center gap-2">
            <div className="flex items-end gap-2">
              <CatalogBadge code={b.code} name={b.name} unlocked size={110} />
              <CatalogBadge code={b.code} name={b.name} unlocked={false} size={64} />
            </div>
            <span className="text-xs text-fg-muted">{b.code}</span>
          </div>
        ))}
      </Section>

      <Section title="Un badge de nivel (locked vs. earned, compact)">
        <div className="flex flex-col items-center gap-2">
          <HgBadge dimension="CP" level="En crecimiento" rank={0} state="earned" size={140} />
          <span className="text-xs text-fg-muted">L1 · earned</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <HgBadge dimension="CP" level="Ejemplar" rank={4} state="locked" size={140} />
          <span className="text-xs text-fg-muted">L3 · locked</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <HgBadge dimension="PI" level="Sólido" rank={2} state="earned" size={100} compact />
          <span className="text-xs text-fg-muted">compact</span>
        </div>
      </Section>

      <Section title="Badge multi-pilar de ruta custom (preview en vivo)">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="routeName">Nombre de la ruta</Label>
            <Input
              id="routeName"
              value={routeName}
              onChange={(e) => setRouteName(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="companyName">Empresa</Label>
            <Input
              id="companyName"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label>Pilares</Label>
            <div className="flex flex-wrap gap-2">
              {CAREER_PATHS.map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => togglePillar(code)}
                  className={
                    pillars.includes(code)
                      ? "rounded-full border border-primary bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                      : "rounded-full border border-border px-3 py-1 text-xs text-fg-muted"
                  }
                >
                  {code}
                </button>
              ))}
            </div>
          </div>
        </div>
        <CustomPathBadgePreview
          routeName={routeName}
          companyName={companyName}
          pillars={pillars}
          size={160}
        />
      </Section>
    </div>
  );
}
