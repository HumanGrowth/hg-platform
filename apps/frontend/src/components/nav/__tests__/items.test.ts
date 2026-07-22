import { describe, expect, it } from "vitest";

import type { User } from "@/lib/types";

import { isActive, showTeam, sideNavItemsForRole } from "../items";

function user(partial: Partial<Pick<User, "role" | "reports_count">>): Pick<User, "role" | "reports_count"> {
  return { role: "collaborator", reports_count: 0, ...partial } as Pick<User, "role" | "reports_count">;
}

function hrefs(u: Parameters<typeof sideNavItemsForRole>[0]): string[] {
  return sideNavItemsForRole(u).map((i) => i.href);
}

describe("sideNavItemsForRole (TASK polish-04)", () => {
  it("collaborator sees the base items + Eventos, but not team/admin", () => {
    const items = hrefs(user({ role: "collaborator" }));
    expect(items).toEqual(["/home", "/path", "/modulos", "/eventos", "/perfil"]);
    expect(items).not.toContain("/team");
    expect(items).not.toContain("/admin/org");
  });

  it("includes Eventos in the desktop sidebar for every role", () => {
    for (const role of ["collaborator", "manager", "admin", "superadmin"] as const) {
      expect(hrefs(user({ role }))).toContain("/eventos");
    }
  });

  it("shows 'Mi equipo' only for managers with reports", () => {
    expect(hrefs(user({ role: "manager", reports_count: 3 }))).toContain("/team");
    expect(hrefs(user({ role: "manager", reports_count: 0 }))).not.toContain("/team");
    expect(hrefs(user({ role: "collaborator", reports_count: 5 }))).not.toContain("/team");
  });

  it("shows 'Modo admin' only for admin/superadmin", () => {
    expect(hrefs(user({ role: "admin" }))).toContain("/admin/org");
    expect(hrefs(user({ role: "superadmin" }))).toContain("/admin/org");
    expect(hrefs(user({ role: "manager", reports_count: 3 }))).not.toContain("/admin/org");
  });

  it("hides everything role-gated for an anonymous/null user", () => {
    const items = hrefs(null);
    expect(items).toContain("/eventos");
    expect(items).not.toContain("/team");
    expect(items).not.toContain("/admin/org");
  });
});

describe("showTeam", () => {
  it("requires a manager role AND reports_count > 0", () => {
    expect(showTeam(user({ role: "manager", reports_count: 2 }))).toBe(true);
    expect(showTeam(user({ role: "manager", reports_count: 0 }))).toBe(false);
    expect(showTeam(user({ role: "collaborator", reports_count: 9 }))).toBe(false);
    expect(showTeam(null)).toBe(false);
  });
});

describe("isActive", () => {
  it("matches exact path and nested sub-routes", () => {
    expect(isActive("/eventos", "/eventos")).toBe(true);
    expect(isActive("/eventos/abc", "/eventos")).toBe(true);
    expect(isActive("/modulos", "/eventos")).toBe(false);
    // no false-positive por prefijo parcial de segmento
    expect(isActive("/eventos-live", "/eventos")).toBe(false);
  });
});
