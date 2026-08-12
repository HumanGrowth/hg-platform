import { describe, expect, it } from "vitest";

import { pillarBadgeVariant, pillarIconSrc, pillarShortName } from "../pillars";

// Regresión del bug I (web-v3): P5 "claridad" ↔ bulb · P6 "estabilidad" ↔
// scales. Estaban cruzados y se percibía el swap en toda la plataforma.
describe("pillar icon mapping (P5/P6 swap fix)", () => {
  it("P5 Paz interior y claridad usa bulb", () => {
    expect(pillarIconSrc("P5")).toBe("/icons/hex-bulb-128.png");
  });

  it("P6 Estabilidad usa scales (también P6A/P6B)", () => {
    expect(pillarIconSrc("P6")).toBe("/icons/hex-scales-128.png");
    expect(pillarIconSrc("P6A")).toBe("/icons/hex-scales-128.png");
    expect(pillarIconSrc("P6B")).toBe("/icons/hex-scales-128.png");
  });
});

describe("pillar badge/label pairing", () => {
  it("P5 → pillar-p5 (slate) con label Paz interior", () => {
    expect(pillarBadgeVariant("P5")).toBe("pillar-p5");
    expect(pillarShortName("P5")).toBe("Paz interior");
  });

  it("P6 → pillar-p6 (amber) con label Estabilidad", () => {
    expect(pillarBadgeVariant("P6")).toBe("pillar-p6");
    expect(pillarShortName("P6")).toBe("Estabilidad");
  });
});
