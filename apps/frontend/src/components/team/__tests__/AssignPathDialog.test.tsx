import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AssignPathDialog } from "../AssignPathDialog";

const { assign } = vi.hoisted(() => ({ assign: vi.fn() }));
vi.mock("@/lib/api", () => ({ apiAssignPath: assign }));

function setup(props?: Partial<React.ComponentProps<typeof AssignPathDialog>>) {
  const onAssigned = vi.fn();
  const onClose = vi.fn();
  render(
    <AssignPathDialog
      open
      onClose={onClose}
      userId="u1"
      userName="María"
      alreadyAssignedCodes={["P1"]}
      onAssigned={onAssigned}
      {...props}
    />,
  );
  return { onAssigned, onClose };
}

beforeEach(() => assign.mockReset());

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
});
