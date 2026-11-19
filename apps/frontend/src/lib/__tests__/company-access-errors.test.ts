import { AxiosError, AxiosHeaders } from "axios";
import { describe, expect, it } from "vitest";

import { ApiError, apiErrorMessage, companyAccessError, licenseOverageError } from "@/lib/api";
import { es } from "@/lib/locales/es";
import { en } from "@/lib/locales/en";

function axiosErr(status: number, detail: unknown): AxiosError {
  return new AxiosError(String(status), "ERR", undefined, undefined, {
    status,
    statusText: "x",
    data: { detail },
    headers: {},
    config: { headers: new AxiosHeaders() },
  });
}

const axios403 = (detail: unknown) => axiosErr(403, detail);

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

describe("licenseOverageError", () => {
  it("reads the numbers of the 409 license_overage", () => {
    const e = axiosErr(409, {
      code: "license_overage", message: "x", active: 1, invited: 3, to_invite: 3, pool: 5, overage: 2,
    });  // prettier-ignore
    expect(licenseOverageError(e)).toEqual({ active: 1, invited: 3, to_invite: 3, pool: 5, overage: 2 });
  });
  it("ignores other 409s and other errors", () => {
    expect(licenseOverageError(axiosErr(409, { code: "invalid_transition" }))).toBeNull();
    expect(licenseOverageError(axiosErr(409, "company slug already exists"))).toBeNull();
    expect(licenseOverageError(axiosErr(400, { code: "license_overage" }))).toBeNull();
    expect(licenseOverageError(new Error("x"))).toBeNull();
  });
});
