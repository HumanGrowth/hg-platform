import { describe, expect, it } from "vitest";

import { DIMENSIONS, DIMENSION_CODES, dimensionByCode, dimensionByPillar } from "@/lib/dimensions";
import { dimensionToPillar } from "@/lib/pillars";

describe("dimensions registry", () => {
  it("has the 6 canonical dimensions mapped 1:1 to P1..P6", () => {
    expect(DIMENSION_CODES).toEqual(["CP", "PR", "RE", "SA", "PI", "ES"]);
    expect(DIMENSIONS.map((d) => d.pillar)).toEqual(["P1", "P2", "P3", "P4", "P5", "P6"]);
  });

  it("only CP has content today", () => {
    expect(DIMENSIONS.filter((d) => d.hasContent).map((d) => d.code)).toEqual(["CP"]);
  });

  it("resolves by code case-insensitively", () => {
    expect(dimensionByCode("cp")?.name).toBe("Carrera e impacto");
    expect(dimensionByCode("ES")?.short).toBe("Estabilidad");
    expect(dimensionByCode("nope")).toBeUndefined();
    expect(dimensionByCode(undefined)).toBeUndefined();
  });

  it("resolves by pillar, folding P6A/P6B into ES", () => {
    expect(dimensionByPillar("P1")?.code).toBe("CP");
    expect(dimensionByPillar("P6A")?.code).toBe("ES");
    expect(dimensionByPillar("P6B")?.code).toBe("ES");
  });

  it("ES reevaluates against P6A (resiliencia) since assessment splits P6", () => {
    expect(dimensionByCode("ES")?.assessmentPillar).toBe("P6A");
  });

  it("stays consistent with pillars.dimensionToPillar for every code", () => {
    for (const d of DIMENSIONS) {
      expect(dimensionToPillar(d.code)).toBe(d.pillar);
    }
  });
});
