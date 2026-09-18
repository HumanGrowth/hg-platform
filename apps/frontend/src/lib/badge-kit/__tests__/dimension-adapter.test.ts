import { describe, expect, it } from "vitest";

import {
  badgeConfigForDimension,
  levelBadgeMeta,
  resolveLevelBadge,
} from "../dimension-adapter";
import { badgeSvgString } from "../index";

describe("badgeConfigForDimension — picto matches the app's canonical assignment", () => {
  it("P5 (Paz interior y claridad) usa bulb, no el picto del kit para d5", () => {
    expect(badgeConfigForDimension("P5").picto).toBe("bulb");
  });

  it("P6 (Estabilidad) usa scales, no el picto del kit para d6", () => {
    expect(badgeConfigForDimension("P6").picto).toBe("scales");
    expect(badgeConfigForDimension("P6A").picto).toBe("scales");
    expect(badgeConfigForDimension("P6B").picto).toBe("scales");
  });

  it("resuelve por código Drive (CP→P1 rocket, ES→P6 scales)", () => {
    expect(badgeConfigForDimension("CP").picto).toBe("rocket");
    expect(badgeConfigForDimension("ES").picto).toBe("scales");
  });

  it("cada dimensión trae su accent hex y su nombre canónico", () => {
    const config = badgeConfigForDimension("CP");
    expect(config.accent).toBe("#e8530a");
    expect(config.code).toBe("CP");
    expect(config.name).toBe("Carrera e impacto");
  });

  it("código desconocido cae a P1 sin tirar", () => {
    expect(() => badgeConfigForDimension("XX")).not.toThrow();
  });
});

describe("levelBadgeMeta", () => {
  it("mapea L1/L2/L3 a los nombres provisorios del seed backend y a rank", () => {
    expect(levelBadgeMeta("L1")).toEqual({ title: "En crecimiento", rank: 0 });
    expect(levelBadgeMeta("L2")).toEqual({ title: "Sólido", rank: 2 });
    expect(levelBadgeMeta("L3")).toEqual({ title: "Ejemplar", rank: 4 });
  });

  it("sin level_code devuelve vacío", () => {
    expect(levelBadgeMeta(undefined)).toEqual({});
  });
});

describe("resolveLevelBadge — badges de nivel del catálogo (code = level-<dim>-<levelcode>)", () => {
  it("reconoce el formato y prioriza el nombre real sobre el fallback", () => {
    const resolved = resolveLevelBadge("level-cp-l2", "CP · Sólido");
    expect(resolved).toEqual({
      dimensionCode: "CP",
      dimensionName: "Carrera e impacto",
      levelCode: "L2",
      levelTitle: "Sólido",
      rank: 2,
      displayName: "Carrera e impacto · Sólido",
      displayDescription:
        'Reconoce que alcanzaste el nivel "Sólido" en tu dimensión de Carrera e impacto.',
      displayUnlockHint: "Se desbloquea al alcanzar el nivel Sólido en Carrera e impacto.",
    });
  });

  it("displayName nunca incluye la sigla Drive cruda (CP/PR/RE/SA/PI/ES)", () => {
    const resolved = resolveLevelBadge("level-sa-l1", "SA · En crecimiento");
    expect(resolved?.displayName).not.toMatch(/\bSA\b/);
    expect(resolved?.displayDescription).not.toMatch(/\bSA\b/);
    expect(resolved?.displayUnlockHint).not.toMatch(/\bSA\b/);
  });

  it("cae al fallback si no hay nombre legible", () => {
    const resolved = resolveLevelBadge("level-es-l3");
    expect(resolved?.levelTitle).toBe("Ejemplar");
  });

  it("devuelve null para badges que no siguen la convención", () => {
    expect(resolveLevelBadge("streak-7-days")).toBeNull();
  });
});

describe("badgeSvgString — SSR-safe (sin document)", () => {
  it("produce un SVG no vacío en Node a partir del config resuelto", () => {
    const config = badgeConfigForDimension("P1");
    const svg = badgeSvgString({
      picto: config.picto,
      accent: config.accent,
      code: config.code,
      divName: config.name,
      title: "Sólido",
      rank: 2,
      state: "earned",
    });
    expect(svg.length).toBeGreaterThan(0);
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain("</svg>");
  });
});
