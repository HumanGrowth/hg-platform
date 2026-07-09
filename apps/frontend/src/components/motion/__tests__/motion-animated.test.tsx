import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

// Sin mock de useReducedMotion: matchMedia stub de test/setup.ts devuelve
// matches:false por defecto → estos componentes toman el camino animado.
import { sawtoothPath } from "../BrandSawWave";
import { StaggerBounceGrid } from "../StaggerBounceGrid";

describe("StaggerBounceGrid (animado)", () => {
  it("propaga los children envueltos, preservando su contenido", () => {
    render(
      <StaggerBounceGrid className="grid">
        <article key="a">Carrera</article>
        <article key="b">Propósito</article>
      </StaggerBounceGrid>,
    );
    expect(screen.getByText("Carrera")).toBeTruthy();
    expect(screen.getByText("Propósito")).toBeTruthy();
  });
});

describe("sawtoothPath", () => {
  it("genera el path correcto para teeth=8, width=200, height=24", () => {
    const path = sawtoothPath(200, 24, 8);
    expect(path).toBe(
      "M 0 12 L 12.5 0 L 25 12 L 37.5 0 L 50 12 L 62.5 0 L 75 12 L 87.5 0 L 100 12" +
        " L 112.5 0 L 125 12 L 137.5 0 L 150 12 L 162.5 0 L 175 12 L 187.5 0 L 200 12",
    );
    // 8 dientes → 8 picos en y=0
    expect(path.match(/ 0(?= L)/g)).toHaveLength(8);
  });
});
