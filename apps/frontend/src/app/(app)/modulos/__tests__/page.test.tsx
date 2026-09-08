import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { LearningUnitFeed, LearningUnitFeedItem } from "@/lib/types";

import ModulosPage from "../page";

const {
  getModulosFeed,
  getMyPath,
  getModulo,
  getAttempt,
  startAttempt,
  router,
  searchParams,
} = vi.hoisted(() => ({
  getModulosFeed: vi.fn(),
  getMyPath: vi.fn(),
  getModulo: vi.fn(),
  getAttempt: vi.fn(),
  startAttempt: vi.fn(),
  router: { push: vi.fn(), replace: vi.fn() },
  searchParams: { pillar: null as string | null },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => router,
  useSearchParams: () => ({ get: (key: string) => (key === "pillar" ? searchParams.pillar : null) }),
}));

vi.mock("@/lib/api", () => ({
  apiGetModulosFeed: getModulosFeed,
  apiGetMyPath: getMyPath,
  apiGetModulo: getModulo,
  apiGetAttempt: getAttempt,
  apiStartAttempt: startAttempt,
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

/** Detalle mínimo que consume ModuloDetailView / UnitOpeningScreen. */
const detail = {
  id: "u1",
  slug: unit.slug,
  title: unit.title,
  dimension_code: "CP",
  level_code: "L1",
  estimated_duration_seconds: 300,
  narrative_tone: null,
  blocks: [],
};

beforeEach(() => {
  getModulosFeed.mockReset().mockResolvedValue(feed);
  getMyPath.mockReset().mockResolvedValue({ next_step: null, upcoming: [], milestones: [] });
  getModulo.mockReset().mockResolvedValue(detail);
  // 404 = todavía no hay attempt (leer nunca lo crea).
  getAttempt.mockReset().mockRejectedValue(new Error("404"));
  startAttempt.mockReset();
  router.push.mockReset();
  router.replace.mockReset();
  searchParams.pillar = null;
});

describe("ModulosPage (launcher)", () => {
  it("abre el módulo en curso: el hero in_progress gana sobre el next_step de la ruta", async () => {
    getModulosFeed.mockResolvedValue({
      hero: { ...unit, attempt_status: "in_progress" },
      next: [],
    });
    getMyPath.mockResolvedValue({
      next_step: { slug: "otro-modulo" },
      upcoming: [],
      milestones: [],
    });

    render(<ModulosPage />);

    await waitFor(() => expect(getModulo).toHaveBeenCalledWith(unit.slug));
  });

  it("sin módulo en curso abre el next_step de la ruta", async () => {
    getModulosFeed.mockResolvedValue({ hero: unit, next: [] });
    getMyPath.mockResolvedValue({
      next_step: { slug: "siguiente-de-la-ruta" },
      upcoming: [],
      milestones: [],
    });

    render(<ModulosPage />);

    await waitFor(() => expect(getModulo).toHaveBeenCalledWith("siguiente-de-la-ruta"));
  });

  it("NO crea ni resetea el attempt hasta que el usuario toca el CTA", async () => {
    render(<ModulosPage />);

    // La apertura del módulo llega sola; el attempt no se toca.
    await screen.findByText("Comenzar");
    expect(getAttempt).toHaveBeenCalledWith(unit.slug);
    expect(startAttempt).not.toHaveBeenCalled();
  });

  it("sin nada pendiente muestra el estado 'Estás al día'", async () => {
    getModulosFeed.mockResolvedValue({ hero: null, next: [] });
    getMyPath.mockResolvedValue({ next_step: null, upcoming: [], milestones: [] });

    render(<ModulosPage />);

    await screen.findByText("Estás al día");
    expect(getModulo).not.toHaveBeenCalled();
  });

  it("?pillar= redirige a la página de esa dimensión (el catálogo se mudó)", async () => {
    searchParams.pillar = "P1";
    render(<ModulosPage />);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/dimensiones/CP"));
    expect(getModulosFeed).not.toHaveBeenCalled();
  });
});
