import { describe, expect, it } from "vitest";

import { DIMENSIONS, DIMENSION_CODES, dimensionByCode, dimensionByCareerPath } from "@/lib/dimensions";
import { driveToCareerPath } from "@/lib/dimension-styles";

describe("dimensions registry", () => {
  it("has the 6 canonical dimensions mapped 1:1 to P1..P6", () => {
    expect(DIMENSION_CODES).toEqual(["CP", "PR", "RE", "SA", "PI", "ES"]);
    expect(DIMENSIONS.map((d) => d.careerPath)).toEqual(["P1", "P2", "P3", "P4", "P5", "P6"]);
  });

  it("CP and PR have content today", () => {
    expect(DIMENSIONS.filter((d) => d.hasContent).map((d) => d.code)).toEqual(["CP", "PR"]);
  });

  it("resolves by code case-insensitively", () => {
    expect(dimensionByCode("cp")?.name).toBe("Carrera e impacto");
    expect(dimensionByCode("ES")?.short).toBe("Estabilidad");
    expect(dimensionByCode("nope")).toBeUndefined();
    expect(dimensionByCode(undefined)).toBeUndefined();
  });

  it("resolves by pillar, folding P6A/P6B into ES", () => {
    expect(dimensionByCareerPath("P1")?.code).toBe("CP");
    expect(dimensionByCareerPath("P6A")?.code).toBe("ES");
    expect(dimensionByCareerPath("P6B")?.code).toBe("ES");
  });

  it("ES reevaluates against P6A (resiliencia) since assessment splits P6", () => {
    expect(dimensionByCode("ES")?.assessmentDimension).toBe("P6A");
  });

  it("stays consistent with pillars.driveToCareerPath for every code", () => {
    for (const d of DIMENSIONS) {
      expect(driveToCareerPath(d.code)).toBe(d.careerPath);
    }
  });
});
