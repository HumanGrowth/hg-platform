import { describe, expect, it } from "vitest";

import { formatUnitCode, isValidUnitCode, parseUnitCode } from "../unitCode";

describe("parseUnitCode", () => {
  it("parses a canonical code", () => {
    expect(parseUnitCode("CP-L1-P2-001")).toEqual({ dimension: "CP", level: 1, pillar: 2, number: 1 });
  });

  it("keeps padding out of the numbers (001 → 1)", () => {
    expect(parseUnitCode("CP-L1-P4-004")?.number).toBe(4);
  });

  it("accepts a 3-char dimension and 2-digit level/pillar", () => {
    expect(parseUnitCode("PRO-L10-P12-045")).toEqual({ dimension: "PRO", level: 10, pillar: 12, number: 45 });
  });

  it("is case-insensitive and trims", () => {
    expect(parseUnitCode("  cp-l1-p2-001 ")).toEqual({ dimension: "CP", level: 1, pillar: 2, number: 1 });
  });

  it("handles a >999 unit number", () => {
    expect(parseUnitCode("CP-L1-P1-1000")?.number).toBe(1000);
  });

  it("returns null for malformed codes", () => {
    for (const bad of ["", "CP-L1-P2", "CPL1P2001", "C-L1-P2-001", "CP-1-P2-001", "CP-L1-2-001", "p2-l1-001"]) {
      expect(parseUnitCode(bad)).toBeNull();
      expect(isValidUnitCode(bad)).toBe(false);
    }
  });
});

describe("formatUnitCode", () => {
  it("round-trips and re-pads to 3 digits", () => {
    expect(formatUnitCode({ dimension: "CP", level: 1, pillar: 2, number: 1 })).toBe("CP-L1-P2-001");
  });

  it("does not truncate numbers over 999", () => {
    expect(formatUnitCode({ dimension: "CP", level: 1, pillar: 1, number: 1000 })).toBe("CP-L1-P1-1000");
  });
});
