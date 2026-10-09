import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getTips = vi.fn();
vi.mock("@/lib/api", () => ({
  apiGetMyPillarTips: (...a: unknown[]) => getTips(...a),
  apiSaveTip: vi.fn(),
}));

import { PillarTipsViewer } from "../PillarTipsViewer";

const tip = (text: string, source: "coaching" | "module" = "coaching") => ({
  text, source, unit_id: null, unit_slug: null, unit_title: null, block_id: null,
});

describe("PillarTipsViewer", () => {
  beforeEach(() => {
    getTips.mockReset();
    getTips.mockResolvedValue([
      { dimension_code: "CP", career_path_code: "P1", pillar_code: "P1", pillar_name: "Adaptabilidad de aprendizaje", tips: [tip("Tip uno"), tip("Tip dos", "module")] },
      { dimension_code: "PR", career_path_code: "P2", pillar_code: "V1", pillar_name: "Etapa V1", tips: [tip("Tip de propósito")] },
    ]);
  });

  it("muestra un tip a la vez y navega entre ellos", async () => {
    render(<PillarTipsViewer />);
    await waitFor(() => expect(screen.getByText("Tip uno")).toBeTruthy());
    expect(screen.queryByText("Tip dos")).toBeNull();
    fireEvent.click(screen.getByLabelText("Tip siguiente"));
    expect(screen.getByText("Tip dos")).toBeTruthy();
    expect(screen.getByText("2 / 2")).toBeTruthy();
  });

  it("cambia de dimensión con los tabs y ofrece guardar el tip", async () => {
    render(<PillarTipsViewer />);
    await waitFor(() => expect(screen.getByText("Tip uno")).toBeTruthy());
    fireEvent.click(screen.getByRole("tab", { name: "Propósito" }));
    expect(screen.getByText("Tip de propósito")).toBeTruthy();
    expect(screen.getByText("Etapa V1")).toBeTruthy();
    expect(screen.getByText("Guardar en mi Plan")).toBeTruthy();
  });

  it("no renderiza nada si no hay tips", async () => {
    getTips.mockResolvedValue([]);
    const { container } = render(<PillarTipsViewer />);
    await waitFor(() => expect(container.querySelector(".animate-pulse")).toBeNull());
    expect(screen.queryByText("Tips para tu pilar")).toBeNull();
  });
});
