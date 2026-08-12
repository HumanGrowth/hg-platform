import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { DimensionResult } from "@/lib/types";

import { DimensionStatesGrid } from "../DimensionStatesGrid";

const { confirmResult } = vi.hoisted(() => ({ confirmResult: vi.fn() }));
vi.mock("@/lib/api", () => ({ apiConfirmResult: confirmResult }));
vi.mock("@/lib/toast-store", () => ({ toast: vi.fn() }));

function result(over: Partial<DimensionResult> = {}): DimensionResult {
  return {
    dimension_code: "P3",
    source: "preliminary",
    state_code: "N3",
    state_label: "Integrado",
    sub_scores: {},
    requires_user_confirmation: false,
    user_confirmed_at: null,
    recaida_detected: false,
    suggested_next_step: "Ser conector.",
    derived_at: new Date().toISOString(),
    next_retake_eligible_at: new Date().toISOString(),
    ...over,
  };
}

beforeEach(() => confirmResult.mockReset());

describe("DimensionStatesGrid", () => {
  it("renders state label + source badge + detail CTA for preliminary", () => {
    render(<DimensionStatesGrid results={[result()]} />);
    expect(screen.getByText("Integrado")).toBeTruthy();
    expect(screen.getByText("Estimación rápida")).toBeTruthy();
    expect(screen.getByText("Evaluar en detalle")).toBeTruthy();
  });

  it("shows recaída badge when detected", () => {
    render(<DimensionStatesGrid results={[result({ dimension_code: "P4", recaida_detected: true })]} />);
    expect(screen.getByText(/Recaída detectada/)).toBeTruthy();
  });

  it("opens confirm modal and calls apiConfirmResult", async () => {
    confirmResult.mockResolvedValue({});
    render(<DimensionStatesGrid results={[result({ requires_user_confirmation: true })]} />);
    fireEvent.click(screen.getByText(/¿Te reconocés en este perfil/));
    fireEvent.click(screen.getByRole("button", { name: /Sí, me reconozco/ }));
    await waitFor(() => expect(confirmResult).toHaveBeenCalledWith("P3"));
  });
});
