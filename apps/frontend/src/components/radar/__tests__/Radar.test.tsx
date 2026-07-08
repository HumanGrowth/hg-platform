import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { MiniRadar } from "../MiniRadar";
import { Radar } from "../Radar";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

describe("Radar", () => {
  it("renders empty state without values", () => {
    const { container } = render(<Radar values={{}} state="empty" />);
    const root = container.querySelector("[data-radar-state]");
    expect(root?.getAttribute("data-radar-state")).toBe("empty");
    // empty no expone la lista de valores
    expect(screen.queryByTestId("radar-value-P1")).toBeNull();
    // sí renderiza un svg (la grilla/ejes)
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("renders complete state with correct values", () => {
    render(<Radar values={{ P1: 72, P4: 38 }} state="complete" />);
    expect(screen.getByTestId("radar-value-P1").textContent).toContain("72");
    expect(screen.getByTestId("radar-value-P4").textContent).toContain("38");
    // pilares sin valor caen a 0
    expect(screen.getByTestId("radar-value-P2").textContent).toContain("0");
  });

  it("renders growth mesh + axis pillar badges (web-v3)", () => {
    const { container } = render(
      <Radar
        values={{ P1: 62, P5: 48 }}
        growth={{ P1: 90, P5: 90 }}
        state="complete"
        size="large"
      />,
    );
    // dos mallas: growth (verde) + current
    expect(screen.getByTestId("radar-value-P1").textContent).toContain("crecimiento: 90");
    expect(screen.getByText("Crecimiento")).toBeTruthy();
    expect(screen.getByText("Estado actual")).toBeTruthy();
    // ejes con badge de pilar (label corto) en vez de "P#"
    const axis = container.querySelector('[data-testid="radar-axis-P5"]');
    expect(axis?.textContent).toContain("Paz interior");
    expect(axis?.textContent).not.toContain("P5");
  });

  it("MiniRadar renders at 120×120", () => {
    const { container } = render(<MiniRadar values={{ P1: 50 }} />);
    const root = container.querySelector("[data-radar-size]");
    expect(root?.getAttribute("data-radar-size")).toBe("mini");
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("width")).toBe("120");
    expect(svg?.getAttribute("height")).toBe("120");
  });
});
