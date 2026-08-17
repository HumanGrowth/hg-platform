import { describe, expect, it } from "vitest";

import { formatUnitCode, isValidUnitCode, parseUnitCode } from "../unitCode";

describe("parseUnitCode", () => {
  it("parses a canonical code (no area → general)", () => {
    expect(parseUnitCode("CP-L1-P2-001")).toEqual({
      area: null,
      dimension: "CP",
      level: 1,
      pillar: "P2",
      number: 1,
    });
  });

  it("parses an area-prefixed code (TASK 8)", () => {
    expect(parseUnitCode("MFG-CP-L1-P2-001")).toEqual({
      area: "MFG",
      dimension: "CP",
      level: 1,
      pillar: "P2",
      number: 1,
    });
  });

  it("treats the GEN sentinel as general (area = null)", () => {
    expect(parseUnitCode("GEN-CP-L1-P2-001")?.area).toBeNull();
  });

  it("keeps padding out of the numbers (001 → 1)", () => {
    expect(parseUnitCode("CP-L1-P4-004")?.number).toBe(4);
  });

  it("accepts a 3-char dimension and 2-digit level/pillar", () => {
    expect(parseUnitCode("PRO-L10-P12-045")).toEqual({
      area: null,
      dimension: "PRO",
      level: 10,
      pillar: "P12",
      number: 45,
    });
  });

  it("accepts area + 3-char dimension", () => {
    expect(parseUnitCode("IT-PRO-L2-P3-010")).toEqual({
      area: "IT",
      dimension: "PRO",
      level: 2,
      pillar: "P3",
      number: 10,
    });
  });

  it("parses a named pillar and normalizes IA → AI (CE-07)", () => {
    expect(parseUnitCode("CP-L1-IA-015")).toEqual({
      area: null,
      dimension: "CP",
      level: 1,
      pillar: "AI",
      number: 15,
    });
    expect(parseUnitCode("CP-L1-AI-015")?.pillar).toBe("AI");
  });

  it("is case-insensitive and trims", () => {
    expect(parseUnitCode("  cp-l1-p2-001 ")).toEqual({
      area: null,
      dimension: "CP",
      level: 1,
      pillar: "P2",
      number: 1,
    });
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
  it("round-trips a general code and re-pads to 3 digits", () => {
    expect(formatUnitCode({ area: null, dimension: "CP", level: 1, pillar: "P2", number: 1 })).toBe(
      "CP-L1-P2-001",
    );
  });

  it("prepends the area when present", () => {
    expect(formatUnitCode({ area: "MFG", dimension: "CP", level: 1, pillar: "P2", number: 1 })).toBe(
      "MFG-CP-L1-P2-001",
    );
  });

  it("does not truncate numbers over 999", () => {
    expect(formatUnitCode({ area: null, dimension: "CP", level: 1, pillar: "P1", number: 1000 })).toBe(
      "CP-L1-P1-1000",
    );
  });
});
