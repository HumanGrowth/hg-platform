import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TextBlockView } from "../TextBlockView";
import type { TextBlock } from "@/lib/types";

function makeBlock(overrides: Partial<TextBlock>): TextBlock {
  return {
    id: "text-1",
    position: 2,
    required: false,
    block_type: "text_context",
    variant: "context",
    eyebrow: "LA SITUACIÓN",
    body: "Un texto de contexto.",
    citation: null,
    applies_to: null,
    requires_evidence_block_id: null,
    hero_stat: null,
    checklist_items: null,
    ...overrides,
  };
}

describe("TextBlockView", () => {
  it("context: renders the position watermark and the eyebrow", () => {
    render(<TextBlockView block={makeBlock({})} isCompleted onCompleteBlock={vi.fn()} dimensionCode="P3" />);
    expect(screen.getByText("LA SITUACIÓN")).toBeTruthy();
    // position 2 → marca "03" (1-based, padded).
    expect(screen.getByText("03")).toBeTruthy();
  });

  it("evidence: surfaces the explicit hero_stat as a data point", () => {
    const block = makeBlock({
      block_type: "text_evidence",
      variant: "evidence",
      eyebrow: "LA EVIDENCIA",
      body: "El cuerpo con el dato.",
      hero_stat: { value: "23%", label: "de los casos", source: null },
    });
    render(<TextBlockView block={block} isCompleted onCompleteBlock={vi.fn()} dimensionCode="P1" />);
    expect(screen.getByText("de los casos")).toBeTruthy();
  });

  it("evidence: auto-detects a hero stat from the body when none is set", () => {
    const block = makeBlock({
      block_type: "text_evidence",
      variant: "evidence",
      body: "3 de cada 4 personas no lo hacen.",
    });
    render(<TextBlockView block={block} isCompleted onCompleteBlock={vi.fn()} />);
    // el HeroDataPoint expone el value en un aria-label.
    expect(screen.getByLabelText(/3 de cada 4/)).toBeTruthy();
  });

  it("solution: renders an interactive checklist from explicit items + AI placeholder", () => {
    const block = makeBlock({
      block_type: "text_solution",
      variant: "solution",
      eyebrow: "QUÉ HACER",
      body: "Seguí estos pasos:",
      checklist_items: [
        { title: "Primero esto", detail: null },
        { title: "Después esto otro", detail: "con más detalle" },
      ],
    });
    render(<TextBlockView block={block} isCompleted onCompleteBlock={vi.fn()} dimensionCode="P4" />);
    expect(screen.getByRole("checkbox", { name: "Primero esto" })).toBeTruthy();
    expect(screen.getByRole("checkbox", { name: "Después esto otro" })).toBeTruthy();
    expect(screen.getByText("Guardar en mi cuaderno")).toBeTruthy();
  });

  it("solution: auto-detects a numbered list from the body without duplicating it", () => {
    const block = makeBlock({
      block_type: "text_solution",
      variant: "solution",
      body: "Hacé lo siguiente: 1. Respirá 2. Escuchá 3. Respondé",
    });
    render(<TextBlockView block={block} isCompleted onCompleteBlock={vi.fn()} />);
    expect(screen.getByRole("checkbox", { name: "Respirá" })).toBeTruthy();
    expect(screen.getByRole("checkbox", { name: "Respondé" })).toBeTruthy();
  });
});
