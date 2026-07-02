import { describe, expect, it } from "vitest";

import { formatDuration, formatRelativeTime, greetingName, isFixtureCourse } from "../utils";

describe("formatDuration", () => {
  it("formats zero", () => {
    expect(formatDuration(0)).toBe("0:00");
  });

  it("formats minutes:seconds", () => {
    expect(formatDuration(432)).toBe("7:12");
    expect(formatDuration(59)).toBe("0:59");
  });

  it("formats hours:minutes:seconds", () => {
    expect(formatDuration(3725)).toBe("1:02:05");
  });

  it("clamps negatives", () => {
    expect(formatDuration(-10)).toBe("0:00");
  });
});

describe("formatRelativeTime", () => {
  it("returns dash for null", () => {
    expect(formatRelativeTime(null)).toBe("—");
  });

  it("returns 'ahora' for very recent", () => {
    expect(formatRelativeTime(new Date().toISOString())).toBe("ahora");
  });

  it("formats minutes ago", () => {
    const iso = new Date(Date.now() - 5 * 60_000).toISOString();
    expect(formatRelativeTime(iso)).toMatch(/minuto/);
  });

  it("formats days ago", () => {
    const iso = new Date(Date.now() - 3 * 86_400_000).toISOString();
    expect(formatRelativeTime(iso)).toMatch(/d[ií]a/);
  });
});

describe("greetingName", () => {
  it("returns the first real name token", () => {
    expect(greetingName("María González")).toBe("María");
  });

  it("strips numeric and generic seed tokens", () => {
    expect(greetingName("Collaborator 2 Corp")).toBe("");
    expect(greetingName("Colaborador 12")).toBe("");
  });
});

describe("isFixtureCourse", () => {
  it("hides seed widget fixtures", () => {
    expect(isFixtureCourse("seed-w-collab2-0")).toBe(true);
    expect(isFixtureCourse("cp-complete")).toBe(true);
  });

  it("keeps real catalog slugs visible", () => {
    expect(isFixtureCourse("l1-c1-l1-p1-001")).toBe(false);
    expect(isFixtureCourse("seed-week-recap")).toBe(false);
  });
});
