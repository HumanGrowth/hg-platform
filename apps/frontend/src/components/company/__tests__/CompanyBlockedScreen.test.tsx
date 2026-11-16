import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CompanyBlockedScreen } from "@/components/company/CompanyBlockedScreen";

describe("CompanyBlockedScreen", () => {
  it("tells the person who to contact, in friendly Spanish", () => {
    render(<CompanyBlockedScreen onLogout={vi.fn()} />);
    expect(screen.getByRole("alert").textContent).toContain(
      "El acceso de tu empresa a Human Growth está pausado. Contacta a tu administrador de RRHH.",
    );
  });

  it("lets the person sign out", () => {
    const onLogout = vi.fn();
    render(<CompanyBlockedScreen onLogout={onLogout} />);
    fireEvent.click(screen.getByText("Cerrar sesión"));
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it("has English parity", () => {
    render(<CompanyBlockedScreen onLogout={vi.fn()} lang="en" />);
    expect(screen.getByRole("alert").textContent).toContain("Contact your HR administrator");
    expect(screen.getByText("Sign out")).toBeTruthy();
  });
});
