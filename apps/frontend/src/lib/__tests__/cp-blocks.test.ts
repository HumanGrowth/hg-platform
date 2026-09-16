import { describe, expect, it } from "vitest";

import { blocksFor, cpCatalog, cpLevels } from "@/lib/cp-blocks";
import type { AssignableUnit } from "@/lib/types";

function unit(overrides: Partial<AssignableUnit>): AssignableUnit {
  return {
    id: "u1",
    slug: "u1",
    title: "Unit 1",
    dimension_code: "CP",
    level_code: "L1",
    pillar_code: "P1",
    keywords: null,
    ...overrides,
  };
}

describe("cp-blocks", () => {
  it("cpCatalog filters to CP only, optionally by level", () => {
    const units = [
      unit({ id: "a", dimension_code: "CP", level_code: "L1" }),
      unit({ id: "b", dimension_code: "PR", level_code: "L1" }),
      unit({ id: "c", dimension_code: "CP", level_code: "L2" }),
    ];
    expect(cpCatalog(units).map((u) => u.id)).toEqual(["a", "c"]);
    expect(cpCatalog(units, "L1").map((u) => u.id)).toEqual(["a"]);
  });

  it("cpLevels lists distinct CP levels, sorted", () => {
    const units = [
      unit({ id: "a", level_code: "L2" }),
      unit({ id: "b", level_code: "L1" }),
      unit({ id: "c", dimension_code: "PR", level_code: "L9" }),
    ];
    expect(cpLevels(units)).toEqual(["L1", "L2"]);
  });

  it("blocksFor groups by pillar_code", () => {
    const units = [
      unit({ id: "a", pillar_code: "P1" }),
      unit({ id: "b", pillar_code: "P1" }),
      unit({ id: "c", pillar_code: "P2" }),
    ];
    const blocks = blocksFor(units, "pillar");
    expect(blocks.map((b) => b.key)).toEqual(["P1", "P2"]);
    expect(blocks[0].unitIds).toEqual(["a", "b"]);
  });

  it("blocksFor groups by skill, one unit can land in multiple blocks", () => {
    const units = [
      unit({ id: "a", keywords: ["comunicacion", "feedback"] }),
      unit({ id: "b", keywords: ["feedback"] }),
    ];
    const blocks = blocksFor(units, "skill");
    expect(blocks.map((b) => b.key)).toEqual(["comunicacion", "feedback"]);
    expect(blocks.find((b) => b.key === "feedback")?.unitIds).toEqual(["a", "b"]);
  });

  it("blocksFor skips units without pillar_code / keywords", () => {
    const units = [unit({ id: "a", pillar_code: null, keywords: null })];
    expect(blocksFor(units, "pillar")).toEqual([]);
    expect(blocksFor(units, "skill")).toEqual([]);
  });
});
