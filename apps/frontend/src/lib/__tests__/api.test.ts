import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError, apiLogin } from "@/lib/api";

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
