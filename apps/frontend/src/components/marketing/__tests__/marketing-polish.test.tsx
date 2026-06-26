import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import CienciaPage from "@/app/(marketing)/ciencia/page";
import PricingTable from "@/components/marketing/PricingTable";
import SixPillars from "@/components/marketing/SixPillars";
import WhatWeOffer from "@/components/marketing/WhatWeOffer";

describe("SixPillars", () => {
  it("renders the 6 dimensions", () => {
    render(<SixPillars />);
    for (const name of [
      "Carrera e impacto",
      "Propósito y significado",
      "Relaciones y conexión",
      "Salud y bienestar",
      "Paz interior y claridad",
      "Estabilidad emocional y material",
    ]) {
      expect(screen.getByText(name)).toBeTruthy();
    }
  });
});

describe("WhatWeOffer", () => {
  it("shows honest roadmap copy and a Ver todo link to /paths", () => {
    render(<WhatWeOffer />);
    expect(screen.getAllByText("En roadmap Q4 2026").length).toBe(2);
    const link = screen.getByRole("link", { name: /Ver todo/ });
    expect(link.getAttribute("href")).toBe("/paths");
  });
});

describe("PricingTable", () => {
  it("is a single custom-plan card pointing to /contacto", () => {
    render(<PricingTable />);
    expect(screen.getByText("PLAN A LA MEDIDA")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Conversemos/ }).getAttribute("href")).toBe("/contacto");
    // sin toggle mensual/anual
    expect(screen.queryByText(/Mensual/)).toBeNull();
  });
});

describe("CienciaPage", () => {
  it("renders the 6 instruments + the anti-generative-AI stance", () => {
    render(<CienciaPage />);
    expect(screen.getByText("MLQ-10 (Steger)")).toBeTruthy();
    expect(screen.getByText("CD-RISC-10 (Connor-Davidson)")).toBeTruthy();
    expect(
      screen.getByText(/Por qué no usamos AI generativo para clasificar tu perfil/),
    ).toBeTruthy();
  });
});
