import { describe, expect, it } from "vitest";

import { levelNum, lockCopy } from "@/lib/modulos";

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

describe("lockCopy (explica el bloqueo que decide el servidor)", () => {
  it("nivel superior → dice el nivel y que sube al reevaluarse", () => {
    expect(lockCopy("level", "L3")).toEqual({
      badge: "Nivel 3",
      hint: "Se abre cuando tu nivel suba al reevaluarte.",
    });
  });
  it("orden (o sin razón) → pide completar el anterior", () => {
    expect(lockCopy("order").hint).toContain("módulo anterior");
    expect(lockCopy(undefined).badge).toBe("En orden");
  });
  it("fuera de tu ruta", () => {
    expect(lockCopy("scope").badge).toBe("Fuera de tu ruta");
  });
});
