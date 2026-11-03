import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StatCard } from "../stat-card";

describe("InfoTip", () => {
  it("renders the tooltip in a portal on body, outside the glass card, so it stacks above neighbours", () => {
    const { container } = render(
      <StatCard value="52%" label="Adopción" info="Porcentaje de personas activas." />,
    );
    expect(screen.queryByRole("tooltip")).toBeNull();

    fireEvent.mouseEnter(screen.getByRole("note"));
    const tip = screen.getByRole("tooltip");
    expect(tip.textContent).toBe("Porcentaje de personas activas.");
    // Fuera del árbol de la card (que crea su propio contexto de apilamiento).
    expect(container.contains(tip)).toBe(false);
    expect(tip.parentElement).toBe(document.body);
    expect(tip.className).toContain("z-[1000]");

    fireEvent.mouseLeave(screen.getByRole("note"));
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("opens with keyboard focus and closes with Escape", () => {
    render(<StatCard value="1" label="Inactivos" info="Sin actividad hace más de 21 días." />);
    fireEvent.focus(screen.getByRole("note"));
    expect(screen.getByRole("tooltip")).toBeTruthy();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("exposes the explanation to screen readers via aria-label", () => {
    render(<StatCard value="1" label="Inactivos" info="Explicación." />);
    expect(screen.getByRole("note").getAttribute("aria-label")).toBe("Inactivos: Explicación.");
  });

  it("renders no icon without info", () => {
    render(<StatCard value="1" label="Plano" />);
    expect(screen.queryByRole("note")).toBeNull();
  });
});
