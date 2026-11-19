import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { CompanyGraceBanner, GraceBanner } from "@/components/company/CompanyGraceBanner";
import { useAuthStore } from "@/lib/auth-store";
import type { User } from "@/lib/types";

const base: User = {
  id: "u1",
  email: "a@b.test",
  full_name: "Ana",
  role: "collaborator",
  org_id: "o1",
  career_level: null,
};

afterEach(() => {
  cleanup(); // desmonta antes de resetear el store (evita updates fuera de act)
  act(() => useAuthStore.setState({ user: null, accessToken: null }));
});

describe("GraceBanner", () => {
  it("shows the end date of the grace period", () => {
    render(<GraceBanner graceEndsAt="2026-12-16T18:00:00Z" />);
    const el = screen.getByRole("status");
    expect(el.textContent).toContain("Tu empresa ya no tiene licencia activa. Puedes ver tu progreso hasta el");
    expect(el.textContent).toContain("2026");
    expect(el.textContent).not.toContain("{date}");
  });

  it("falls back to a dateless message", () => {
    render(<GraceBanner graceEndsAt={null} />);
    expect(screen.getByRole("status").textContent).toContain("Por ahora solo puedes ver tu progreso");
  });

  it("has English parity", () => {
    render(<GraceBanner graceEndsAt="2026-12-16T18:00:00Z" lang="en" />);
    expect(screen.getByRole("status").textContent).toContain("You can view your progress until");
  });
});

describe("CompanyGraceBanner", () => {
  it("renders only while the user's company is in grace", () => {
    act(() => useAuthStore.setState({ user: { ...base, company_status: "grace", grace_ends_at: "2026-12-16T18:00:00Z" } }));
    render(<CompanyGraceBanner />);
    expect(screen.getByTestId("grace-banner")).toBeTruthy();
  });

  it.each(["active", "trial", "suspended", undefined] as const)("is hidden for %s", (status) => {
    act(() => useAuthStore.setState({ user: { ...base, company_status: status } }));
    render(<CompanyGraceBanner />);
    expect(screen.queryByTestId("grace-banner")).toBeNull();
  });

  it("is hidden for superadmin and when logged out", () => {
    act(() => useAuthStore.setState({ user: { ...base, role: "superadmin", company_status: "grace" } }));
    const { unmount } = render(<CompanyGraceBanner />);
    expect(screen.queryByTestId("grace-banner")).toBeNull();
    unmount();
    act(() => useAuthStore.setState({ user: null }));
    render(<CompanyGraceBanner />);
    expect(screen.queryByTestId("grace-banner")).toBeNull();
  });
});
