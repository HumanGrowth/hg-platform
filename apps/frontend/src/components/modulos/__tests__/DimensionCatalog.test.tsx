import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { LearningUnitFeedItem } from "@/lib/types";

import { DimensionCatalog } from "../DimensionCatalog";

const { listByDimension } = vi.hoisted(() => ({ listByDimension: vi.fn() }));
vi.mock("@/lib/api", () => ({ apiListModulosByDimension: listByDimension }));
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

const unit = (id: string, level: string, o: Partial<LearningUnitFeedItem> = {}): LearningUnitFeedItem => ({
  id,
  slug: `slug-${id}`,
  title: `Módulo ${id}`,
  dimension_code: "CP",
  pillar_code: "P1",
  unit_number: 1,
  level_code: level,
  estimated_duration_seconds: 300,
  blocks_count: 3,
  attempt_status: "not_started",
  poster_url: null,
  video_url: null,
  keywords: ["Comunicación"],
  ...o,
});

describe("DimensionCatalog", () => {
  beforeEach(() => {
    listByDimension.mockReset();
    listByDimension.mockImplementation(async (pillar: string, level?: string) => {
      if (pillar !== "P1") return [];
      const all = [unit("a", "L1"), unit("b", "L1"), unit("c", "L2")];
      return level ? all.filter((u) => u.level_code === level) : all;
    });
  });

  it("los controles Dimensión/Skill usan el estilo glass", async () => {
    render(<DimensionCatalog />);
    const group = await screen.findByRole("tablist", { name: "Agrupar por" });
    expect(group.className).toContain("glass-fill-strong");

    fireEvent.click(screen.getByRole("tab", { name: "Skill" }));
    const skill = await screen.findByRole("tab", { name: "Comunicación" });
    expect(skill.className).toContain("glass-fill-strong");
  });

  it("Carrera muestra los niveles y filtra por nivel; el que no tiene contenido queda deshabilitado", async () => {
    render(<DimensionCatalog />);
    const levels = await screen.findByRole("group", { name: "Nivel" });
    expect(levels.textContent).toContain("Nivel 1");
    expect(levels.textContent).toContain("Nivel 2");
    const l3 = screen.getByRole("button", { name: /Nivel 3/ }) as HTMLButtonElement;
    expect(l3.disabled).toBe(true);

    expect(screen.getByText("Módulo a")).toBeTruthy();
    expect(screen.getByText("Módulo c")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Nivel 2/ }));
    await waitFor(() => expect(screen.queryByText("Módulo a")).toBeNull());
    expect(screen.getByText("Módulo c")).toBeTruthy();
    await waitFor(() => expect(listByDimension).toHaveBeenCalledWith("P1", "L2", 50));
  });
});
