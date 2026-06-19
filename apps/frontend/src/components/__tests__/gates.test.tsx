import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { OrgAdminGate } from "@/components/OrgAdminGate";
import { SuperadminGate } from "@/components/SuperadminGate";

const { router, toast, state } = vi.hoisted(() => ({
  router: { replace: vi.fn(), push: vi.fn() },
  toast: vi.fn(),
  state: { role: "collaborator" as string },
}));

vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/lib/toast-store", () => ({ toast }));
vi.mock("@/lib/auth-store", () => ({
  useAuthStore: (sel: (s: { user: { role: string } }) => unknown) =>
    sel({ user: { role: state.role } }),
}));

afterEach(() => {
  router.replace.mockReset();
  toast.mockReset();
});

describe("SuperadminGate", () => {
  it("renders children for a superadmin", async () => {
    state.role = "superadmin";
    render(
      <SuperadminGate>
        <span>panel HG</span>
      </SuperadminGate>,
    );
    expect(await screen.findByText("panel HG")).toBeTruthy();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("redirects an admin (non-superadmin) to /home with a toast", async () => {
    state.role = "admin";
    render(
      <SuperadminGate>
        <span>panel HG</span>
      </SuperadminGate>,
    );
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/home"));
    expect(toast).toHaveBeenCalled();
    expect(screen.queryByText("panel HG")).toBeNull();
  });
});

describe("OrgAdminGate", () => {
  it("renders children for an org admin", async () => {
    state.role = "admin";
    render(
      <OrgAdminGate>
        <span>panel org</span>
      </OrgAdminGate>,
    );
    expect(await screen.findByText("panel org")).toBeTruthy();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("redirects a collaborator to /home with a toast", async () => {
    state.role = "collaborator";
    render(
      <OrgAdminGate>
        <span>panel org</span>
      </OrgAdminGate>,
    );
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/home"));
    expect(toast).toHaveBeenCalled();
    expect(screen.queryByText("panel org")).toBeNull();
  });
});
