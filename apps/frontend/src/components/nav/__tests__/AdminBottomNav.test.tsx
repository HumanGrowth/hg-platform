import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AdminBottomNav } from "../AdminBottomNav";

vi.mock("next/navigation", () => ({ usePathname: () => "/admin/org" }));

describe("AdminBottomNav", () => {
  it("superadmin sees Panel + Orgs + Eventos + Contenido + Salir", () => {
    render(<AdminBottomNav isSuperadmin />);
    for (const label of ["Panel", "Orgs", "Eventos", "Contenido", "Salir"]) {
      expect(screen.getByText(label)).toBeTruthy();
    }
  });

  it("non-superadmin admin only sees Panel + Salir (no Orgs/Eventos/Contenido)", () => {
    render(<AdminBottomNav isSuperadmin={false} />);
    expect(screen.getByText("Panel")).toBeTruthy();
    expect(screen.getByText("Salir")).toBeTruthy();
    expect(screen.queryByText("Orgs")).toBeNull();
    expect(screen.queryByText("Eventos")).toBeNull();
    expect(screen.queryByText("Contenido")).toBeNull();
  });
});
