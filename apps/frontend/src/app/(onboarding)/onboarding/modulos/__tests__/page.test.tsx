import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { OnboardingStatus } from "@/lib/types";

import OnboardingModulosPage from "../page";

const { getStatus } = vi.hoisted(() => ({ getStatus: vi.fn() }));
vi.mock("@/lib/api", () => ({ apiGetOnboardingStatus: getStatus }));

function makeStatus(overrides?: Partial<OnboardingStatus>): OnboardingStatus {
  return {
    is_restricted: true,
    units: [
      { unit_id: "u1", slug: "u1", title: "Bienvenida a HG", estimated_minutes: 5, completed: true },
      { unit_id: "u2", slug: "u2", title: "Cómo usar la plataforma", estimated_minutes: 8, completed: false },
    ],
    completed_count: 1,
    total_count: 2,
    all_completed: false,
    ...overrides,
  };
}

describe("OnboardingModulosPage", () => {
  it("renders the onboarding units with progress", async () => {
    getStatus.mockResolvedValue(makeStatus());
    render(<OnboardingModulosPage />);
    await waitFor(() => expect(screen.getByText("Bienvenida a HG")).toBeTruthy());
    expect(screen.getByText("Cómo usar la plataforma")).toBeTruthy();
    expect(screen.getByText("1 de 2 completados")).toBeTruthy();
  });

  it("shows a waiting message once all onboarding units are completed", async () => {
    getStatus.mockResolvedValue(makeStatus({ completed_count: 2, all_completed: true }));
    render(<OnboardingModulosPage />);
    await waitFor(() => expect(screen.getByText(/Completaste el onboarding/)).toBeTruthy());
  });

  it("shows an empty state when there are no onboarding units yet", async () => {
    getStatus.mockResolvedValue(makeStatus({ units: [], completed_count: 0, total_count: 0 }));
    render(<OnboardingModulosPage />);
    await waitFor(() =>
      expect(screen.getByText(/Todavía no hay módulos de onboarding/)).toBeTruthy(),
    );
  });
});
