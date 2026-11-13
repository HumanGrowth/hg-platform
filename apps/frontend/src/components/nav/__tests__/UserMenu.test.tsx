import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));

import { UserMenu } from "@/components/nav/UserMenu";
import { useAuthStore } from "@/lib/auth-store";
import type { User } from "@/lib/types";

function login(role: User["role"]) {
  useAuthStore.setState({
    user: { id: "u1", email: "ana@example.com", full_name: "Ana Pérez", role } as User,
  });
}

beforeEach(() => useAuthStore.setState({ user: null }));

describe("UserMenu · Soporte", () => {
  it.each(["collaborator", "admin", "superadmin"] as const)("incluye Soporte para %s", (role) => {
    login(role);
    render(<UserMenu />);
    fireEvent.click(screen.getByRole("button", { expanded: false }));
    const link = screen.getByRole("menuitem", { name: "Soporte" });
    expect(link.getAttribute("href")).toBe("/soporte");
  });

  it("también está en el modo admin", () => {
    login("superadmin");
    render(<UserMenu adminMode />);
    fireEvent.click(screen.getByRole("button", { expanded: false }));
    expect(screen.getByRole("menuitem", { name: "Soporte" })).toBeTruthy();
  });
});
