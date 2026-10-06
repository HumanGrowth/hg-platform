import { describe, expect, it } from "vitest";

import { homeRouteFor } from "../home-route";

describe("homeRouteFor", () => {
  it("admin y superadmin aterrizan en /admin/org (/admin solo da 404)", () => {
    expect(homeRouteFor("admin")).toBe("/admin/org");
    expect(homeRouteFor("superadmin")).toBe("/admin/org");
  });
  it("company_admin aterriza en la gestión de Empresa (no pasa el gate de /admin/org)", () => {
    expect(homeRouteFor("company_admin")).toBe("/admin/empresa");
  });
  it("colaborador y manager van a /home", () => {
    expect(homeRouteFor("collaborator")).toBe("/home");
    expect(homeRouteFor("manager")).toBe("/home");
  });
});
