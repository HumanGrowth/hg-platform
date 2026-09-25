import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { BehaviorMatrix } from "@/lib/types";

import { BehaviorMatrixCard } from "../BehaviorMatrixCard";

const { getMatrix, upsert, getFeedback, upsertFeedback } = vi.hoisted(() => ({
  getMatrix: vi.fn(),
  upsert: vi.fn(),
  getFeedback: vi.fn(),
  upsertFeedback: vi.fn(),
}));
vi.mock("@/lib/api", () => ({
  apiGetBehaviorMatrix: getMatrix,
  apiUpsertBehaviorEvaluations: upsert,
  apiGetPillarFeedback: getFeedback,
  apiUpsertPillarFeedback: upsertFeedback,
  ApiError: class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
}));

function makeMatrix(overrides?: Partial<BehaviorMatrix>): BehaviorMatrix {
  return {
    dimension_code: "CP",
    dimension_name: "Carrera",
    current_pillar_code: "P1",
    manager_pct: null,
    manager_approved: false,
    pillars: [
      {
        pillar_code: "P1",
        pillar_name: "Adaptabilidad de aprendizaje",
        is_current: true,
        behaviors: [
          {
            behavior_id: "b1",
            text: "Busca feedback y lo aplica",
            order_index: 0,
            rating: null,
            updated_at: null,
            evaluated_by_name: null,
          },
        ],
      },
      {
        pillar_code: "P2",
        pillar_name: "Excelencia operativa",
        is_current: false,
        behaviors: [
          {
            behavior_id: "b2",
            text: "Cumple sus compromisos",
            order_index: 0,
            rating: null,
            updated_at: null,
            evaluated_by_name: null,
          },
        ],
      },
    ],
    ...overrides,
  };
}

beforeEach(() => {
  getMatrix.mockReset();
  upsert.mockReset();
});

/** Matriz de un solo pilar/comportamiento — evita ambigüedad de queries entre
 * el pilar en curso y el acordeón (jsdom no aplica el CSS que oculta el
 * contenido cerrado de `<details>`, así que ambos quedan "visibles" para
 * testing-library aunque uno esté colapsado). */
function singlePillarMatrix(overrides?: Partial<BehaviorMatrix>): BehaviorMatrix {
  const base = makeMatrix(overrides);
  return { ...base, pillars: [base.pillars[0]] };
}

describe("BehaviorMatrixCard", () => {
  beforeEach(() => {
    getFeedback.mockReset();
    getFeedback.mockResolvedValue([]);
    upsertFeedback.mockReset();
  });

  it("renders the current pillar's behaviors and an accordion for the rest", async () => {
    getMatrix.mockResolvedValue(makeMatrix());
    render(<BehaviorMatrixCard userId="u1" />);
    await waitFor(() => expect(screen.getByText("Busca feedback y lo aplica")).toBeTruthy());
    expect(screen.getByText(/Otros pilares de Carrera/)).toBeTruthy();
  });

  it("rates a behavior optimistically and saves via PUT", async () => {
    getMatrix.mockResolvedValue(singlePillarMatrix());
    upsert.mockResolvedValue(singlePillarMatrix({ manager_pct: 100, manager_approved: true }));
    render(<BehaviorMatrixCard userId="u1" />);
    await waitFor(() => expect(screen.getByText("Busca feedback y lo aplica")).toBeTruthy());

    fireEvent.click(screen.getByRole("radio", { name: "Demostrando" }));
    await waitFor(() =>
      expect(upsert).toHaveBeenCalledWith("u1", [{ behavior_id: "b1", rating: 3 }]),
    );
    await waitFor(() => expect(screen.getByText(/Aprobado/)).toBeTruthy());
  });

  it("reverts the optimistic rating if the save fails", async () => {
    getMatrix.mockResolvedValue(singlePillarMatrix());
    upsert.mockRejectedValue(new Error("network"));
    render(<BehaviorMatrixCard userId="u1" />);
    await waitFor(() => expect(screen.getByText("Busca feedback y lo aplica")).toBeTruthy());

    const button = screen.getByRole("radio", { name: "Demostrando" });
    fireEvent.click(button);
    await waitFor(() => expect(upsert).toHaveBeenCalled());
    await waitFor(() => expect(button.getAttribute("aria-checked")).toBe("false"));
  });

  it("shows a pending message when the manager hasn't approved yet", async () => {
    getMatrix.mockResolvedValue(singlePillarMatrix({ manager_approved: false }));
    render(<BehaviorMatrixCard userId="u1" />);
    await waitFor(() => expect(screen.getByText(/Pendiente de aprobación/)).toBeTruthy());
  });

  it("saves the pillar feedback only when the manager clicks the button", async () => {
    getMatrix.mockResolvedValue(singlePillarMatrix());
    upsertFeedback.mockResolvedValue({
      pillar_code: "P1", dimension_code: "CP", text: "Muy bien", updated_at: new Date().toISOString(),
      manager_name: "Ana",
    });
    render(<BehaviorMatrixCard userId="u1" />);
    const box = await screen.findByLabelText("Feedback que impulsa");
    const button = screen.getByRole("button", { name: "Guardar feedback" }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);

    fireEvent.change(box, { target: { value: "Muy bien" } });
    expect(upsertFeedback).not.toHaveBeenCalled(); // sin autosave
    fireEvent.click(button);
    await waitFor(() => expect(upsertFeedback).toHaveBeenCalledWith("u1", "CP", "P1", "Muy bien"));
  });

  it("prefills the saved feedback and keeps the matrix usable if feedback fails to load", async () => {
    getMatrix.mockResolvedValue(singlePillarMatrix());
    getFeedback.mockResolvedValue([
      { pillar_code: "P1", dimension_code: "CP", text: "Ya escrito", updated_at: new Date().toISOString(), manager_name: "Ana" },
    ]);
    const { unmount } = render(<BehaviorMatrixCard userId="u1" />);
    await waitFor(() =>
      expect((screen.getByLabelText("Feedback que impulsa") as HTMLTextAreaElement).value).toBe("Ya escrito"),
    );
    unmount();

    getFeedback.mockRejectedValue(new Error("boom"));
    render(<BehaviorMatrixCard userId="u1" />);
    await waitFor(() => expect(screen.getByText("Busca feedback y lo aplica")).toBeTruthy());
  });
});
