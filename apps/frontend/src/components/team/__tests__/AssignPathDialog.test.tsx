import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AssignableUnit } from "@/lib/types";

import { AssignPathDialog } from "../AssignPathDialog";

const { listUnits, assignModules, listAvailable, assignCustomPath } = vi.hoisted(() => ({
  listUnits: vi.fn(),
  assignModules: vi.fn(),
  listAvailable: vi.fn(),
  assignCustomPath: vi.fn(),
}));
vi.mock("@/lib/api", () => ({
  apiListAssignableUnits: listUnits,
  apiAssignModules: assignModules,
  apiListAvailableCustomPaths: listAvailable,
  apiAssignCustomPathToUser: assignCustomPath,
}));

function unit(overrides: Partial<AssignableUnit>): AssignableUnit {
  return {
    id: "a",
    slug: "a",
    title: "Unit A",
    dimension_code: "CP",
    level_code: "L1",
    pillar_code: "P1",
    keywords: null,
    ...overrides,
  };
}

function setup(props?: Partial<React.ComponentProps<typeof AssignPathDialog>>) {
  const onModulesAssigned = vi.fn();
  const onCustomPathAssigned = vi.fn();
  const onClose = vi.fn();
  render(
    <AssignPathDialog
      open
      onClose={onClose}
      userId="u1"
      userName="María"
      alreadyAssignedUnitIds={new Set()}
      alreadyAssignedCustomPathIds={[]}
      onModulesAssigned={onModulesAssigned}
      onCustomPathAssigned={onCustomPathAssigned}
      {...props}
    />,
  );
  return { onModulesAssigned, onCustomPathAssigned, onClose };
}

beforeEach(() => {
  listUnits.mockReset();
  assignModules.mockReset();
  listAvailable.mockReset();
  assignCustomPath.mockReset();
  listAvailable.mockResolvedValue([]);
  listUnits.mockResolvedValue([unit({ id: "a" }), unit({ id: "b" })]);
});

describe("AssignPathDialog", () => {
  it("opens on the Módulos tab, grouped by pillar", async () => {
    setup();
    await waitFor(() => expect(screen.getByText(/Adaptabilidad/)).toBeTruthy());
    expect(screen.getByRole("tab", { name: "Módulos", selected: true })).toBeTruthy();
  });

  it("assigns a pillar block with a due date", async () => {
    assignModules.mockResolvedValue([]);
    const { onModulesAssigned } = setup();
    await waitFor(() => expect(screen.getByText(/Adaptabilidad/)).toBeTruthy());

    fireEvent.click(screen.getByText(/Adaptabilidad/).closest("button")!);
    fireEvent.change(screen.getByLabelText("Fecha límite"), { target: { value: "2026-12-01" } });
    fireEvent.click(screen.getByRole("button", { name: "Asignar" }));

    await waitFor(() =>
      expect(assignModules).toHaveBeenCalledWith("u1", expect.arrayContaining(["a", "b"]), expect.any(String), null),
    );
    await waitFor(() => expect(onModulesAssigned).toHaveBeenCalled());
  });

  it("switches to the custom paths tab and assigns one", async () => {
    listAvailable.mockResolvedValue([{ id: "cp1", name: "Onboarding Ventas", description: null }]);
    assignCustomPath.mockResolvedValue({ id: "cp1", name: "Onboarding Ventas", description: null });
    const { onCustomPathAssigned } = setup();

    fireEvent.click(screen.getByRole("tab", { name: "Rutas personalizadas" }));
    await waitFor(() => expect(screen.getByText("Onboarding Ventas")).toBeTruthy());

    fireEvent.click(screen.getByText("Onboarding Ventas").closest("button")!);
    await waitFor(() => expect(assignCustomPath).toHaveBeenCalledWith("u1", "cp1"));
    await waitFor(() => expect(onCustomPathAssigned).toHaveBeenCalled());
  });
});
