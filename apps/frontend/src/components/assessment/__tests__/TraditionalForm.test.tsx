import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { AssessmentItem } from "@/lib/types";

import { TraditionalForm } from "../TraditionalForm";

function likert(response_type: AssessmentItem["response_type"], min: number, max: number): AssessmentItem {
  return {
    id: "i1", item_code: "X-1", pillar_code: "P5", sub_scale: null, sub_domain: null,
    response_type, scale_min: min, scale_max: max, prompt: "¿Pregunta likert?", order_index: 1,
    options: null,
  };
}

const mc: AssessmentItem = {
  id: "i2", item_code: "PRO-1b", pillar_code: "P4", sub_scale: "Intención", sub_domain: "Sueño",
  response_type: "multiple_choice", scale_min: 1, scale_max: 5, prompt: "¿Cuál te describe?",
  order_index: 1,
  options: [
    { id: "o1", order_index: 0, label: "Opción A", value: 1 },
    { id: "o2", order_index: 1, label: "Opción B", value: 2 },
  ],
};

describe("TraditionalForm", () => {
  it("renders likert_1_7 with 7 buttons and submits the value", () => {
    const onSubmit = vi.fn();
    render(<TraditionalForm item={likert("likert_1_7", 1, 7)} onSubmit={onSubmit} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBe(7);
    fireEvent.click(screen.getByLabelText(/^5 —/));
    expect(onSubmit).toHaveBeenCalledWith(5);
  });

  it("renders likert_0_4 with 5 buttons starting at 0", () => {
    render(<TraditionalForm item={likert("likert_0_4", 0, 4)} onSubmit={vi.fn()} />);
    expect(screen.getAllByRole("button").length).toBe(5);
    expect(screen.getByLabelText(/^0 —/)).toBeTruthy();
  });

  it("renders likert_1_5 with extreme labels", () => {
    render(<TraditionalForm item={likert("likert_1_5", 1, 5)} onSubmit={vi.fn()} />);
    expect(screen.getByText("Totalmente en desacuerdo")).toBeTruthy();
    expect(screen.getByText("Totalmente de acuerdo")).toBeTruthy();
  });

  it("renders multiple_choice options and submits the option value", () => {
    const onSubmit = vi.fn();
    render(<TraditionalForm item={mc} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByText("Opción B"));
    expect(onSubmit).toHaveBeenCalledWith(2);
  });

  it("shows progress and disables buttons while loading", () => {
    render(<TraditionalForm item={mc} onSubmit={vi.fn()} isLoading answered={3} total={18} />);
    expect(screen.getByText("3 de 18")).toBeTruthy();
    const btn = screen.getByText("Opción A").closest("button") as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });
});
