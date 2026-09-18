/**
 * REGRESIÓN de las plantillas sociales (feat/lu-templates): un bloque SIN
 * `presentation` tiene que renderizar EXACTAMENTE el mismo DOM que antes de
 * introducir el registry de plantillas. Los snapshots (`__snapshots__/`) se
 * generaron contra el render pre-plantillas; si este test falla, se rompió el
 * "no afecta a las unidades ya creadas".
 *
 * `useShouldAnimate` se fija en false para que el DOM sea determinista (sin
 * counter animation ni transiciones de entrada).
 */
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { BlockRenderer } from "../BlockRenderer";
import { HeroDataPoint } from "../blocks/HeroDataPoint";
import { InteractiveChecklist } from "../blocks/InteractiveChecklist";
import { TextBlockView } from "../blocks/TextBlockView";
import type { Block, TextBlock } from "@/lib/types";

vi.mock("@/lib/motion/useShouldAnimate", () => ({ useShouldAnimate: () => false }));

const noop = vi.fn(async () => {});
const handlers = {
  isCompleted: true,
  onCompleteBlock: noop,
  onSubmitQuiz: vi.fn(async () => ({ results: [], block_completed: true })),
  onSubmitReflection: noop,
};

const CITATION = {
  text: "Estudio",
  source: "Journal X",
  year: 2020,
  doi_or_url: "https://doi.org/10.1/x",
  tier: "rct" as const,
};

function text(overrides: Partial<TextBlock>): TextBlock {
  return {
    id: "t-1",
    position: 2,
    required: false,
    block_type: "text_context",
    variant: "context",
    eyebrow: "LA SITUACIÓN",
    body: "Un texto de contexto con **negrita**, *énfasis* y ==la frase clave==.",
    citation: null,
    applies_to: null,
    requires_evidence_block_id: null,
    hero_stat: null,
    checklist_items: null,
    ...overrides,
  };
}

/** Bloques de texto SIN `presentation` — el corpus de las 34 units existentes. */
const TEXT_FIXTURES: Record<string, TextBlock> = {
  "context · plain": text({}),
  "context · blockquote": text({ body: "> Lo que se mide, se mejora.\n\nDrucker" }),
  "evidence · hero_stat explícito": text({
    block_type: "text_evidence",
    variant: "evidence",
    eyebrow: "LA EVIDENCIA",
    body: "El cuerpo con el dato [1].",
    hero_stat: { value: "23%", label: "de los casos", source: "HBS" },
    citation: CITATION,
  }),
  "evidence · hero_stat auto-detectado": text({
    block_type: "text_evidence",
    variant: "evidence",
    eyebrow: "LA EVIDENCIA",
    body: "El 79% de las renuncias eran evitables según el estudio.",
    citation: CITATION,
  }),
  "evidence · sin número": text({
    block_type: "text_evidence",
    variant: "evidence",
    eyebrow: "LA EVIDENCIA",
    body: "Sin datos numéricos, sólo prosa.",
  }),
  "solution · checklist explícito": text({
    block_type: "text_solution",
    variant: "solution",
    eyebrow: "PROBÁ ESTO",
    body: "Intro de la técnica.",
    checklist_items: [
      { title: "Frená", detail: "Un minuto." },
      { title: "Respirá", detail: null },
    ],
  }),
  "solution · lista 1.2.3. auto-detectada": text({
    block_type: "text_solution",
    variant: "solution",
    eyebrow: "PROBÁ ESTO",
    body: "Antes de reaccionar:\n\n1. Frená\n2. Respirá\n3. Elegí",
  }),
  "solution · prosa": text({
    block_type: "text_solution",
    variant: "solution",
    eyebrow: "PROBÁ ESTO",
    body: "Un consejo corto sin lista.",
  }),
};

const OTHER_FIXTURES: Record<string, Block> = {
  "quiz · single_choice": {
    id: "q-1",
    position: 3,
    required: true,
    block_type: "quiz_recall",
    eyebrow: "COMPROBÁ TU COMPRENSIÓN",
    questions: [
      {
        id: "qq1",
        position: 1,
        prompt: "¿Cuál es la respuesta?",
        question_type: "single_choice",
        options: [
          { id: "o1", position: 1, text: "Uno" },
          { id: "o2", position: 2, text: "Dos" },
        ],
      },
    ],
  },
  "reflection": {
    id: "r-1",
    position: 4,
    required: true,
    block_type: "reflection_write",
    eyebrow: "APLICALO ESTA SEMANA",
    prompt: "¿Qué vas a hacer distinto?",
    min_chars: 30,
    max_chars: 500,
    example: "Ejemplo de respuesta.",
  },
};

describe("regresión: bloques sin presentation renderizan como antes", () => {
  for (const [name, block] of Object.entries(TEXT_FIXTURES)) {
    it(`TextBlockView · ${name}`, () => {
      const { container } = render(
        <TextBlockView block={block} isCompleted onCompleteBlock={noop} dimensionCode="P3" />,
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it(`BlockRenderer · ${name}`, () => {
      const { container } = render(<BlockRenderer block={block} dimensionCode="CP" {...handlers} />);
      expect(container.firstChild).toMatchSnapshot();
    });
  }

  for (const [name, block] of Object.entries(OTHER_FIXTURES)) {
    it(`BlockRenderer · ${name}`, () => {
      const { container } = render(<BlockRenderer block={block} dimensionCode="CP" {...handlers} />);
      expect(container.firstChild).toMatchSnapshot();
    });
  }

  // El backend devuelve `presentation: null` para las units ya creadas (columna
  // NULL); un `{}` también es "sin tags". Ambos deben dar el MISMO DOM que el
  // bloque sin el campo (el snapshot de arriba).
  for (const [name, block] of Object.entries(TEXT_FIXTURES)) {
    for (const presentation of [null, {}] as const) {
      it(`BlockRenderer · ${name} · presentation=${JSON.stringify(presentation)} ≡ sin campo`, () => {
        const legacy = render(<BlockRenderer block={block} dimensionCode="CP" {...handlers} />);
        const legacyHtml = legacy.container.innerHTML;
        legacy.unmount();
        const { container } = render(
          <BlockRenderer block={{ ...block, presentation }} dimensionCode="CP" {...handlers} />,
        );
        expect(container.innerHTML).toBe(legacyHtml);
      });
    }
  }

  it("HeroDataPoint", () => {
    const { container } = render(<HeroDataPoint value="79%" label="de las renuncias" dimensionCode="P1" />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it("InteractiveChecklist", () => {
    const { container } = render(
      <InteractiveChecklist
        items={[{ title: "Uno", detail: "Detalle" }, { title: "Dos" }]}
        storageKey="regression-checklist"
        dimensionCode="P4"
      />,
    );
    expect(container.firstChild).toMatchSnapshot();
  });
});
