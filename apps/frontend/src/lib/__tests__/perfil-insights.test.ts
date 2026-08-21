import { describe, expect, it } from "vitest";

import { growthArchetype, weeklyChallenge, weekOfYear } from "../perfil-insights";

describe("growthArchetype", () => {
  it("perfil vacío → null", () => {
    expect(growthArchetype({})).toBeNull();
  });

  it("promedio bajo → Explorador en expansión", () => {
    const a = growthArchetype({ P1: 20, P2: 15, P3: 25, P4: 10, P5: 20, P6: 18 });
    expect(a?.title).toBe("Explorador en expansión");
  });

  it("una dimensión domina → Especialista en esa dimensión", () => {
    const a = growthArchetype({ P1: 85, P2: 40, P3: 35, P4: 45, P5: 40, P6: 42 });
    expect(a?.title).toContain("Especialista");
    expect(a?.title).toContain("Carrera"); // P1 = Carrera
  });

  it("parejo y alto → Constructor equilibrado", () => {
    const a = growthArchetype({ P1: 70, P2: 72, P3: 68, P4: 71, P5: 69, P6: 70 });
    expect(a?.title).toBe("Constructor equilibrado");
  });
});

describe("weeklyChallenge", () => {
  it("perfil vacío → null", () => {
    expect(weeklyChallenge({}, 0)).toBeNull();
  });

  it("elige la dimensión con menor score como foco", () => {
    const c = weeklyChallenge({ P1: 80, P2: 70, P3: 20, P4: 60, P5: 55, P6: 65 }, 0);
    expect(c?.focusCode).toBe("P3"); // Relaciones = menor
    expect(c?.text).toBeTruthy();
  });

  it("el weekSeed rota el reto de forma estable", () => {
    const radar = { P1: 80, P2: 70, P3: 20, P4: 60, P5: 55, P6: 65 };
    const a = weeklyChallenge(radar, 0);
    const b = weeklyChallenge(radar, 0);
    expect(a?.text).toBe(b?.text); // mismo seed → mismo reto
  });
});

describe("weekOfYear", () => {
  it("1 de enero → semana 0", () => {
    expect(weekOfYear(new Date(2026, 0, 1))).toBe(0);
  });

  it("crece a lo largo del año", () => {
    expect(weekOfYear(new Date(2026, 6, 1))).toBeGreaterThan(20);
  });
});
