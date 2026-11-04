import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  get: vi.fn(),
  put: vi.fn(),
  reset: vi.fn(),
}));
vi.mock("@/lib/api", () => ({
  apiGetDashboardPrefs: api.get,
  apiPutDashboardPrefs: api.put,
  apiResetDashboardPrefs: api.reset,
}));
vi.mock("@/lib/toast-store", () => ({ toast: vi.fn() }));

import { DashboardGrid, type DashboardWidgetDef } from "../DashboardGrid";

const widgets: DashboardWidgetDef<{ extra: boolean }>[] = [
  { id: "a", title: "Alfa", span: "half", render: () => <div>contenido-alfa</div> },
  { id: "b", title: "Beta", span: "half", render: () => <div>contenido-beta</div> },
  {
    id: "c",
    title: "Gamma",
    span: "full",
    available: (c) => c.extra,
    render: () => <div>contenido-gamma</div>,
  },
];

function texts(): string[] {
  return screen.getAllByText(/^contenido-/).map((n) => n.textContent ?? "");
}

describe("DashboardGrid", () => {
  beforeEach(() => {
    api.get.mockReset().mockResolvedValue({ order: [], hidden: [] });
    api.put.mockReset().mockResolvedValue({});
    api.reset.mockReset().mockResolvedValue(undefined);
  });

  it("renders the default order and skips widgets that are not available", async () => {
    render(<DashboardGrid dashboard="org" widgets={widgets} ctx={{ extra: false }} />);
    await waitFor(() => expect(texts()).toEqual(["contenido-alfa", "contenido-beta"]));
  });

  it("applies the saved order and hidden widgets", async () => {
    api.get.mockResolvedValue({ order: ["b", "a"], hidden: ["a"] });
    render(<DashboardGrid dashboard="org" widgets={widgets} ctx={{ extra: false }} />);
    await waitFor(() => expect(texts()).toEqual(["contenido-beta"]));
  });

  it("hides a widget with the switch and persists it", async () => {
    render(<DashboardGrid dashboard="org" widgets={widgets} ctx={{ extra: false }} />);
    fireEvent.click(await screen.findByRole("button", { name: "Personalizar" }));
    fireEvent.click(screen.getByRole("switch", { name: "Mostrar Alfa" }));
    await waitFor(() =>
      expect(api.put).toHaveBeenCalledWith("org", { order: ["a", "b"], hidden: ["a"] }),
    );
    // En edición el oculto sigue listado (para poder reactivarlo)...
    expect(screen.getByText(/Oculto: actívalo/)).toBeTruthy();
    // ...y al terminar la edición desaparece.
    fireEvent.click(screen.getByRole("button", { name: "Listo" }));
    expect(texts()).toEqual(["contenido-beta"]);
  });

  it("reorders with the arrows and persists the new order", async () => {
    render(<DashboardGrid dashboard="org" widgets={widgets} ctx={{ extra: false }} />);
    fireEvent.click(await screen.findByRole("button", { name: "Personalizar" }));
    fireEvent.click(screen.getByRole("button", { name: "Bajar Alfa" }));
    await waitFor(() =>
      expect(api.put).toHaveBeenCalledWith("org", { order: ["b", "a"], hidden: [] }),
    );
  });

  it("reverts the change when saving fails", async () => {
    api.put.mockRejectedValue(new Error("boom"));
    render(<DashboardGrid dashboard="org" widgets={widgets} ctx={{ extra: false }} />);
    fireEvent.click(await screen.findByRole("button", { name: "Personalizar" }));
    fireEvent.click(screen.getByRole("switch", { name: "Mostrar Alfa" }));
    await waitFor(() => expect(api.put).toHaveBeenCalled());
    await waitFor(() =>
      expect(screen.getByRole("switch", { name: "Mostrar Alfa" }).getAttribute("aria-checked")).toBe(
        "true",
      ),
    );
  });

  it("resets to the default layout", async () => {
    api.get.mockResolvedValue({ order: ["b", "a"], hidden: ["a"] });
    render(<DashboardGrid dashboard="org" widgets={widgets} ctx={{ extra: false }} />);
    fireEvent.click(await screen.findByRole("button", { name: "Personalizar" }));
    fireEvent.click(screen.getByRole("button", { name: "Restablecer" }));
    await waitFor(() => expect(api.reset).toHaveBeenCalledWith("org"));
    fireEvent.click(screen.getByRole("button", { name: "Listo" }));
    expect(texts()).toEqual(["contenido-alfa", "contenido-beta"]);
  });

  it("falls back to the default layout when loading prefs fails", async () => {
    api.get.mockRejectedValue(new Error("down"));
    render(<DashboardGrid dashboard="org" widgets={widgets} ctx={{ extra: true }} />);
    await waitFor(() =>
      expect(texts()).toEqual(["contenido-alfa", "contenido-beta", "contenido-gamma"]),
    );
  });
});
