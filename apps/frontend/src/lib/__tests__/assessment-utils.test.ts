import { describe, expect, it } from "vitest";

import {
  canRetake,
  labelsForScale,
  radarValuesFromResults,
  sourceLabel,
  stateToRadarValue,
} from "@/lib/assessment-utils";
import type { PillarResult } from "@/lib/types";

function result(pillar: PillarResult["pillar_code"], state: string, over: Partial<PillarResult> = {}): PillarResult {
  return {
    pillar_code: pillar,
    source: "preliminary",
    state_code: state,
    state_label: state,
    sub_scores: {},
    requires_user_confirmation: false,
    user_confirmed_at: null,
    recaida_detected: false,
    suggested_next_step: null,
    derived_at: new Date().toISOString(),
    next_retake_eligible_at: new Date().toISOString(),
    ...over,
  };
}

describe("labelsForScale", () => {
  it("gives 5 labels for likert_0_4 and likert_1_5, 7 for likert_1_7", () => {
    expect(labelsForScale("likert_0_4")).toHaveLength(5);
    expect(labelsForScale("likert_1_5")).toHaveLength(5);
    expect(labelsForScale("likert_1_7")).toHaveLength(7);
    expect(labelsForScale("multiple_choice")).toHaveLength(0);
  });
});

describe("stateToRadarValue", () => {
  it("maps states to 0-100 buckets", () => {
    expect(stateToRadarValue("L3")).toBe(50);
    expect(stateToRadarValue("Integrado")).toBe(100);
    expect(stateToRadarValue("E1")).toBe(20);
    expect(stateToRadarValue("desconocido")).toBe(0);
  });
});

describe("radarValuesFromResults", () => {
  it("averages P6A and P6B into the P6 axis", () => {
    const radar = radarValuesFromResults([
      result("P1", "L3"),
      result("P6A", "Alta"), // 100
      result("P6B", "Frágil"), // 33
    ]);
    expect(radar.P1).toBe(50);
    expect(radar.P6).toBe(Math.round((100 + 33) / 2)); // 67
    expect(radar.P2).toBe(0);
  });
});

describe("sourceLabel + canRetake", () => {
  it("labels source", () => {
    expect(sourceLabel("confirmed")).toBe("Confirmado");
    expect(sourceLabel("preliminary")).toBe("Estimación rápida");
  });
  it("preliminary never retakes; confirmed retakes when window passed", () => {
    expect(canRetake(result("P1", "L3", { source: "preliminary" }))).toBe(false);
    const past = new Date(Date.now() - 1000).toISOString();
    const future = new Date(Date.now() + 1e6).toISOString();
    expect(canRetake(result("P1", "L3", { source: "confirmed", next_retake_eligible_at: past }))).toBe(true);
    expect(canRetake(result("P1", "L3", { source: "confirmed", next_retake_eligible_at: future }))).toBe(false);
  });
});
