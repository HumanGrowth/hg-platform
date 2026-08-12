import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PillarResult } from "@/lib/types";

import { PillarStatesGrid } from "../PillarStatesGrid";

const { confirmResult } = vi.hoisted(() => ({ confirmResult: vi.fn() }));
vi.mock("@/lib/api", () => ({ apiConfirmResult: confirmResult }));
vi.mock("@/lib/toast-store", () => ({ toast: vi.fn() }));

function result(over: Partial<PillarResult> = {}): PillarResult {
  return {
    pillar_code: "P3",
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

describe("PillarStatesGrid", () => {
  it("renders state label + source badge + detail CTA for preliminary", () => {
    render(<PillarStatesGrid results={[result()]} />);
    expect(screen.getByText("Integrado")).toBeTruthy();
    expect(screen.getByText("Estimación rápida")).toBeTruthy();
    expect(screen.getByText("Evaluar en detalle")).toBeTruthy();
  });

  it("shows recaída badge when detected", () => {
    render(<PillarStatesGrid results={[result({ pillar_code: "P4", recaida_detected: true })]} />);
    expect(screen.getByText(/Recaída detectada/)).toBeTruthy();
  });

  it("opens confirm modal and calls apiConfirmResult", async () => {
    confirmResult.mockResolvedValue({});
    render(<PillarStatesGrid results={[result({ requires_user_confirmation: true })]} />);
    fireEvent.click(screen.getByText(/¿Te reconocés en este perfil/));
    fireEvent.click(screen.getByRole("button", { name: /Sí, me reconozco/ }));
    await waitFor(() => expect(confirmResult).toHaveBeenCalledWith("P3"));
  });
});
