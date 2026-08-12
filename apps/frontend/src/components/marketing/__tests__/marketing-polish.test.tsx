import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// El radar (MarketingRadar en /metodo) usa useRouter.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

import MetodoPage from "@/app/(marketing)/metodo/page";
import Hero from "@/components/marketing/Hero";
import { MarketingLanguageProvider } from "@/components/marketing/LanguageProvider";
import Nav from "@/components/marketing/Nav";
import PricingTable from "@/components/marketing/PricingTable";
import SixPillars from "@/components/marketing/SixPillars";
import WhatWeOffer from "@/components/marketing/WhatWeOffer";

/** Los componentes de marketing leen copy del MarketingLanguageProvider. */
function renderMk(ui: React.ReactElement) {
  return render(<MarketingLanguageProvider>{ui}</MarketingLanguageProvider>);
}

describe("SixPillars", () => {
  it("renders the 6 dimensions", () => {
    renderMk(<SixPillars />);
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
    renderMk(<WhatWeOffer />);
    expect(screen.getByText("Cuatro formas de crecer con intención.")).toBeTruthy();
    expect(screen.getByText("01 · DIAGNÓSTICO")).toBeTruthy();
    expect(screen.getByText("04 · EVENTOS")).toBeTruthy();
    const link = screen.getByRole("link", { name: /Ver todo/ });
    expect(link.getAttribute("href")).toBe("/paths");
  });
});

describe("PricingTable", () => {
  it("is a single custom-plan card pointing to /contacto", () => {
    renderMk(<PricingTable />);
    expect(screen.getByText("PLAN A LA MEDIDA")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Conversemos/ }).getAttribute("href")).toBe("/contacto");
    // web-v2: eyebrow "PRECIOS", sin "Tarifas"
    expect(screen.getByText("PRECIOS")).toBeTruthy();
    expect(screen.queryByText(/Tarifas/)).toBeNull();
  });
});

describe("Hero (web-v2)", () => {
  it("shows the new H1 and a 'Ver dimensiones' scroll button", () => {
    renderMk(<Hero />);
    expect(screen.getByText(/Habilidades Humanas ·/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Ver dimensiones" })).toBeTruthy();
  });
});

describe("Nav (web-v3)", () => {
  it("renders the 4 tabs (Blog out, Método rename) and no 'Solicitar unirse'", () => {
    renderMk(<Nav />);
    for (const tab of ["Plataforma", "Método", "Perspectivas", "Precios"]) {
      expect(screen.getAllByText(tab).length).toBeGreaterThan(0);
    }
    expect(screen.queryByText("Blog")).toBeNull();
    expect(screen.queryByText("Ciencia")).toBeNull();
    expect(screen.queryByText(/Solicitar unirse/)).toBeNull();
  });
});

describe("MetodoPage", () => {
  it("renders the system principle, the 6 pillars, rigor & sources", () => {
    renderMk(<MetodoPage />);
    // "Un sistema, no seis módulos"
    expect(screen.getByText("Los seis pilares son una red, no una lista.")).toBeTruthy();
    // Los 6 pilares (headers del accordion, siempre presentes)
    for (const name of ["Carrera e impacto", "Estabilidad emocional y material"]) {
      expect(screen.getByText(name)).toBeTruthy();
    }
    // Rigor y límites (transparencia = diferenciador de marca)
    expect(screen.getByText("Correlación vs. causalidad")).toBeTruthy();
    // web-v3: sin sección de referencias ni citas académicas
    expect(screen.queryByText(/Holt-Lunstad/)).toBeNull();
    expect(screen.queryByText("Referencias citadas.")).toBeNull();
  });
});
