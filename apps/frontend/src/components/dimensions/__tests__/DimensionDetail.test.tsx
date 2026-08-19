import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DimensionDetail } from "../DimensionDetail";
import { dimensionByCode } from "@/lib/dimensions";
import type { LearningUnitFeedItem, DimensionResult } from "@/lib/types";

const { getMyResults, listModulosByDimension } = vi.hoisted(() => ({
  getMyResults: vi.fn(),
  listModulosByDimension: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  apiGetMyResults: getMyResults,
  apiListModulosByDimension: listModulosByDimension,
}));

const result: DimensionResult = {
  dimension_code: "P1",
  source: "confirmed",
  state_code: "L3",
  state_label: "En construcción",
  sub_scores: {},
  requires_user_confirmation: false,
  user_confirmed_at: null,
  recaida_detected: false,
  suggested_next_step: null,
  derived_at: new Date().toISOString(),
  next_retake_eligible_at: new Date().toISOString(),
};

const unit: LearningUnitFeedItem = {
  id: "u1",
  slug: "cp-l1-p1-001",
  title: "Antes de seguir",
  dimension_code: "CP",
  pillar_code: "P1",
  unit_number: 1,
  level_code: "L1",
  estimated_duration_seconds: 300,
  blocks_count: 5,
  attempt_status: "not_started",
  poster_url: null,
};

describe("DimensionDetail", () => {
  beforeEach(() => {
    getMyResults.mockReset();
    listModulosByDimension.mockReset();
  });

  it("renders header, score, state label and units for a dimension with content (CP)", async () => {
    getMyResults.mockResolvedValue({ results: [result] });
    listModulosByDimension.mockResolvedValue([unit]);

    render(<DimensionDetail dimension={dimensionByCode("CP")!} />);

    expect(screen.getByText("Carrera e impacto")).toBeTruthy();
    // Aparece 2 veces: en el hero de progreso y en el historial.
    await waitFor(() => expect(screen.getAllByText("En construcción").length).toBeGreaterThan(0));
    expect(screen.getByText("Antes de seguir")).toBeTruthy();
    // Reevaluar apunta al flujo de assessment por dimensión.
    const reeval = screen.getByText("Reevaluar").closest("a") as HTMLAnchorElement;
    expect(reeval.getAttribute("href")).toBe("/onboarding/detail/P1");
  });

  it("shows 'Contenido próximamente' and does not fetch units for a dimension without content", async () => {
    getMyResults.mockResolvedValue({ results: [] });

    render(<DimensionDetail dimension={dimensionByCode("RE")!} />);

    await waitFor(() =>
      expect(screen.getByText("Contenido próximamente para esta dimensión")).toBeTruthy(),
    );
    expect(listModulosByDimension).not.toHaveBeenCalled();
    // Sin evaluación previa → CTA "Evaluar" hacia el careerPath de RE (P3).
    const cta = screen.getByText("Evaluar").closest("a") as HTMLAnchorElement;
    expect(cta.getAttribute("href")).toBe("/onboarding/detail/P3");
    expect(screen.getByText("Todavía no evaluaste esta dimensión")).toBeTruthy();
  });
});
