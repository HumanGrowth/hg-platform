import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CourseDetail } from "@/lib/types";

import { CourseDetailView } from "@/components/library/CourseDetailView";

const { getCourse, saveProgress, router } = vi.hoisted(() => ({
  getCourse: vi.fn(),
  saveProgress: vi.fn().mockResolvedValue({}),
  router: { replace: vi.fn(), push: vi.fn() },
}));

// Router estable entre renders (un objeto nuevo por render dispararía el
// useEffect de carga en loop).
vi.mock("next/navigation", () => ({ useRouter: () => router }));

vi.mock("@/components/video/VideoPlayer", () => ({
  VideoPlayer: (props: { src: string; startAt?: number }) => (
    <div data-testid="player" data-src={props.src} data-startat={props.startAt} />
  ),
}));

vi.mock("@/lib/api", async (orig) => ({
  ...(await orig<typeof import("@/lib/api")>()),
  apiGetCourse: getCourse,
  apiSaveProgress: saveProgress,
}));

const base: CourseDetail = {
  id: "c1",
  career_path_id: "p1",
  title: "Curso Demo",
  slug: "l1-c1-demo",
  description: "Desc",
  thumbnail_url: "https://cdn.test/t.jpg",
  hls_master_url: "https://cdn.test/master.m3u8",
  duration_seconds: 300,
  career_level: "L1",
  competency_code: "C1",
  track: "competency",
  is_active: true,
  progress: null,
};

const withProgress: CourseDetail = {
  ...base,
  progress: { last_position_seconds: 120, watch_pct: 40, is_completed: false, completed_at: null },
};

beforeEach(() => {
  getCourse.mockReset();
});

describe("CourseDetailView", () => {
  it("renders the player with hls src when no progress", async () => {
    getCourse.mockResolvedValue({ ...base });
    render(<CourseDetailView slug="l1-c1-demo" />);
    const player = await screen.findByTestId("player");
    expect(player.getAttribute("data-src")).toBe("https://cdn.test/master.m3u8");
  });

  it("shows the resume dialog when last_position_seconds > 5", async () => {
    getCourse.mockResolvedValue(withProgress);
    render(<CourseDetailView slug="l1-c1-demo" />);
    expect(await screen.findByText(/Reanudar desde/)).toBeTruthy();
    expect(screen.queryByTestId("player")).toBeNull();
  });

  it("resume → closes dialog and starts player at last position", async () => {
    getCourse.mockResolvedValue(withProgress);
    render(<CourseDetailView slug="l1-c1-demo" />);
    fireEvent.click(await screen.findByText(/Reanudar desde/));
    const player = await screen.findByTestId("player");
    expect(player.getAttribute("data-startat")).toBe("120");
    await waitFor(() => expect(screen.queryByText(/querés seguir/)).toBeNull());
  });

  it("start over → closes dialog and starts at 0", async () => {
    getCourse.mockResolvedValue(withProgress);
    render(<CourseDetailView slug="l1-c1-demo" />);
    fireEvent.click(await screen.findByText("Empezar de nuevo"));
    const player = await screen.findByTestId("player");
    expect(player.getAttribute("data-startat")).toBe("0");
  });
});
