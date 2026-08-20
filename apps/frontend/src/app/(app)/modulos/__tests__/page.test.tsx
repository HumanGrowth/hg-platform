import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { LearningUnitFeed, LearningUnitFeedItem } from "@/lib/types";

import ModulosPage from "../page";

const {
  getModulosFeed,
  listModulosByDimension,
  getHomeDashboard,
  getMyPath,
  getMyAssignments,
  router,
  searchParams,
} = vi.hoisted(() => ({
  getModulosFeed: vi.fn(),
  listModulosByDimension: vi.fn(),
  getHomeDashboard: vi.fn(),
  getMyPath: vi.fn(),
  getMyAssignments: vi.fn(),
  router: { push: vi.fn(), replace: vi.fn() },
  searchParams: { pillar: null as string | null },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => router,
  useSearchParams: () => ({ get: (key: string) => (key === "pillar" ? searchParams.pillar : null) }),
}));

vi.mock("@/lib/api", () => ({
  apiGetModulosFeed: getModulosFeed,
  apiListModulosByDimension: listModulosByDimension,
  apiGetHomeDashboard: getHomeDashboard,
  apiGetMyPath: getMyPath,
  apiMyAssignments: getMyAssignments,
}));

const unit: LearningUnitFeedItem = {
  id: "u1",
  slug: "hg-p1-l1-001-antes-de-seguir",
  title: "Antes de seguir",
  dimension_code: "CP", pillar_code: null, unit_number: null,
  level_code: "L1",
  estimated_duration_seconds: 300,
  blocks_count: 5,
  attempt_status: "not_started",
  poster_url: null, video_url: null,
};

const feed: LearningUnitFeed = { hero: unit, next: [] };

beforeEach(() => {
  getModulosFeed.mockReset().mockResolvedValue(feed);
  listModulosByDimension.mockReset().mockResolvedValue([unit]);
  getHomeDashboard.mockReset().mockResolvedValue({ stats: { streak_days: 0 } });
  // next_step null → el hero cae al hero del feed (TASK 7).
  getMyPath.mockReset().mockResolvedValue({ next_step: null, upcoming: [] });
  getMyAssignments.mockReset().mockResolvedValue([]);
  router.push.mockReset();
  searchParams.pillar = null;
});

describe("ModulosPage", () => {
  it("without ?pillar renders the normal hero+next feed via apiGetModulosFeed", async () => {
    render(<ModulosPage />);
    await screen.findByText("Antes de seguir");
    expect(getModulosFeed).toHaveBeenCalled();
    // Sin filtro NO se muestra el chip "Filtrando"; el catálogo agrupado
    // (DimensionCatalog) sí carga units por dimensión vía apiListModulosByDimension.
    expect(screen.queryByText(/Filtrando:/)).toBeNull();
  });

  it("with ?pillar=P1 calls apiListModulosByDimension and shows the 'Filtrando' chip", async () => {
    searchParams.pillar = "P1";
    render(<ModulosPage />);
    await screen.findByText("Antes de seguir");
    expect(listModulosByDimension).toHaveBeenCalledWith("P1", undefined, 20);
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
    listModulosByDimension.mockResolvedValue([]);
    render(<ModulosPage />);
    await screen.findByText("Todavía no hay módulos publicados para esta dimensión.");
  });
});
