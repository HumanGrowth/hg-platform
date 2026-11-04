import { describe, expect, it } from "vitest";

import { moveBefore, moveBy, resolveLayout, toggleHidden } from "../dashboard-layout";

describe("resolveLayout", () => {
  const available = ["a", "b", "c", "d"];

  it("uses the default order and shows everything without saved prefs", () => {
    expect(resolveLayout(available, null)).toEqual({ order: available, hidden: [] });
  });

  it("drops unknown ids and appends new widgets at the end", () => {
    const out = resolveLayout(available, { order: ["c", "zz", "a"], hidden: ["zz", "b"] });
    expect(out).toEqual({ order: ["c", "a", "b", "d"], hidden: ["b"] });
  });
});

describe("moving widgets", () => {
  it("moves a widget before another one", () => {
    expect(moveBefore(["a", "b", "c", "d"], "d", "b")).toEqual(["a", "d", "b", "c"]);
    expect(moveBefore(["a", "b", "c"], "a", "c")).toEqual(["b", "a", "c"]);
  });

  it("is a no-op for the same or unknown target", () => {
    const o = ["a", "b"];
    expect(moveBefore(o, "a", "a")).toBe(o);
    expect(moveBefore(o, "a", "zz")).toBe(o);
  });

  it("moves one step and stops at the edges", () => {
    expect(moveBy(["a", "b", "c"], "b", -1)).toEqual(["b", "a", "c"]);
    expect(moveBy(["a", "b", "c"], "c", 1)).toEqual(["a", "b", "c"]);
  });

  it("toggles hidden", () => {
    expect(toggleHidden([], "a")).toEqual(["a"]);
    expect(toggleHidden(["a", "b"], "a")).toEqual(["b"]);
  });
});
