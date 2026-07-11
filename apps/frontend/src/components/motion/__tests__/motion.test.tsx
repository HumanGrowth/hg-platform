import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// Simula prefers-reduced-motion: reduce a nivel de framer-motion.
vi.mock("framer-motion", async (importOriginal) => {
  const actual = await importOriginal<typeof import("framer-motion")>();
  return { ...actual, useReducedMotion: () => true };
});

import { MotionSection } from "../MotionSection";
import { PartnerMarquee } from "../PartnerMarquee";
import { Typewriter } from "../Typewriter";
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

describe("PartnerMarquee (reduced motion)", () => {
  it("renderiza los logos sin duplicar (fallback estático)", () => {
    render(
      <PartnerMarquee>
        {["ACME", "NOVA", "DELTA"].map((n) => (
          <span key={n}>{n}</span>
        ))}
      </PartnerMarquee>,
    );
    expect(screen.getAllByText("ACME")).toHaveLength(1);
    expect(screen.getAllByText("NOVA")).toHaveLength(1);
    expect(screen.getAllByText("DELTA")).toHaveLength(1);
  });
});

describe("Typewriter (reduced motion)", () => {
  it("renderiza el texto completo de inmediato, sin cursor", () => {
    const { container } = render(<Typewriter as="p" text="Hasta ahora." />);
    expect(screen.getByText("Hasta ahora.")).toBeTruthy();
    // sin motion: no hay aria-label (el texto real ya está completo, no
    // necesita la muleta de accesibilidad del modo animado)
    expect(container.querySelector("[aria-label]")).toBeNull();
  });
});
