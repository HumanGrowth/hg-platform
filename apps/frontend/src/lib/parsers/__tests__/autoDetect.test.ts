import { describe, expect, it } from "vitest";

import { detectChecklistItems, detectHeroStat } from "../autoDetect";

describe("detectHeroStat", () => {
  it("detects a percentage", () => {
    const r = detectHeroStat("La reflexión mejora el desempeño un 23% frente al grupo control.");
    expect(r?.value).toBe("23%");
    expect(r?.label.length).toBeGreaterThan(0);
  });

  it("detects a multiplier (x)", () => {
    expect(detectHeroStat("Los equipos rinden 2x cuando hay seguridad psicológica.")?.value).toBe("2x");
  });

  it("detects a 'de cada' ratio", () => {
    expect(detectHeroStat("3 de cada 4 profesionales ocultan errores.")?.value).toBe("3 de cada 4");
  });

  it("detects a decimal with comma", () => {
    expect(detectHeroStat("El índice subió a 4,7 puntos en promedio.")?.value).toBe("4,7");
  });

  it("detects a decimal with dot", () => {
    expect(detectHeroStat("El efecto fue de 1.5 desviaciones estándar.")?.value).toBe("1.5");
  });

  it("ignores a citation year (2012) — not a stat", () => {
    expect(
      detectHeroStat("Naomi Eisenberger (2012) descubrió que el rechazo social duele."),
    ).toBeNull();
  });

  it("ignores a bare 4-digit year as the stat", () => {
    expect(detectHeroStat("En 2012 todo cambió para el equipo.")).toBeNull();
  });

  it("returns null when there is no number", () => {
    expect(detectHeroStat("Un texto sin ningún dato cuantitativo.")).toBeNull();
    expect(detectHeroStat("")).toBeNull();
  });

  it("picks the most specific interpretation at the first number (23% not 23)", () => {
    expect(detectHeroStat("Mejora del 23% este año")?.value).toBe("23%");
  });
});

describe("detectChecklistItems", () => {
  it("detects a 3-item inline list", () => {
    const r = detectChecklistItems("Hacé esto: 1. Pausá 2. Respirá 3. Escribí.");
    expect(r?.map((i) => i.title)).toEqual(["Pausá", "Respirá", "Escribí"]);
    expect(r?.map((i) => i.n)).toEqual([1, 2, 3]);
  });

  it("detects parenthesized markers (1) (2) (3) — Bug #2", () => {
    const r = detectChecklistItems(
      "Preguntá: (1) ¿Qué pasa si no lo hago?, (2) ¿De qué depende?, (3) ¿Dónde falla?",
    );
    expect(r?.map((i) => i.n)).toEqual([1, 2, 3]);
    expect(r?.[0].title).toContain("¿Qué pasa si no lo hago?");
  });

  it("detects '1)' paren-close markers — Bug #2", () => {
    const r = detectChecklistItems("Pasos: 1) Respirá 2) Escuchá 3) Respondé");
    expect(r?.length).toBe(3);
    expect(r?.[2].title).toBe("Respondé");
  });

  it("detects a letter mnemonic (S)(T)(O)(P) — técnica STOP", () => {
    const r = detectChecklistItems(
      "Aplica STOP: (S) Pará un segundo, (T) Tomá aire, (O) Observá qué dijo, y (P) Procedé con los hechos",
    );
    expect(r?.length).toBe(4);
    expect(r?.[0].title).toContain("Pará un segundo");
    expect(r?.[3].title).toContain("Procedé con los hechos");
  });

  it("detects a multiline 5-item list", () => {
    const r = detectChecklistItems("1. Uno\n2. Dos\n3. Tres\n4. Cuatro\n5. Cinco");
    expect(r).toHaveLength(5);
  });

  it("truncates to 5 when there are 6 items", () => {
    const r = detectChecklistItems("1. a\n2. b\n3. c\n4. d\n5. e\n6. f");
    expect(r).toHaveLength(5);
    expect(r?.[4].title).toBe("e");
  });

  it("returns null when there is no numbered list", () => {
    expect(detectChecklistItems("Un párrafo sin pasos numerados.")).toBeNull();
    expect(detectChecklistItems("En 2020. Todo cambió.")).toBeNull(); // año, no lista
  });

  it("strips markdown from item titles", () => {
    const r = detectChecklistItems("1. **Pausá** un momento 2. Escribí lo *clave*");
    expect(r?.[0].title).toBe("Pausá un momento");
    expect(r?.[1].title).toBe("Escribí lo clave");
  });
});
