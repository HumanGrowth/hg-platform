import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { LearningUnitFeed, LearningUnitFeedItem } from "@/lib/types";

import ModulosPage from "../page";

const { getModulosFeed, listModulosByPillar, getHomeDashboard, router, searchParams } = vi.hoisted(() => ({
  getModulosFeed: vi.fn(),
  listModulosByPillar: vi.fn(),
  getHomeDashboard: vi.fn(),
  router: { push: vi.fn(), replace: vi.fn() },
  searchParams: { pillar: null as string | null },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => router,
  useSearchParams: () => ({ get: (key: string) => (key === "pillar" ? searchParams.pillar : null) }),
}));

vi.mock("@/lib/api", () => ({
  apiGetModulosFeed: getModulosFeed,
  apiListModulosByPillar: listModulosByPillar,
  apiGetHomeDashboard: getHomeDashboard,
}));

const unit: LearningUnitFeedItem = {
  id: "u1",
  slug: "hg-p1-l1-001-antes-de-seguir",
  title: "Antes de seguir",
  pillar_code: "P1",
  level_code: "L1",
  estimated_duration_seconds: 300,
  blocks_count: 5,
  attempt_status: "not_started",
  poster_url: null,
};

const feed: LearningUnitFeed = { hero: unit, next: [] };

beforeEach(() => {
  getModulosFeed.mockReset().mockResolvedValue(feed);
  listModulosByPillar.mockReset().mockResolvedValue([unit]);
  getHomeDashboard.mockReset().mockResolvedValue({ stats: { streak_days: 0 } });
  router.push.mockReset();
  searchParams.pillar = null;
});

describe("ModulosPage", () => {
  it("without ?pillar renders the normal hero+next feed via apiGetModulosFeed", async () => {
    render(<ModulosPage />);
    await screen.findByText("Antes de seguir");
    expect(listModulosByPillar).not.toHaveBeenCalled();
    expect(screen.queryByText(/Filtrando:/)).toBeNull();
  });

  it("with ?pillar=P1 calls apiListModulosByPillar and shows the 'Filtrando' chip", async () => {
    searchParams.pillar = "P1";
    render(<ModulosPage />);
    await screen.findByText("Antes de seguir");
    expect(listModulosByPillar).toHaveBeenCalledWith("P1", undefined, 20);
    expect(getModulosFeed).not.toHaveBeenCalled();
    expect(screen.getByText(/Filtrando:/)).toBeTruthy();
  });

  it("clicking the filter chip's X navigates back to /modulos", async () => {
    searchParams.pillar = "P3";
    render(<ModulosPage />);
    await screen.findByText(/Filtrando:/);
    fireEvent.click(screen.getByText(/Filtrando:/));
    expect(router.push).toHaveBeenCalledWith("/modulos");
  });

  it("shows the pillar-specific empty state when the filtered list is empty", async () => {
    searchParams.pillar = "P5";
    listModulosByPillar.mockResolvedValue([]);
    render(<ModulosPage />);
    await screen.findByText("Todavía no hay módulos publicados para este pilar.");
  });
});
