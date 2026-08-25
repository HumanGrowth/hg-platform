import { describe, expect, it } from "vitest";

import { isUnitLevelLocked, levelNum } from "@/lib/modulos";

describe("levelNum", () => {
  it("parsea LN → N y descarta códigos no-L", () => {
    expect(levelNum("L1")).toBe(1);
    expect(levelNum("L2")).toBe(2);
    expect(levelNum("l3")).toBe(3);
    expect(levelNum("Integrado")).toBeNull();
    expect(levelNum("N1")).toBeNull();
    expect(levelNum(null)).toBeNull();
    expect(levelNum(undefined)).toBeNull();
  });
});

describe("isUnitLevelLocked (progresión: su nivel y anteriores)", () => {
  it("colaborador L2: L1 y L2 accesibles, L3 bloqueado", () => {
    expect(isUnitLevelLocked("L1", "L2")).toBe(false);
    expect(isUnitLevelLocked("L2", "L2")).toBe(false);
    expect(isUnitLevelLocked("L3", "L2")).toBe(true);
  });

  it("colaborador L1: L2 bloqueado", () => {
    expect(isUnitLevelLocked("L1", "L1")).toBe(false);
    expect(isUnitLevelLocked("L2", "L1")).toBe(true);
  });

  it("sin nivel del colaborador (no evaluado) → todo bloqueado", () => {
    expect(isUnitLevelLocked("L1", null)).toBe(true);
    expect(isUnitLevelLocked("L2", null)).toBe(true);
    expect(isUnitLevelLocked("L1", "Integrado")).toBe(true); // escala no-L
  });

  it("contenido sin nivel L parseable → no bloquea", () => {
    expect(isUnitLevelLocked("N1", "L2")).toBe(false);
  });
});
