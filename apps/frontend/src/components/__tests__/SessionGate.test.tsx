import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SessionGate } from "@/components/SessionGate";

const { router, apiMe, apiRefresh } = vi.hoisted(() => ({
  router: { replace: vi.fn(), push: vi.fn() },
  apiMe: vi.fn(),
  apiRefresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/lib/api", () => ({ apiMe, apiRefresh }));

// Store mutable a nivel de módulo: setSession lo actualiza y el re-render
// (por meChecked) re-lee el user fresco, como el store real.
let storeUser: Record<string, unknown> | null = null;
const setSession = vi.fn((u: Record<string, unknown>) => {
  storeUser = u;
});
vi.mock("@/lib/auth-store", () => ({
  useAuthStore: () => ({
    accessToken: "tok",
    hydrating: false,
    setSession,
    clear: vi.fn(),
    user: storeUser,
  }),
}));

const completed = { has_completed_onboarding: true, consent_manager: true, consent_hr: true };
const incomplete = { has_completed_onboarding: false, consent_manager: true, consent_hr: true };

beforeEach(() => {
  vi.clearAllMocks();
  storeUser = null;
});

describe("SessionGate · gate de onboarding", () => {
  it("no redirige al assessment cuando el user viejo es incompleto pero /me confirma completado (fix del loop)", async () => {
    // Store arranca con el user VIEJO (incompleto), como tras finalizar el
    // assessment sin refrescar el store.
    storeUser = { ...incomplete };
    apiMe.mockResolvedValue({ ...completed });

    render(
      <SessionGate requireOnboarding>
        <div>app-home</div>
      </SessionGate>,
    );

    // Espera a que /me confirme y renderice la app.
    await waitFor(() => expect(screen.getByText("app-home")).toBeTruthy());
    // No debe haber mandado de vuelta al onboarding.
    expect(router.replace).not.toHaveBeenCalledWith("/onboarding/welcome");
  });

  it("redirige al assessment cuando /me confirma que el onboarding NO está completo", async () => {
    storeUser = { ...incomplete };
    apiMe.mockResolvedValue({ ...incomplete });

    render(
      <SessionGate requireOnboarding>
        <div>app-home</div>
      </SessionGate>,
    );

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/onboarding/welcome"));
  });
});
