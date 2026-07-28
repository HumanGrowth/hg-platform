import { describe, expect, it } from "vitest";

import { stripCitationMarkers } from "../stripCitationMarkers";

describe("stripCitationMarkers", () => {
  it("removes single markers", () => {
    expect(stripCitationMarkers("El error es solo un dato sobre tu proceso [2].")).toBe(
      "El error es solo un dato sobre tu proceso.",
    );
  });

  it("removes multi-number markers [1, 2] / [1, 6, 7]", () => {
    expect(stripCitationMarkers("Sabés dónde se rompen las cosas [1, 6, 7] y por qué [8, 9].")).toBe(
      "Sabés dónde se rompen las cosas y por qué.",
    );
  });

  it("removes range markers [7-10] / [4–6]", () => {
    expect(stripCitationMarkers("Procede basándote en los hechos [7-10].")).toBe(
      "Procede basándote en los hechos.",
    );
    expect(stripCitationMarkers("una amenaza física real [4–6] siempre.")).toBe(
      "una amenaza física real siempre.",
    );
  });

  it("does not collapse into double spaces", () => {
    expect(stripCitationMarkers("uno [1] dos [2] tres")).toBe("uno dos tres");
  });

  it("never touches non-numeric brackets", () => {
    expect(stripCitationMarkers("un paso [importante] y una lista [a, b]")).toBe(
      "un paso [importante] y una lista [a, b]",
    );
  });

  it("leaves clean text untouched", () => {
    expect(stripCitationMarkers("Sin citas acá.")).toBe("Sin citas acá.");
  });
});
