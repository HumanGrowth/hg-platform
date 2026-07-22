import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { VideoBlockView } from "../VideoBlockView";
import type { VideoBlock } from "@/lib/types";

// useShouldAnimate controlable (reduced motion → false).
const { motion } = vi.hoisted(() => ({ motion: { animate: true } }));
vi.mock("@/lib/motion/useShouldAnimate", () => ({ useShouldAnimate: () => motion.animate }));

const block: VideoBlock = {
  id: "v1",
  position: 1,
  required: true,
  block_type: "video_intro",
  video_url: "https://cdn.example.com/hg-p1-l1-001-intro.mp4",
  poster_url: "https://cdn.example.com/hg-p1-l1-001-poster.jpg",
  duration_seconds: 30,
  subtitle_url: null,
  transcript_text: null,
  eyebrow_label: "INTRO",
};

// IntersectionObserver controlable — el stub de setup.ts ignora el callback.
let ioCallback: IntersectionObserverCallback | null = null;
class MockIO {
  constructor(cb: IntersectionObserverCallback) {
    ioCallback = cb;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

function enterViewport(isIntersecting = true) {
  ioCallback?.([{ isIntersecting } as IntersectionObserverEntry], {} as IntersectionObserver);
}

beforeEach(() => {
  motion.animate = true;
  ioCallback = null;
  vi.stubGlobal("IntersectionObserver", MockIO as unknown as typeof IntersectionObserver);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("VideoBlockView · full-bleed player (TASK player-01)", () => {
  it("renders a native <video> at video_url, no <iframe>, no native controls", () => {
    render(<VideoBlockView block={block} isCompleted={false} onCompleteBlock={vi.fn()} />);
    const video = screen.getByTitle("Video del módulo") as HTMLVideoElement;
    expect(video.tagName).toBe("VIDEO");
    expect(video.getAttribute("src")).toBe(block.video_url);
    expect(video.getAttribute("poster")).toBe(block.poster_url);
    expect(video.hasAttribute("controls")).toBe(false);
    expect(video.hasAttribute("playsinline")).toBe(true);
    expect(document.querySelector("iframe")).toBeNull();
  });

  it("autoplays (muted) when it enters the viewport", () => {
    const play = vi.spyOn(window.HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    render(<VideoBlockView block={block} isCompleted={false} onCompleteBlock={vi.fn()} />);
    enterViewport(true);
    expect(play).toHaveBeenCalled();
  });

  it("does NOT autoplay under reduced motion", () => {
    motion.animate = false;
    const play = vi.spyOn(window.HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    render(<VideoBlockView block={block} isCompleted={false} onCompleteBlock={vi.fn()} />);
    enterViewport(true);
    expect(play).not.toHaveBeenCalled();
  });

  it("pauses when it leaves the viewport", () => {
    const pause = vi.spyOn(window.HTMLMediaElement.prototype, "pause");
    render(<VideoBlockView block={block} isCompleted={false} onCompleteBlock={vi.fn()} />);
    enterViewport(false);
    expect(pause).toHaveBeenCalled();
  });

  it("tapping the central tap-zone triggers playback", () => {
    const play = vi.spyOn(window.HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    render(<VideoBlockView block={block} isCompleted={false} onCompleteBlock={vi.fn()} />);
    // jsdom mantiene video.paused=true, así que el tap dispara play().
    fireEvent.click(screen.getByLabelText("Reproducir video"));
    expect(play).toHaveBeenCalled();
  });

  it("space toggles playback via keyboard", () => {
    const play = vi.spyOn(window.HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    render(<VideoBlockView block={block} isCompleted={false} onCompleteBlock={vi.fn()} />);
    fireEvent.keyDown(window, { key: " " });
    expect(play).toHaveBeenCalled();
  });

  it("marks the block complete and shows replay when the video ends", async () => {
    const onCompleteBlock = vi.fn(async () => {});
    render(<VideoBlockView block={block} isCompleted={false} onCompleteBlock={onCompleteBlock} />);
    fireEvent.ended(screen.getByTitle("Video del módulo"));
    await vi.waitFor(() => expect(onCompleteBlock).toHaveBeenCalledTimes(1));
    // Tras ended el tap-zone vuelve a "Reproducir video" (replay).
    expect(screen.getByLabelText("Reproducir video")).toBeTruthy();
  });

  it("shows the unmute hint on first play and unmutes on click", () => {
    render(<VideoBlockView block={block} isCompleted={false} onCompleteBlock={vi.fn()} />);
    const video = screen.getByTitle("Video del módulo") as HTMLVideoElement;
    fireEvent.play(video);
    fireEvent.click(screen.getByText("Activar sonido"));
    expect(video.muted).toBe(false);
  });

  it("shows an error state with retry when the video errors", () => {
    render(<VideoBlockView block={block} isCompleted={false} onCompleteBlock={vi.fn()} />);
    fireEvent.error(screen.getByTitle("Video del módulo"));
    expect(screen.getByText(/No pudimos cargar el video/)).toBeTruthy();
    expect(screen.getByText("Reintentar")).toBeTruthy();
  });

  it("'m' toggles mute", () => {
    render(<VideoBlockView block={block} isCompleted={false} onCompleteBlock={vi.fn()} />);
    const video = screen.getByTitle("Video del módulo") as HTMLVideoElement;
    expect(video.muted).toBe(true);
    fireEvent.keyDown(window, { key: "m" });
    expect(video.muted).toBe(false);
  });

  it("arrow keys seek ±5s", () => {
    render(<VideoBlockView block={block} isCompleted={false} onCompleteBlock={vi.fn()} />);
    const video = screen.getByTitle("Video del módulo") as HTMLVideoElement;
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(video.currentTime).toBe(5);
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(video.currentTime).toBe(0);
  });
});
