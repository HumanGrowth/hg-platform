import { describe, expect, it } from "vitest";

import { customPathBadgeSvgString } from "../custom-path-badge";

describe("customPathBadgeSvgString", () => {
  it("produce un SVG no vacío con el título de ruta y la empresa como micro caption", () => {
    const svg = customPathBadgeSvgString({
      routeName: "Liderazgo integral",
      companyName: "Acme Corp",
      pillars: ["CP", "PR", "SA"],
    });
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain("LIDERAZGO");
    expect(svg).toContain("INTEGRAL");
    expect(svg).toContain("ACME CORP");
  });

  it("elimina el medallión/rank-pips de un solo picto que emite el kit por defecto", () => {
    // Si la regex de stripping deja de matchear (drift en hg-badge-kit.js),
    // el medallion clásico (halo r=16 en cx=100,cy=80) seguiría presente.
    const svg = customPathBadgeSvgString({
      routeName: "Ruta",
      companyName: "Empresa",
      pillars: ["CP"],
    });
    expect(svg).not.toContain('cx="100" cy="80" r="16"');
    expect(svg).not.toContain('cy="60" r="3"');
  });

  it("dibuja un pip por pilar, hasta 5 visibles, con el accent canónico de cada uno", () => {
    const svg = customPathBadgeSvgString({
      routeName: "Ruta",
      companyName: "Empresa",
      pillars: ["CP", "PR", "RE"],
    });
    // Accents canónicos de CP (#e8530a) y PR (#c8a76e) deben aparecer como fill de un pip.
    expect(svg).toContain('fill="#e8530a"');
    expect(svg).toContain('fill="#c8a76e"');
  });

  it("colapsa pilares extra en un pip '+N' cuando hay más de 5", () => {
    const svg = customPathBadgeSvgString({
      routeName: "Ruta",
      companyName: "Empresa",
      pillars: ["CP", "PR", "RE", "SA", "PI", "ES"],
    });
    expect(svg).toContain(">+1<");
  });
});
