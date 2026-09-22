"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import * as React from "react";

import { UnitOpeningScreen } from "@/components/modulos/UnitOpeningScreen";
import { UnitBackToBackPlayer } from "@/components/modulos/UnitBackToBackPlayer";
import { UnitStoriesPlayer } from "@/components/modulos/UnitStoriesPlayer";
import { useMediaQuery } from "@/lib/hooks/useMediaQuery";
import type { Block, LearningUnitAttempt, LearningUnitDetail, TextBlock } from "@/lib/types";

/**
 * Showcase de las plantillas sociales de learning units (feat/lu-templates).
 * Monta el `UnitStoriesPlayer` REAL (9:16) con fixtures: una unit "vieja" sin
 * tags (se ve como siempre) y una "taggeada" (stat verde, quote, steps, tip).
 *
 *   /_showcase/lu-templates?unit=old|tagged|long&block=0..N&player=stories|btb|auto|opening
 *
 * `player=auto` replica el switch de `ModuloDetailView` (breakpoint 769px) y, en
 * desktop, la cadena de alturas del shell glass (`SpatialCanvas`: main con
 * `pt-4 pb-[6.5rem] md:px-8`) para medir el layout real; `stories`/`btb` fuerzan
 * uno. Sirve para verificar la adaptación por tamaño de pantalla.
 *
 * No está linkeado en la app (carpeta `%5Fshowcase`: Next ignora las carpetas
 * con `_` literal, igual que `%5Fkit`). Todos los bloques vienen como completados
 * para que el player no llame a la API real (auto-complete a los 3s → 401 sin sesión).
 */

const CITATION = {
  text: "Encuesta global de talento",
  source: "WEF, 2025",
  year: 2025,
  doi_or_url: "https://www.weforum.org/",
  tier: "observational" as const,
};

function text(id: string, block_type: TextBlock["block_type"], o: Partial<TextBlock>): TextBlock {
  const variant = block_type.replace("text_", "") as TextBlock["variant"];
  return {
    id,
    position: 1,
    required: false,
    block_type,
    variant,
    eyebrow: "",
    body: "",
    citation: null,
    applies_to: null,
    requires_evidence_block_id: null,
    hero_stat: null,
    checklist_items: null,
    ...o,
  };
}

// ── Unit VIEJA: ningún tag de presentación (como las 34 units ya creadas) ──
const OLD: Block[] = [
  text("o1", "text_context", {
    eyebrow: "LA SITUACIÓN",
    body: "Llevás semanas con la sensación de que **hacés mucho** y avanzás poco. No es falta de esfuerzo: es falta de *foco*.",
  }),
  text("o2", "text_evidence", {
    eyebrow: "LA EVIDENCIA",
    body: "No se van por el sueldo. Se van por cómo se sienten. ==El 79% era evitable==.",
    hero_stat: { value: "79%", label: "de las renuncias evitables", source: "WEF, 2025" },
    citation: CITATION,
  }),
  text("o3", "text_solution", {
    eyebrow: "PROBÁ ESTO",
    body: "Antes de reaccionar:",
    checklist_items: [
      { title: "Frená", detail: "Un minuto sin decidir nada." },
      { title: "Respirá", detail: null },
      { title: "Elegí una sola prioridad", detail: null },
    ],
  }),
];

// ── Unit TAGGEADA: presentation + marcadores inline ──
const TAGGED: Block[] = [
  text("t1", "text_evidence", {
    eyebrow: "El dato",
    body: ">> No se van por el sueldo. Se van por cómo se sienten. ==El 79% era evitable==.\n\n//Fuente: WEF, 2025//",
    hero_stat: { value: "79%", label: "de las renuncias evitables", source: null },
    presentation: { template: "stat", tone: "green" },
  }),
  text("t2", "text_evidence", {
    eyebrow: "La cita",
    body: "Una idea que vale la pena repetir en cada reunión.",
    presentation: {
      template: "quote",
      tone: "cream",
      pull_quote: { text: "Lo que se mide, se mejora. Lo que se comparte, se multiplica.", attribution: "Peter Drucker" },
    },
  }),
  text("t3", "text_solution", {
    eyebrow: "Probá esto",
    body: "Antes de reaccionar:",
    checklist_items: [
      { title: "Frená", detail: "Un minuto sin decidir nada." },
      { title: "Respirá", detail: null },
      { title: "Elegí una sola prioridad", detail: null },
    ],
    presentation: { template: "steps", tone: "charcoal" },
  }),
  text("t4", "text_solution", {
    eyebrow: "Tip · Claridad",
    body: ">> Decide con menos ruido.\n\nAntes de cada reunión, escribí la única decisión que debe salir de ella.",
    presentation: { template: "tip", tone: "cream" },
  }),
];

