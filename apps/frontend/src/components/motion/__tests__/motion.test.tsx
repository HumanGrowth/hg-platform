import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// Simula prefers-reduced-motion: reduce a nivel de framer-motion.
vi.mock("framer-motion", async (importOriginal) => {
  const actual = await importOriginal<typeof import("framer-motion")>();
  return { ...actual, useReducedMotion: () => true };
});

import { MotionSection } from "../MotionSection";
import { useShouldAnimate } from "@/lib/motion/useShouldAnimate";

function Probe() {
  return <span data-testid="probe">{String(useShouldAnimate())}</span>;
}

describe("useShouldAnimate (prefers-reduced-motion: reduce)", () => {
  it("retorna false cuando el usuario prefiere reduced motion", () => {
    render(<Probe />);
    expect(screen.getByTestId("probe").textContent).toBe("false");
  });
});

describe("MotionSection (reduced motion)", () => {
  it("renderiza children en el tag plano, sin atributos de framer", () => {
    const { container } = render(
      <MotionSection as="div" className="wrapper" id="sec">
        <p>contenido</p>
      </MotionSection>,
    );
    const el = container.querySelector("#sec");
    expect(el?.tagName).toBe("DIV");
    expect(el?.className).toBe("wrapper");
    expect(screen.getByText("contenido")).toBeTruthy();
    // sin motion: framer no inyecta style de opacity/transform inicial
    expect((el as HTMLElement).style.opacity).toBe("");
    expect((el as HTMLElement).style.transform).toBe("");
  });
});
