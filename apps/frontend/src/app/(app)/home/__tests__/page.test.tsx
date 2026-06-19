import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { HomeDashboard } from "@/lib/types";

import HomePage from "../page";

const { getHome, router } = vi.hoisted(() => ({
  getHome: vi.fn(),
  router: { replace: vi.fn(), push: vi.fn() },
}));

vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/lib/api", () => ({ apiGetHomeDashboard: getHome }));
vi.mock("@/lib/auth-store", () => ({
  useAuthStore: (sel: (s: { user: { full_name: string } }) => unknown) =>
    sel({ user: { full_name: "Ana López" } }),
}));

const base: HomeDashboard = {
  next_step: {
    course_id: "c1",
    course_slug: "l1-c1-demo",
    course_title: "Comunicación efectiva",
    pillar_code: "P1",
    career_level: "L1",
    duration_seconds: 300,
    watch_pct: 40,
    last_played_at: new Date().toISOString(),
  },
  active_enrollments: [],
  pillar_completion_rates: { P1: 0.5, P2: 0.0, P3: 0.0, P4: 0.0, P5: 0.0, P6: 0.0 },
  recent_activity: [
    {
      course_id: "c1",
      course_slug: "l1-c1-demo",
      course_title: "Comunicación efectiva",
      pillar_code: "P1",
      is_completed: false,
      last_played_at: new Date().toISOString(),
      completed_at: null,
    },
  ],
  stats: {
    courses_in_progress: 1,
    courses_completed: 3,
    total_watch_minutes: 120,
    month_watch_minutes: 45,
    streak_days: 4,
  },
};

beforeEach(() => getHome.mockReset());

describe("HomePage", () => {
  it("shows loading state on mount", () => {
    getHome.mockResolvedValue(base);
    render(<HomePage />);
    expect(screen.getByText(/Cargando tu progreso/)).toBeTruthy();
  });

  it("renders next_step with a Continuar link to the course", async () => {
    getHome.mockResolvedValue(base);
    render(<HomePage />);
    const link = await screen.findByRole("link", { name: /Continuar/ });
    expect(link.getAttribute("href")).toBe("/library/l1-c1-demo");
    // El título aparece en el próximo paso y en actividad reciente.
    expect(screen.getAllByText("Comunicación efectiva").length).toBeGreaterThan(0);
  });

  it("shows library fallback when there is no next_step", async () => {
    getHome.mockResolvedValue({ ...base, next_step: null });
    render(<HomePage />);
    expect(await screen.findByText("Explorá la biblioteca")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Ver biblioteca/ }).getAttribute("href")).toBe(
      "/library",
    );
  });

  it("renders stats (streak, month minutes, completed) and pillar completion %", async () => {
    getHome.mockResolvedValue(base);
    render(<HomePage />);
    expect(await screen.findByText("4")).toBeTruthy(); // streak_days
    expect(screen.getByText("45")).toBeTruthy(); // month_watch_minutes
    expect(screen.getByText("3")).toBeTruthy(); // courses_completed
    expect(screen.getByText("50%")).toBeTruthy(); // P1 completion rate
  });

  it("renders all 6 pillar dimension cards", async () => {
    getHome.mockResolvedValue(base);
    render(<HomePage />);
    await screen.findByText("Tus 6 dimensiones");
    for (const name of [
      "Carrera e impacto",
      "Propósito y significado",
      "Relaciones y conexión",
      "Salud y bienestar",
      "Paz interior y claridad",
      "Estabilidad emocional y material",
    ]) {
      expect(screen.getByText(name)).toBeTruthy();
    }
  });
});
