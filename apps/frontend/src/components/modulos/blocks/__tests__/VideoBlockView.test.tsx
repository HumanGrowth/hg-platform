import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { VideoBlockView } from "../VideoBlockView";
import type { VideoBlock } from "@/lib/types";

const block: VideoBlock = {
  id: "v1",
  position: 1,
  required: true,
  block_type: "video_intro",
  video_url: "https://cdn.example.com/hg-p1-l1-001-intro.mp4",
  poster_url: "https://cdn.example.com/hg-p1-l1-001-poster.jpg",
  duration_seconds: 12,
  subtitle_url: null,
  transcript_text: null,
  eyebrow_label: "INTRO",
};

function mockMatchMedia(matches: boolean) {
  vi.spyOn(window, "matchMedia").mockImplementation((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("VideoBlockView", () => {
  it("renders a native <video> element pointing at video_url, not an <iframe>", () => {
    mockMatchMedia(false);
    render(<VideoBlockView block={block} isCompleted={false} onCompleteBlock={vi.fn()} />);

    const video = screen.getByTitle("Video del módulo");
    expect(video.tagName).toBe("VIDEO");
    expect(video.getAttribute("src")).toBe(block.video_url);
    expect(video.getAttribute("poster")).toBe(block.poster_url);
    expect(document.querySelector("iframe")).toBeNull();
  });

  it("marks the block complete when the video fires 'ended'", async () => {
    mockMatchMedia(false);
    const onCompleteBlock = vi.fn(async () => {});
    render(<VideoBlockView block={block} isCompleted={false} onCompleteBlock={onCompleteBlock} />);

    fireEvent.ended(screen.getByTitle("Video del módulo"));

    await vi.waitFor(() => expect(onCompleteBlock).toHaveBeenCalledTimes(1));
  });

  it("shows the manual 'Ya lo vi' button and marks complete on click", async () => {
    mockMatchMedia(false);
    const onCompleteBlock = vi.fn(async () => {});
    render(<VideoBlockView block={block} isCompleted={false} onCompleteBlock={onCompleteBlock} />);

    fireEvent.click(screen.getByText("Ya lo vi"));

    await vi.waitFor(() => expect(onCompleteBlock).toHaveBeenCalledTimes(1));
  });

  it("shows 'Visto' instead of the button when already completed", () => {
    mockMatchMedia(false);
    render(<VideoBlockView block={block} isCompleted onCompleteBlock={vi.fn()} />);

    expect(screen.getByText("Visto")).toBeTruthy();
    expect(screen.queryByText("Ya lo vi")).toBeNull();
  });

  it("shows the custom fullscreen button only on mobile viewports", () => {
    mockMatchMedia(true);
    render(<VideoBlockView block={block} isCompleted={false} onCompleteBlock={vi.fn()} />);
    expect(screen.getByLabelText("Ver en pantalla completa")).toBeTruthy();
  });

  it("hides the custom fullscreen button on desktop viewports", () => {
    mockMatchMedia(false);
    render(<VideoBlockView block={block} isCompleted={false} onCompleteBlock={vi.fn()} />);
    expect(screen.queryByLabelText("Ver en pantalla completa")).toBeNull();
  });
});
