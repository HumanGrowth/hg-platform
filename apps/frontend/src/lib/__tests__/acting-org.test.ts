import { beforeEach, describe, expect, it, vi } from "vitest";

import { clearActingOrg, getActingOrg, setActingOrg } from "../acting-org";

describe("acting-org store", () => {
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
    expect(getActingOrg()).toBeNull();
  });

  it("persists and reads back the acting org", () => {
    setActingOrg({ id: "org-1", name: "Acme Corp" });
    expect(getActingOrg()).toEqual({ id: "org-1", name: "Acme Corp" });
  });

  it("clears the acting org", () => {
    setActingOrg({ id: "org-1", name: "Acme Corp" });
    clearActingOrg();
    expect(getActingOrg()).toBeNull();
  });

  it("survives corrupt storage without throwing", () => {
    window.localStorage.setItem("hg_acting_org", "{not json");
    expect(getActingOrg()).toBeNull();
  });
});
