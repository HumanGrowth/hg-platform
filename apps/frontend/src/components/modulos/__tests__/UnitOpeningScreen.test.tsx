import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { UnitOpeningScreen } from "../UnitOpeningScreen";
import type { LearningUnitDetail } from "@/lib/types";

const unit: LearningUnitDetail = {
  id: "u1", slug: "test-unit", title: "El que no habla no existe", dimension_code: "CP", pillar_code: null, unit_number: null,
  competency_code: null, level_code: "L1", mentor_id: null, published_at: null,
  estimated_duration_seconds: 180, narrative_tone: "warm", keywords: null,
  blocks: [
    { id: "b1", position: 1, required: true, block_type: "video_intro", video_url: "x", poster_url: null, duration_seconds: 30, subtitle_url: null, transcript_text: null, eyebrow_label: null, chapters: null },
    { id: "b2", position: 2, required: false, block_type: "text_context", variant: "context", eyebrow: "y", body: "z", citation: null, applies_to: null, requires_evidence_block_id: null, hero_stat: null, checklist_items: null },
  ],
};

describe("UnitOpeningScreen", () => {
  it("shows the title, pillar name, step count and starts on click", () => {
    const onStart = vi.fn();
    render(<UnitOpeningScreen unit={unit} onStart={onStart} />);
    expect(screen.getByRole("heading", { name: "El que no habla no existe" })).toBeTruthy();
    // dimension_code "CP" → pilar P1 del DS → "Carrera e impacto".
    expect(screen.getByText("Carrera e impacto")).toBeTruthy();
    expect(screen.getByText(/2 pasos · ~3 min/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Comenzar" }));
    expect(onStart).toHaveBeenCalledTimes(1);
  });
});
