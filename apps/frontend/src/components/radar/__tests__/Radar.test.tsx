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

  it("MiniRadar renders at 120×120", () => {
    const { container } = render(<MiniRadar values={{ P1: 50 }} />);
    const root = container.querySelector("[data-radar-size]");
    expect(root?.getAttribute("data-radar-size")).toBe("mini");
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("width")).toBe("120");
    expect(svg?.getAttribute("height")).toBe("120");
  });
});
