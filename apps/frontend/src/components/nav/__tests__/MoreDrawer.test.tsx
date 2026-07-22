import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { MoreDrawer } from "../MoreDrawer";

const { state } = vi.hoisted(() => ({
  state: { user: null as { role: string; reports_count: number } | null },
}));

vi.mock("@/lib/auth-store", () => {
  const useAuthStore = (sel: (s: { user: unknown }) => unknown) => sel({ user: state.user });
  (useAuthStore as unknown as { getState: () => unknown }).getState = () => ({ clear: () => {} });
  return { useAuthStore };
});
vi.mock("@/lib/api", () => ({ apiLogout: vi.fn() }));

function open() {
  render(<MoreDrawer open onClose={() => {}} />);
}

describe("MoreDrawer (TASK polish-07)", () => {
  it("renders nothing when closed", () => {
    state.user = { role: "collaborator", reports_count: 0 };
    const { container } = render(<MoreDrawer open={false} onClose={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it("collaborator: Eventos + Editar + Cerrar sesión, sin Mi equipo/Modo admin", () => {
    state.user = { role: "collaborator", reports_count: 0 };
    open();
    expect(screen.getByText(/Eventos/)).toBeTruthy();
    expect(screen.getByText(/Editar mi información/)).toBeTruthy();
    expect(screen.getByText(/Cerrar sesión/)).toBeTruthy();
    expect(screen.queryByText("Mi equipo")).toBeNull();
    expect(screen.queryByText("Modo admin")).toBeNull();
  });

  it("manager with reports: adds Mi equipo, still no Modo admin", () => {
    state.user = { role: "manager", reports_count: 4 };
    open();
    expect(screen.getByText("Mi equipo")).toBeTruthy();
    expect(screen.queryByText("Modo admin")).toBeNull();
  });

  it("manager without reports: no Mi equipo", () => {
    state.user = { role: "manager", reports_count: 0 };
    open();
    expect(screen.queryByText("Mi equipo")).toBeNull();
  });

  it("admin: adds Modo admin", () => {
    state.user = { role: "admin", reports_count: 0 };
    open();
    expect(screen.getByText("Modo admin")).toBeTruthy();
  });
});
