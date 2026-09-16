import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AssignPathDialog } from "../AssignPathDialog";

const { assign, listAvailable, assignCustomPath } = vi.hoisted(() => ({
  assign: vi.fn(),
  listAvailable: vi.fn(),
  assignCustomPath: vi.fn(),
}));
vi.mock("@/lib/api", () => ({
  apiAssignPath: assign,
  apiListAvailableCustomPaths: listAvailable,
  apiAssignCustomPathToUser: assignCustomPath,
}));

function setup(props?: Partial<React.ComponentProps<typeof AssignPathDialog>>) {
  const onAssigned = vi.fn();
  const onCustomPathAssigned = vi.fn();
  const onClose = vi.fn();
  render(
    <AssignPathDialog
      open
      onClose={onClose}
      userId="u1"
      userName="María"
      alreadyAssignedCodes={["P1"]}
      alreadyAssignedCustomPathIds={[]}
      onAssigned={onAssigned}
      onCustomPathAssigned={onCustomPathAssigned}
      {...props}
    />,
  );
  return { onAssigned, onCustomPathAssigned, onClose };
}

beforeEach(() => {
  assign.mockReset();
  listAvailable.mockReset();
  assignCustomPath.mockReset();
  listAvailable.mockResolvedValue([]);
});

describe("AssignPathDialog", () => {
  it("renders a card for each of the 6 pillars", () => {
    setup();
    for (const code of ["P1", "P2", "P3", "P4", "P5", "P6"]) {
      expect(screen.getByText(code)).toBeTruthy();
    }
  });

  it("disables already-assigned pillars", () => {
    setup({ alreadyAssignedCodes: ["P1"] });
    const p1Btn = screen.getByText("P1").closest("button");
    const p2Btn = screen.getByText("P2").closest("button");
    expect(p1Btn?.disabled).toBe(true);
    expect(p2Btn?.disabled).toBe(false);
  });

  it("assigns an available pillar on click", async () => {
    assign.mockResolvedValue({ id: "e1", career_path_code: "P2" });
    const { onAssigned } = setup({ alreadyAssignedCodes: ["P1"] });
    fireEvent.click(screen.getByText("P2").closest("button")!);
    await waitFor(() => expect(assign).toHaveBeenCalledWith("u1", "P2"));
    await waitFor(() => expect(onAssigned).toHaveBeenCalled());
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
