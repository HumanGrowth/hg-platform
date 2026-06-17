import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const saveProgress = vi.fn().mockResolvedValue({});
vi.mock("@/lib/api", () => ({
  apiSaveProgress: (...args: unknown[]) => saveProgress(...args),
}));

import { useThrottledProgress } from "@/lib/use-throttled-progress";

beforeEach(() => {
  saveProgress.mockClear();
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("useThrottledProgress", () => {
  it("throttles to the interval and flushes big jumps immediately", () => {
    const { result } = renderHook(() => useThrottledProgress("slug-x", 5000));

    // Primer report: flush inmediato (delta desde -Inf).
    act(() => result.current.report({ position_seconds: 10, watch_pct: 5 }));
    expect(saveProgress).toHaveBeenCalledTimes(1);

    // Delta chico: se bufferea, no envía aún.
    act(() => result.current.report({ position_seconds: 20, watch_pct: 8 }));
    expect(saveProgress).toHaveBeenCalledTimes(1);

    // Al cruzar el intervalo, envía el último buffer.
    act(() => vi.advanceTimersByTime(5000));
    expect(saveProgress).toHaveBeenCalledTimes(2);
    expect(saveProgress).toHaveBeenLastCalledWith("slug-x", { position_seconds: 20, watch_pct: 8 });

    // Salto grande (>10 pct): flush inmediato.
    act(() => result.current.report({ position_seconds: 200, watch_pct: 80 }));
    expect(saveProgress).toHaveBeenCalledTimes(3);
  });
});
