import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AdminBottomNav } from "../AdminBottomNav";

vi.mock("next/navigation", () => ({ usePathname: () => "/admin/org" }));

describe("AdminBottomNav", () => {
  it("superadmin ve Panel + Empresas + Eventos + Contenido + Salir", () => {
    render(<AdminBottomNav role="superadmin" />);
    for (const label of ["Panel", "Empresas", "Eventos", "Contenido", "Salir"]) {
      expect(screen.getByText(label)).toBeTruthy();
    }
  });

  it("admin de org: solo Panel + Salir", () => {
    render(<AdminBottomNav role="admin" />);
    expect(screen.getByText("Panel")).toBeTruthy();
    expect(screen.getByText("Salir")).toBeTruthy();
    expect(screen.queryByText("Empresas")).toBeNull();
    expect(screen.queryByText("Eventos")).toBeNull();
    expect(screen.queryByText("Contenido")).toBeNull();
  });

  it("company_admin: Empresa + Miembros + Importar + Salir (sin Panel roto)", () => {
    render(<AdminBottomNav role="company_admin" />);
    for (const label of ["Empresa", "Miembros", "Importar", "Salir"]) {
      expect(screen.getByText(label)).toBeTruthy();
    }
    // "Panel" (/admin/org) rebota al company_admin → no debe aparecer.
    expect(screen.queryByText("Panel")).toBeNull();
  });
});
