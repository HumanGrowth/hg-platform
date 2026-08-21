import { beforeEach, describe, expect, it, vi } from "vitest";

import { getActingOrg, setActingOrg } from "../acting-org";
import { clearActingCompany, getActingCompany, setActingCompany } from "../acting-company";

describe("acting-company store", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
      clear: () => store.clear(),
    });
  });

  it("returns null when nothing is set", () => {
    expect(getActingCompany()).toBeNull();
  });

  it("persists and reads back the acting company", () => {
    setActingCompany({ id: "co-1", name: "Acme SA" });
    expect(getActingCompany()).toEqual({ id: "co-1", name: "Acme SA" });
  });

  it("clears the acting company", () => {
    setActingCompany({ id: "co-1", name: "Acme SA" });
    clearActingCompany();
    expect(getActingCompany()).toBeNull();
  });

  it("setting a company clears any acting-org (un solo contexto activo)", () => {
    setActingOrg({ id: "org-9", name: "Org Nine" });
    setActingCompany({ id: "co-1", name: "Acme SA" });
    expect(getActingOrg()).toBeNull();
    expect(getActingCompany()).toEqual({ id: "co-1", name: "Acme SA" });
  });

  it("survives corrupt storage without throwing", () => {
    window.localStorage.setItem("hg_acting_company", "{not json");
    expect(getActingCompany()).toBeNull();
  });
});
