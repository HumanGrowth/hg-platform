import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { MyBehaviorEvaluation } from "@/lib/types";

import { DimensionFeedbackSection } from "../DimensionFeedbackSection";

const { getFeedback } = vi.hoisted(() => ({ getFeedback: vi.fn() }));
vi.mock("@/lib/api", () => ({ apiGetMyBehaviorFeedback: getFeedback }));

function evaluation(overrides: Partial<MyBehaviorEvaluation>): MyBehaviorEvaluation {
  return {
    behavior_id: "b1",
    dimension_code: "CP",
    pillar_code: "P1",
    text: "Toma iniciativa sin que se lo pidan",
    rating: 3,
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

beforeEach(() => {
  getFeedback.mockReset();
});

describe("DimensionFeedbackSection (H8: el colaborador ve su propio feedback)", () => {
  it("renders nothing while loading or when there is nothing for this dimension", async () => {
    getFeedback.mockResolvedValue([evaluation({ dimension_code: "PR" })]);
    const { container } = render(<DimensionFeedbackSection dimensionCode="CP" />);
    await waitFor(() => expect(getFeedback).toHaveBeenCalled());
    expect(container.textContent).toBe("");
  });

  it("shows the manager's rating per behavior, filtered to this dimension", async () => {
    getFeedback.mockResolvedValue([
      evaluation({ behavior_id: "b1", rating: 3, text: "Comportamiento A" }),
      evaluation({ behavior_id: "b2", rating: 1, text: "Comportamiento B" }),
      evaluation({ dimension_code: "PR", text: "De otra dimensión" }),
    ]);
    render(<DimensionFeedbackSection dimensionCode="CP" />);

    await waitFor(() => expect(screen.getByText("Comportamiento A")).toBeTruthy());
    expect(screen.getByText("Comportamiento B")).toBeTruthy();
    expect(screen.queryByText("De otra dimensión")).toBeNull();
    expect(screen.getByText("Demostrando")).toBeTruthy();
    expect(screen.getByText("Sin demostrar")).toBeTruthy();
    expect(screen.getByText("Pendiente de aprobación.")).toBeTruthy();
  });

  it("says approved when every behavior is 'Demostrando'", async () => {
    getFeedback.mockResolvedValue([evaluation({ rating: 3 })]);
    render(<DimensionFeedbackSection dimensionCode="CP" />);
    await waitFor(() => expect(screen.getByText(/^Aprobado/)).toBeTruthy());
  });

  it("never shows manager notes (privacy — the endpoint doesn't send them)", async () => {
    getFeedback.mockResolvedValue([evaluation({})]);
    const { container } = render(<DimensionFeedbackSection dimensionCode="CP" />);
    await waitFor(() => expect(screen.getByText("Toma iniciativa sin que se lo pidan")).toBeTruthy());
    expect(container.textContent).not.toMatch(/nota/i);
  });
});
