import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { BadgesCarousel } from "../BadgesCarousel";
import type { MyBadge } from "@/lib/types";

const { getMyBadges } = vi.hoisted(() => ({ getMyBadges: vi.fn() }));

vi.mock("@/lib/api", () => ({ apiGetMyBadges: getMyBadges }));
vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: (props: { alt: string }) => <img alt={props.alt} />,
}));

const unlocked: MyBadge = {
  code: "cp-1",
  name: "Primer paso en Carrera",
  description: "Completaste tu primera unidad de Carrera.",
  icon_url: "/icons/hex-rocket-128.png",
  unlock_hint: "Completá una unidad de Carrera.",
  unlocked: true,
  unlocked_at: new Date("2026-07-01").toISOString(),
};

describe("BadgesCarousel", () => {
  beforeEach(() => getMyBadges.mockReset());

  it("shows the empty state when there are no badges", async () => {
    getMyBadges.mockResolvedValue([]);
    render(<BadgesCarousel />);
    await waitFor(() => expect(screen.getByText("Todavía no desbloqueaste badges.")).toBeTruthy());
  });

  it("falls back to empty state when the endpoint fails (catalog not ready)", async () => {
    getMyBadges.mockRejectedValueOnce(new Error("404")).mockResolvedValue([]);
    render(<BadgesCarousel />);
    await waitFor(() => expect(screen.getByText("Todavía no desbloqueaste badges.")).toBeTruthy());
  });

  it("renders badges and opens the detail modal on tap", async () => {
    getMyBadges.mockResolvedValue([unlocked]);
    render(<BadgesCarousel />);
    await waitFor(() => expect(screen.getByText("Primer paso en Carrera")).toBeTruthy());
    fireEvent.click(screen.getByText("Primer paso en Carrera"));
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText("Completaste tu primera unidad de Carrera.")).toBeTruthy();
    expect(screen.getByText(/Desbloqueado/)).toBeTruthy();
  });
});
