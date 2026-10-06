import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { OnboardingTour } from "../OnboardingTour";

describe("OnboardingTour", () => {
  it("advances through steps and finishes with 'finish'", () => {
    const onDone = vi.fn();
    render(<OnboardingTour userName="Ana" onDone={onDone} />);
    // Paso 1: bienvenida personalizada.
    expect(screen.getByText("Te damos la bienvenida, Ana")).toBeTruthy();
    // Avanzar hasta el último de 6 pasos.
    for (let i = 0; i < 6; i++) fireEvent.click(screen.getByText("Siguiente"));
    const finish = screen.getByText("Comenzar mi primer módulo");
    fireEvent.click(finish);
    expect(onDone).toHaveBeenCalledWith("finish");
  });

  it("skips via the Saltar button", () => {
    const onDone = vi.fn();
    render(<OnboardingTour userName="Ana" onDone={onDone} />);
    fireEvent.click(screen.getByText("Saltar"));
    expect(onDone).toHaveBeenCalledWith("skip");
  });

  it("ancla el spotlight al elemento VISIBLE cuando SideNav y BottomNav comparten data-tour-id", () => {
    const rect = (r: Partial<DOMRect>) => () => r as DOMRect;
    const hidden = document.createElement("a");
    hidden.setAttribute("data-tour-id", "nav-home");
    hidden.getBoundingClientRect = rect({ top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 });
    const visible = document.createElement("a");
    visible.setAttribute("data-tour-id", "nav-home");
    visible.getBoundingClientRect = rect({ top: 200, left: 24, right: 224, bottom: 240, width: 200, height: 40 });
    document.body.append(hidden, visible);

    const { container } = render(<OnboardingTour userName="Ana" onDone={vi.fn()} />);
    fireEvent.click(screen.getByText("Siguiente")); // paso "Inicio" (nav-home)

    const spot = Array.from(container.querySelectorAll<HTMLElement>("div[aria-hidden]")).find((el) =>
      el.style.boxShadow.includes("9999px"),
    );
    expect(spot).toBeTruthy();
    expect(spot!.style.top).toBe("192px"); // 200 - 8
    expect(spot!.style.left).toBe("16px"); // 24 - 8
    hidden.remove();
    visible.remove();
  });
});
