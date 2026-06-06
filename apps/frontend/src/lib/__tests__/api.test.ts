import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError, apiLogin, apiMe, backend } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";

function mockFetch(status: number, body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("apiLogin", () => {
  it("postea a la API route y devuelve {user, accessToken}", async () => {
    const payload = { user: { id: "u1", email: "a@b.test" }, accessToken: "tok" };
    const fetchMock = mockFetch(200, payload);
    vi.stubGlobal("fetch", fetchMock);

    const res = await apiLogin("a@b.test", "secret123");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/login",
      expect.objectContaining({ method: "POST" }),
    );
    const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(sent).toMatchObject({ email: "a@b.test", password: "secret123" });
    expect(res.accessToken).toBe("tok");
  });

  it("lanza ApiError con el status en credenciales inválidas", async () => {
    vi.stubGlobal("fetch", mockFetch(401, { detail: "invalid credentials" }));
    await expect(apiLogin("a@b.test", "wrong")).rejects.toMatchObject({
      constructor: ApiError,
      status: 401,
    });
  });
});

describe("interceptor — refresh fallido (ISSUE-1)", () => {
  it("limpia la sesión + redirige a /login cuando el refresh falla", async () => {
    // El backend siempre responde 401 (token expirado/revocado).
    const prevAdapter = backend.defaults.adapter;
    backend.defaults.adapter = async (config) =>
      Promise.reject(
        Object.assign(new Error("401"), {
          config,
          response: { status: 401, data: {}, statusText: "", headers: {}, config },
        }),
      );
    // /api/auth/refresh (fetch) también falla -> no se puede renovar.
    vi.stubGlobal("fetch", mockFetch(401, { detail: "no session" }));
    // Mock de window.location para capturar el redirect.
    const orig = window.location;
    Object.defineProperty(window, "location", {
      value: { href: "" },
      writable: true,
      configurable: true,
    });

    useAuthStore.getState().setSession(
      {
        id: "u1",
        email: "a@b.test",
        full_name: "A B",
        role: "admin",
        org_id: "o1",
        career_level: null,
      },
      "expired-token",
    );

    await expect(apiMe()).rejects.toBeTruthy();
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(window.location.href).toBe("/login?reason=expired");

    Object.defineProperty(window, "location", {
      value: orig,
      writable: true,
      configurable: true,
    });
    backend.defaults.adapter = prevAdapter;
  });
});
