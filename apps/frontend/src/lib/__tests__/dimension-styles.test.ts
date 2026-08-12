import { describe, expect, it } from "vitest";

import { dimensionBadgeVariant, dimensionIconSrc, dimensionShortName } from "../dimension-styles";

// Regresión del bug I (web-v3): P5 "claridad" ↔ bulb · P6 "estabilidad" ↔
// scales. Estaban cruzados y se percibía el swap en toda la plataforma.
describe("pillar icon mapping (P5/P6 swap fix)", () => {
  it("P5 Paz interior y claridad usa bulb", () => {
    expect(dimensionIconSrc("P5")).toBe("/icons/hex-bulb-128.png");
  });

  it("P6 Estabilidad usa scales (también P6A/P6B)", () => {
    expect(dimensionIconSrc("P6")).toBe("/icons/hex-scales-128.png");
    expect(dimensionIconSrc("P6A")).toBe("/icons/hex-scales-128.png");
    expect(dimensionIconSrc("P6B")).toBe("/icons/hex-scales-128.png");
  });
});

describe("pillar badge/label pairing", () => {
  it("P5 → dimension-p5 (slate) con label Paz interior", () => {
    expect(dimensionBadgeVariant("P5")).toBe("dimension-p5");
    expect(dimensionShortName("P5")).toBe("Paz interior");
  });

  it("P6 → dimension-p6 (amber) con label Estabilidad", () => {
    expect(dimensionBadgeVariant("P6")).toBe("dimension-p6");
    expect(dimensionShortName("P6")).toBe("Estabilidad");
  });
});
