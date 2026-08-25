import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AdminBottomNav } from "../AdminBottomNav";

vi.mock("next/navigation", () => ({ usePathname: () => "/admin/org" }));

describe("AdminBottomNav", () => {
  it("superadmin (sin empresa elegida): Empresas + Eventos + Contenido + Salir", () => {
    render(<AdminBottomNav role="superadmin" />);
    for (const label of ["Empresas", "Eventos", "Contenido", "Salir"]) {
      expect(screen.getByText(label)).toBeTruthy();
    }
    // Sin empresa elegida, el dashboard (HG) no aplica.
    expect(screen.queryByText("Dashboard")).toBeNull();
  });

  it("admin (rol unificado): Dashboard + Miembros + Orgs + Salir", () => {
    render(<AdminBottomNav role="admin" />);
    for (const label of ["Dashboard", "Miembros", "Orgs", "Salir"]) {
      expect(screen.getByText(label)).toBeTruthy();
    }
    // Cosas de superadmin no aparecen.
    expect(screen.queryByText("Empresas")).toBeNull();
    expect(screen.queryByText("Contenido")).toBeNull();
  });

  it("company_admin (legado): Miembros + Orgs + Importar + Salir (sin Dashboard)", () => {
    render(<AdminBottomNav role="company_admin" />);
    for (const label of ["Miembros", "Orgs", "Importar", "Salir"]) {
      expect(screen.getByText(label)).toBeTruthy();
    }
    // Dashboard (/admin/org) lo restringe OrgAdminGate → no debe aparecer.
    expect(screen.queryByText("Dashboard")).toBeNull();
  });
});