const LONG_BODY =
  "Llevás semanas con la sensación de que **hacés mucho** y avanzás poco. No es falta de esfuerzo: es falta de *foco*. " +
  "Cuando todo parece urgente, lo importante se diluye y terminás el día agotado sin saber qué lograste. ".repeat(4) +
  "\n\n" +
  "Elegí una sola prioridad por día y protegela. ==Lo demás puede esperar==. ".repeat(4);

// ── Unit LARGA: mismo contenido con y sin tags, para ver overflow/scroll ──
const LONG: Block[] = [
  text("l1", "text_context", { eyebrow: "LA SITUACIÓN", body: LONG_BODY }),
  text("l2", "text_context", { eyebrow: "La situación", body: `>> Hacés mucho y avanzás poco.\n\n${LONG_BODY}`, presentation: { tone: "cream" } }),
  text("l3", "text_evidence", {
    eyebrow: "El dato",
    body: `>> No se van por el sueldo.\n\n${LONG_BODY}`,
    hero_stat: { value: "79%", label: "de las renuncias evitables", source: null },
    presentation: { template: "stat", tone: "green" },
  }),
];

const UNITS: Record<string, Block[]> = { old: OLD, tagged: TAGGED, long: LONG };

function makeUnit(blocks: Block[], dimension_code: string): LearningUnitDetail {
  return {
    id: "showcase-unit",
    slug: "showcase-unit",
    title: "Showcase",
    dimension_code,
    pillar_code: null,
    unit_number: 1,
    competency_code: null,
    level_code: "L1",
    mentor_id: null,
    published_at: null,
    estimated_duration_seconds: null,
    narrative_tone: null,
    keywords: null,
    blocks: blocks.map((b, i) => ({ ...b, position: i + 1 })),
  };
}

function makeAttempt(blocks: Block[]): LearningUnitAttempt {
  return {
    id: "showcase-attempt",
    unit_id: "showcase-unit",
    started_at: null,
    completed_at: null,
    block_progress: blocks.map((b) => ({ unit_block_id: b.id, status: "completed", submitted_at: null })),
  };
}

function Player() {
  const params = useSearchParams();
  const which = params.get("unit") ?? "";
  const blocks = UNITS[which];
  const idx = Number(params.get("block") ?? "0");
  const dimension = params.get("dim") ?? "CP";

  const unit = React.useMemo(() => {
    if (!blocks) return null;
    // `block=N` aísla un bloque para poder capturarlo; sin él, la unit completa.
    const picked = params.has("block") ? [blocks[Math.min(Math.max(idx, 0), blocks.length - 1)]] : blocks;
    return makeUnit(picked, dimension);
  }, [blocks, idx, dimension, params]);

  if (!unit) {
    return (
      <main className="mx-auto flex max-w-md flex-col gap-3 p-8 font-sans">
        <h1 className="font-heading text-2xl font-semibold">Plantillas de learning units</h1>
        {Object.entries(UNITS).flatMap(([name, bs]) =>
          bs.map((_, i) => (
            <Link key={`${name}-${i}`} className="text-primary underline" href={`?unit=${name}&block=${i}`}>
              {name} · bloque {i}
            </Link>
          )),
        )}
      </main>
    );
  }
  const attempt = makeAttempt(unit.blocks);
  const mode = params.get("player") ?? "stories";
  if (mode === "opening") return <UnitOpeningScreen unit={unit} onStart={() => {}} />;
  if (mode === "btb" || mode === "auto") return <DesktopOrStories unit={unit} attempt={attempt} force={mode === "btb"} />;
  return <UnitStoriesPlayer unit={unit} attempt={attempt} onClose={() => {}} />;
}

/** Mismo switch que `ModuloDetailView` + cadena de alturas del shell glass. */
function DesktopOrStories({
  unit,
  attempt,
  force,
}: {
  unit: LearningUnitDetail;
  attempt: LearningUnitAttempt;
  force: boolean;
}) {
  const isDesktop = useMediaQuery("(min-width: 769px)");
  if (!force && !isDesktop) return <UnitStoriesPlayer unit={unit} attempt={attempt} onClose={() => {}} />;
  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <div className="relative z-0 flex-1 overflow-y-auto px-3 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-3 md:px-8 md:pt-4">
        <main className="mx-auto flex h-full w-full max-w-app flex-col px-6 py-6">
          <UnitBackToBackPlayer unit={unit} attempt={attempt} onClose={() => {}} />
        </main>
      </div>
    </div>
  );
}

export default function LuTemplatesShowcasePage() {
  return (
    <React.Suspense fallback={null}>
      <Player />
    </React.Suspense>
  );
}
