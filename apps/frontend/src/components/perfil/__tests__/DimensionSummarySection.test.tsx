import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DimensionSummarySection } from "../DimensionSummarySection";
import type { DimensionResult } from "@/lib/types";

vi.mock("@/lib/api", () => ({ apiConfirmResult: vi.fn() }));

function result(pillar: DimensionResult["dimension_code"], state: string): DimensionResult {
  return {
    dimension_code: pillar,
    source: "confirmed",
    state_code: state,
    state_label: state,
    sub_scores: {},
    requires_user_confirmation: false,
    user_confirmed_at: null,
    recaida_detected: false,
    suggested_next_step: null,
    derived_at: new Date().toISOString(),
    next_retake_eligible_at: new Date(Date.now() - 1000).toISOString(), // ya reevaluable
  };
}

describe("DimensionSummarySection", () => {
  it("renders one unified card per dimension, with state + reevaluate or 'Sin evaluar'", () => {
    render(
      <DimensionSummarySection
        results={[result("P1", "En construcción")]}
        radar={{ P1: 55 }}
      />,
    );

    // Las 6 dimensiones aparecen (una card cada una).
    for (const name of [
      "Carrera e impacto",
      "Propósito y significado",
      "Estabilidad emocional y material",
    ]) {
      expect(screen.getByText(name)).toBeTruthy();
    }
    // CP tiene resultado → estado + score + Re-evaluar.
    expect(screen.getByText("En construcción")).toBeTruthy();
    expect(screen.getByText("55")).toBeTruthy();
    expect(screen.getByText("Re-evaluar")).toBeTruthy();
    // Las dimensiones sin resultado muestran "Sin evaluar" + "Evaluar".
    expect(screen.getAllByText("Sin evaluar").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Evaluar").length).toBeGreaterThan(0);
    // Cada card enlaza a su página de dimensión.
    const verLinks = screen.getAllByText("Ver dimensión");
    expect(verLinks.length).toBe(6);
  });

  it("maps ES to its P6A assessment result (P6 split)", () => {
    render(
      <DimensionSummarySection results={[result("P6A", "Resiliente")]} radar={{ P6: 80 }} />,
    );
    expect(screen.getByText("Resiliente")).toBeTruthy();
    expect(screen.getByText("80")).toBeTruthy();
  });
});
