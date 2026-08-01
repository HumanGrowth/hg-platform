import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { OnboardingTour } from "../OnboardingTour";

describe("OnboardingTour", () => {
  it("advances through steps and finishes with 'finish'", () => {
    const onDone = vi.fn();
    render(<OnboardingTour userName="Ana" onDone={onDone} />);
    // Paso 1: bienvenida personalizada.
    expect(screen.getByText("Bienvenida, Ana")).toBeTruthy();
    // Avanzar hasta el último de 6 pasos.
    for (let i = 0; i < 5; i++) fireEvent.click(screen.getByText("Siguiente"));
    const finish = screen.getByText("Empezar con el módulo introductorio");
    fireEvent.click(finish);
    expect(onDone).toHaveBeenCalledWith("finish");
  });

  it("skips via the Saltar button", () => {
    const onDone = vi.fn();
    render(<OnboardingTour userName="Ana" onDone={onDone} />);
    fireEvent.click(screen.getByText("Saltar"));
    expect(onDone).toHaveBeenCalledWith("skip");
  });
});
