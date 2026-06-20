import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type {
  AdoptionMonthPoint,
  InactivityBuckets,
  MonthlyWatchPoint,
  OnboardingFunnel,
  StreakDay,
  WeeklyMinutesBar as WeeklyBar,
} from "@/lib/types";

import { AdoptionCurve } from "../AdoptionCurve";
import { InactivityFunnel } from "../InactivityFunnel";
import { MonthlyWatchBar } from "../MonthlyWatchBar";
import { OnboardingFunnelChart } from "../OnboardingFunnelChart";
import { StreakHeatmap } from "../StreakHeatmap";
import { WeeklyMinutesBar } from "../WeeklyMinutesBar";

function makeStreak(activeIdx: number[]): StreakDay[] {
  return Array.from({ length: 90 }, (_, i) => {
    const d = new Date(2026, 0, 1);
    d.setDate(d.getDate() + i);
    const minutes = activeIdx.includes(i) ? 20 : 0;
    return { date: d.toISOString().slice(0, 10), minutes, has_activity: minutes > 0 };
  });
}

describe("StreakHeatmap", () => {
  it("renders an accessible sr-only table with active days", () => {
    const { container } = render(<StreakHeatmap data={makeStreak([0, 1, 2])} />);
    const table = container.querySelector("table");
    expect(table).not.toBeNull();
    // role=img presente para lectores de pantalla
    expect(container.querySelector('[role="img"]')).not.toBeNull();
    expect(screen.getByText("3", { selector: "span" })).toBeTruthy();
  });

  it("summarizes zero active days when empty", () => {
    const { container } = render(<StreakHeatmap data={makeStreak([])} />);
    // sin actividad: la tabla sr-only no tiene filas de datos
    expect(container.querySelectorAll("tbody tr").length).toBe(0);
    expect(screen.getAllByText(/días activos/).length).toBeGreaterThan(0);
  });
});

describe("WeeklyMinutesBar", () => {
  it("renders 12 rows in the sr-only table", () => {
    const data: WeeklyBar[] = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(2026, 0, 5);
      d.setDate(d.getDate() + i * 7);
      return { week_start: d.toISOString().slice(0, 10), minutes: i * 5 };
    });
    const { container } = render(<WeeklyMinutesBar data={data} />);
    const rows = container.querySelectorAll("tbody tr");
    expect(rows.length).toBe(12);
  });
});

describe("InactivityFunnel", () => {
  it("renders all 6 buckets with total in the table", () => {
    const buckets: InactivityBuckets = {
      active: 3,
      inactive_1_7d: 2,
      inactive_8_14d: 1,
      inactive_15_30d: 1,
      inactive_gt_30d: 0,
      never_active: 1,
    };
    const { container } = render(<InactivityFunnel buckets={buckets} total={8} />);
    const rows = container.querySelectorAll("tbody tr");
    expect(rows.length).toBe(6);
    expect(within(container.querySelector("table")!).getByText("Activos (24h)")).toBeTruthy();
  });
});

describe("AdoptionCurve", () => {
  const months = (vals: number[]): AdoptionMonthPoint[] =>
    vals.map((v, i) => ({ month: `2026-${String(i + 1).padStart(2, "0")}`, active_users: v }));

  it("shows empty state with fewer than 2 meaningful points", () => {
    render(<AdoptionCurve data={months([0, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 0])} />);
    expect(screen.getByText(/Necesitamos más historial/)).toBeTruthy();
  });

  it("renders chart + table with 2+ meaningful points", () => {
    const { container } = render(
      <AdoptionCurve data={months([1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])} />,
    );
    expect(container.querySelector("table")).not.toBeNull();
    expect(container.querySelector('[role="img"]')).not.toBeNull();
  });
});

describe("OnboardingFunnelChart", () => {
  it("renders 5 stages in the table", () => {
    const funnel: OnboardingFunnel = {
      invited: 10,
      accepted: 7,
      first_login: 6,
      first_course: 4,
      first_completion: 2,
    };
    const { container } = render(<OnboardingFunnelChart funnel={funnel} />);
    const rows = container.querySelectorAll("tbody tr");
    expect(rows.length).toBe(5);
    expect(within(container.querySelector("table")!).getByText("Invitados")).toBeTruthy();
  });
});

describe("MonthlyWatchBar", () => {
  it("converts minutes to hours in the sr-only table", () => {
    const data: MonthlyWatchPoint[] = [{ month: "2026-06", minutes: 120 }];
    const { container } = render(<MonthlyWatchBar data={data} />);
    // 120 min = 2 h
    expect(within(container.querySelector("table")!).getByText("2")).toBeTruthy();
  });
});
