import { AxiosError, AxiosHeaders } from "axios";
import { describe, expect, it } from "vitest";

import { ApiError, apiErrorMessage, companyAccessError } from "@/lib/api";
import { es } from "@/lib/locales/es";
import { en } from "@/lib/locales/en";

function axios403(detail: unknown): AxiosError {
  return new AxiosError("403", "ERR", undefined, undefined, {
    status: 403,
    statusText: "Forbidden",
    data: { detail },
    headers: {},
    config: { headers: new AxiosHeaders() },
  });
}

describe("companyAccessError", () => {
  it("recognises the backend's company_* 403 from axios", () => {
    const e = companyAccessError(
      axios403({ code: "company_read_only", message: "solo lectura", grace_ends_at: "2026-12-01T00:00:00Z" }),
    );
    expect(e).toEqual({
      code: "company_read_only",
      message: "solo lectura",
      graceEndsAt: "2026-12-01T00:00:00Z",
    });
  });

  it("recognises it from the session routes (ApiError with code)", () => {
    expect(companyAccessError(new ApiError("pausado", 403, "company_suspended"))?.code).toBe("company_suspended");
  });

  it("ignores any other error, including plain-string 403s", () => {
    expect(companyAccessError(axios403("insufficient role"))).toBeNull();
    expect(companyAccessError(new ApiError("invalid credentials", 401))).toBeNull();
    expect(companyAccessError(new Error("x"))).toBeNull();
  });
});

describe("apiErrorMessage with object details", () => {
  it("reads detail.message from the new error contract", () => {
    expect(apiErrorMessage(axios403({ code: "invalid_transition", message: "No permitido" }), "fb")).toBe(
      "No permitido",
    );
  });
  it("still reads string details and falls back otherwise", () => {
    expect(apiErrorMessage(axios403("insufficient role"), "fb")).toBe("insufficient role");
    expect(apiErrorMessage(axios403({ code: "x" }), "fb")).toBe("fb");
  });
});

describe("companyLifecycle copy", () => {
  it("es and en have the same shape", () => {
    const keys = (o: unknown, p = ""): string[] =>
      o && typeof o === "object"
        ? Object.entries(o).flatMap(([k, v]) => keys(v, `${p}${k}.`))
        : [p];
    expect(keys(en.companyLifecycle).sort()).toEqual(keys(es.companyLifecycle).sort());
  });
});
