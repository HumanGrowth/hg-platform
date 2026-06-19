import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TeamResponse } from "@/lib/types";

import TeamPage from "../page";

const { getTeam } = vi.hoisted(() => ({ getTeam: vi.fn() }));
vi.mock("@/lib/api", () => ({ apiGetMyTeam: getTeam }));

const resp: TeamResponse = {
  total: 2,
  inactive_count: 1,
  items: [
    {
      id: "u1", full_name: "María González", email: "maria@acme.test", role: "collaborator",
      career_level: "L3", job_title: "Sr Engineer", last_active_at: new Date().toISOString(),
      is_inactive: false, courses_in_progress: 3, courses_completed: 5, total_watch_minutes: 120,
      active_enrollments: 2,
    },
    {
      id: "u2", full_name: "Juan Pérez", email: "juan@acme.test", role: "collaborator",
      career_level: "L2", job_title: null, last_active_at: null, is_inactive: true,
      courses_in_progress: 0, courses_completed: 0, total_watch_minutes: 0, active_enrollments: 0,
    },
  ],
};

beforeEach(() => getTeam.mockReset());

describe("TeamPage", () => {
  it("shows loading skeleton on mount", () => {
    getTeam.mockResolvedValue(resp);
    const { container } = render(<TeamPage />);
    expect(container.querySelector(".animate-pulse")).not.toBeNull();
  });

  it("renders team member cards after load", async () => {
    getTeam.mockResolvedValue(resp);
    render(<TeamPage />);
    expect(await screen.findByText("María González")).toBeTruthy();
    expect(screen.getByText("Juan Pérez")).toBeTruthy();
  });

  it("reloads with inactive_only when filter chip clicked", async () => {
    getTeam.mockResolvedValue(resp);
    render(<TeamPage />);
    await screen.findByText("María González");
    fireEvent.click(screen.getByText("Solo inactivos"));
    await waitFor(() =>
      expect(getTeam).toHaveBeenLastCalledWith(expect.objectContaining({ inactive_only: true })),
    );
  });

  it("shows empty state when no reports", async () => {
    getTeam.mockResolvedValue({ items: [], total: 0, inactive_count: 0 });
    render(<TeamPage />);
    expect(await screen.findByText(/Aún no tenés reportes directos/)).toBeTruthy();
  });
});
