import { describe, expect, it } from "vitest";

import { formatDuration } from "../utils";

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
