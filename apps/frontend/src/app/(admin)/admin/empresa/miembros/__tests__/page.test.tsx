import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CompanyMember } from "@/lib/types";

import CompanyMembersPage from "../page";

const m = vi.hoisted(() => ({
  members: vi.fn(),
  orgs: vi.fn(),
  resend: vi.fn(),
  sendAll: vi.fn(),
  discard: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));
vi.mock("@/components/CompanyAdminGate", () => ({
  CompanyAdminGate: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("@/lib/acting-company", () => ({
  useScopedCompanyId: () => ({ companyId: undefined, ready: true }),
}));
vi.mock("@/lib/auth-store", () => ({
  useAuthStore: (sel: (s: unknown) => unknown) => sel({ user: { id: "me", role: "company_admin" } }),
}));
vi.mock("@/lib/api", () => ({
  apiCompanyMembers: m.members,
  apiCompanyOrgs: m.orgs,
  apiResendInvite: m.resend,
  apiSendInvitations: m.sendAll,
  apiDiscardInvite: m.discard,
  apiCompanyInvite: vi.fn(),
  apiDeleteUser: vi.fn(),
  apiUpdateCompanyMember: vi.fn(),
  apiErrorMessage: (_e: unknown, fallback: string) => fallback,
  ApiError: class extends Error {},
}));

function member(over: Partial<CompanyMember>): CompanyMember {
  return {
    id: "u",
    full_name: "Persona",
    email: "p@x.test",
    role: "collaborator",
    org_id: "o1",
    org_name: "Ventas",
    manager_id: null,
    manager_name: null,
    is_active: true,
    is_invited: false,
    invite_status: null,
    last_active_at: null,
    modules_completed: 0,
    modules_in_progress: 0,
    modules_assigned: 0,
    modules_assigned_completed: 0,
    consent_status: "pending",
    dimension_states: {},
    ...over,
  } as CompanyMember;
}

describe("Miembros · invitados", () => {
  beforeEach(() => {
    Object.values(m).forEach((f) => f.mockReset());
    m.orgs.mockResolvedValue([{ id: "o1", name: "Ventas", slug: "ventas", user_count: 1, license_quota: 0 }]);
    m.members.mockResolvedValue([
      member({ id: "a", full_name: "Activa", email: "a@x.test" }),
      member({ id: "s", full_name: "Preparada", email: "s@x.test", is_active: false, is_invited: true, invite_status: "staged" }),
      member({ id: "e", full_name: "Vencida", email: "e@x.test", is_active: false, is_invited: true, invite_status: "expired" }),
      member({ id: "n", full_name: "Enviada", email: "n@x.test", is_active: false, is_invited: true, invite_status: "sent" }),
    ]);
  });

  it("muestra el ícono de reenviar solo cuando la invitación venció", async () => {
    render(<CompanyMembersPage />);
    await waitFor(() => expect(screen.getByText("Vencida")).toBeTruthy());
    expect(screen.getByLabelText("Reenviar invitación a Vencida")).toBeTruthy();
    // Preparada: se ofrece ENVIAR (no reenviar); enviada y activa: ninguno.
    expect(screen.getByLabelText("Enviar invitación a Preparada")).toBeTruthy();
    expect(screen.queryByLabelText(/invitación a Enviada/)).toBeNull();
    expect(screen.queryByLabelText(/invitación a Activa/)).toBeNull();
    expect(screen.getByText("Invitación vencida")).toBeTruthy();
  });

  it("reenviar llama al endpoint de esa persona y recarga", async () => {
    m.resend.mockResolvedValue(undefined);
    render(<CompanyMembersPage />);
    await waitFor(() => expect(screen.getByText("Vencida")).toBeTruthy());
    fireEvent.click(screen.getByLabelText("Reenviar invitación a Vencida"));
    await waitFor(() => expect(m.resend).toHaveBeenCalledWith("e", undefined));
    await waitFor(() => expect(m.members.mock.calls.length).toBeGreaterThan(1));
  });

  it("el aviso cuenta preparadas + vencidas y envía en lote", async () => {
    m.sendAll.mockResolvedValue({ enviadas: 2, omitidas: 0, pendientes: 0, errores: {} });
    render(<CompanyMembersPage />);
    await waitFor(() => expect(screen.getByText("Enviar invitaciones")).toBeTruthy());
    expect(screen.getByText(/están/).textContent).toContain("lista");
    fireEvent.click(screen.getByText("Enviar invitaciones"));
    await waitFor(() => expect(m.sendAll).toHaveBeenCalledWith({}, undefined));
  });
});
