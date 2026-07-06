import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// El radar (MarketingRadar en /metodo) usa useRouter.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

import MetodoPage from "@/app/(marketing)/metodo/page";
import Hero from "@/components/marketing/Hero";
import Nav from "@/components/marketing/Nav";
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
  it("shows the four ways to grow and a Ver todo link to /paths", () => {
    render(<WhatWeOffer />);
    expect(screen.getByText("Cuatro formas de crecer con intención.")).toBeTruthy();
    expect(screen.getByText("01 · DIAGNÓSTICO")).toBeTruthy();
    expect(screen.getByText("04 · EVENTOS")).toBeTruthy();
    const link = screen.getByRole("link", { name: /Ver todo/ });
    expect(link.getAttribute("href")).toBe("/paths");
  });
});

describe("PricingTable", () => {
  it("is a single custom-plan card pointing to /contacto", () => {
    render(<PricingTable />);
    expect(screen.getByText("PLAN A LA MEDIDA")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Conversemos/ }).getAttribute("href")).toBe("/contacto");
    // web-v2: eyebrow "PRECIOS", sin "Tarifas"
    expect(screen.getByText("PRECIOS")).toBeTruthy();
    expect(screen.queryByText(/Tarifas/)).toBeNull();
  });
});

describe("Hero (web-v2)", () => {
  it("shows the new H1 and a 'Ver dimensiones' scroll button", () => {
    render(<Hero />);
    expect(screen.getByText(/Habilidades humanas para decisiones/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Ver dimensiones" })).toBeTruthy();
  });
});

describe("Nav (web-v2)", () => {
  it("renders the 5 tabs and no 'Solicitar unirse'", () => {
    render(<Nav />);
    for (const tab of ["Plataforma", "Ciencia", "Perspectivas", "Precios", "Blog"]) {
      expect(screen.getAllByText(tab).length).toBeGreaterThan(0);
    }
    expect(screen.queryByText(/Solicitar unirse/)).toBeNull();
  });
});

describe("MetodoPage", () => {
  it("renders the system principle, the 6 pillars, rigor & sources", () => {
    render(<MetodoPage />);
    // "Un sistema, no seis módulos"
    expect(screen.getByText("Los seis pilares son una red, no una lista.")).toBeTruthy();
    // Los 6 pilares (headers del accordion, siempre presentes)
    for (const name of ["Carrera e impacto", "Estabilidad emocional y material"]) {
      expect(screen.getByText(name)).toBeTruthy();
    }
    // Rigor y límites (transparencia = diferenciador de marca)
    expect(screen.getByText("Correlación vs. causalidad")).toBeTruthy();
    // Fuentes numeradas
    expect(screen.getByText(/Holt-Lunstad/)).toBeTruthy();
  });
});
