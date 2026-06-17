import { fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { VideoPlayer } from "../VideoPlayer";

// HLS no corre en jsdom: mockeamos hls.js para forzar el path nativo (isSupported=false).
vi.mock("hls.js", () => ({
  default: { isSupported: () => false, Events: { MANIFEST_PARSED: "hlsManifestParsed" } },
}));

function getVideo(container: HTMLElement): HTMLVideoElement {
  return container.querySelector("video") as HTMLVideoElement;
}

function setDuration(video: HTMLVideoElement, value: number) {
  Object.defineProperty(video, "duration", { configurable: true, get: () => value });
}

afterEach(() => {
  vi.useRealTimers();
});

describe("VideoPlayer", () => {
  it("renders a <video> with the src", () => {
    const { container } = render(<VideoPlayer src="https://cdn.test/master.m3u8" />);
    const video = getVideo(container);
    expect(video).toBeTruthy();
    expect(video.src).toContain("master.m3u8");
  });

  it("applies startAt on loadedmetadata", () => {
    const { container } = render(<VideoPlayer src="https://cdn.test/m.m3u8" startAt={42} />);
    const video = getVideo(container);
    setDuration(video, 300);
    fireEvent.loadedMetadata(video);
    expect(Math.round(video.currentTime)).toBe(42);
  });

  it("fires onProgress every 5s while playing", () => {
    vi.useFakeTimers();
    const onProgress = vi.fn();
    const { container } = render(
      <VideoPlayer src="https://cdn.test/m.m3u8" onProgress={onProgress} />,
    );
    const video = getVideo(container);
    setDuration(video, 200);
    Object.defineProperty(video, "currentTime", { configurable: true, get: () => 50 });
    fireEvent.play(video); // playing=true → arranca el interval
    vi.advanceTimersByTime(5000);
    expect(onProgress).toHaveBeenCalledWith(
      expect.objectContaining({ position_seconds: 50, watch_pct: 25, duration_seconds: 200 }),
    );
  });

  it("fires onComplete once when crossing 80%", () => {
    const onComplete = vi.fn();
    const { container } = render(
      <VideoPlayer src="https://cdn.test/m.m3u8" onComplete={onComplete} />,
    );
    const video = getVideo(container);
    setDuration(video, 100);
    Object.defineProperty(video, "currentTime", { configurable: true, get: () => 85 });
    fireEvent.timeUpdate(video);
    fireEvent.timeUpdate(video); // segunda vez no debe re-disparar
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
