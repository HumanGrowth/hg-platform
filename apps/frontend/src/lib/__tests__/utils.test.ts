import { describe, expect, it } from "vitest";

import { formatDuration, formatRelativeTime } from "../utils";

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
