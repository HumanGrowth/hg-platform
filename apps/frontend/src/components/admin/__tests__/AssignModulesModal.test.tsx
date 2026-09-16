import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AssignableUnit } from "@/lib/types";

import { AssignModulesModal } from "../AssignModulesModal";

const { listUnits, assignModules } = vi.hoisted(() => ({
  listUnits: vi.fn(),
  assignModules: vi.fn(),
}));
vi.mock("@/lib/api", () => ({
  apiListAssignableUnits: listUnits,
  apiAssignModules: assignModules,
}));

function unit(overrides: Partial<AssignableUnit>): AssignableUnit {
  return {
    id: "u1",
    slug: "u1",
    title: "Unit 1",
    dimension_code: "CP",
    level_code: "L1",
    pillar_code: "P1",
    keywords: null,
    ...overrides,
  };
}

const catalog: AssignableUnit[] = [
  unit({ id: "a", pillar_code: "P1", keywords: ["feedback"] }),
  unit({ id: "b", pillar_code: "P1", keywords: ["feedback"] }),
  unit({ id: "c", pillar_code: "P2", level_code: "L2", keywords: ["liderazgo"] }),
  unit({ id: "d", dimension_code: "PR", pillar_code: "X" }), // no-CP, debe quedar afuera
];

function setup(props?: { alreadyAssignedIds?: Set<string> }) {
  const onAssigned = vi.fn();
  render(
    <AssignModulesModal
      open
      onClose={vi.fn()}
      userId="u1"
      userName="María"
      alreadyAssignedIds={props?.alreadyAssignedIds ?? new Set()}
      onAssigned={onAssigned}
    />,
  );
  return { onAssigned };
}

beforeEach(() => {
  listUnits.mockReset();
  assignModules.mockReset();
  listUnits.mockResolvedValue(catalog);
});

describe("AssignModulesModal", () => {
  it("groups the CP catalog by pillar by default, excluding other dimensions", async () => {
    setup();
    await waitFor(() => expect(screen.getByText(/Adaptabilidad/)).toBeTruthy());
    expect(screen.getByText("2 módulo(s)")).toBeTruthy(); // P1: a + b
    expect(screen.queryByText("Unit 1")).toBeNull(); // nunca un módulo individual
  });

  it("switches to skill grouping via the toggle", async () => {
    setup();
    await waitFor(() => expect(screen.getByText(/Adaptabilidad/)).toBeTruthy());
    fireEvent.click(screen.getByRole("tab", { name: "Skill" }));
    await waitFor(() => expect(screen.getByText("feedback")).toBeTruthy());
    expect(screen.getByText("liderazgo")).toBeTruthy();
  });

  it("assigns all units of a selected pillar with a required due date", async () => {
    assignModules.mockResolvedValue([]);
    const { onAssigned } = setup();
    await waitFor(() => expect(screen.getByText(/Adaptabilidad/)).toBeTruthy());

    fireEvent.click(screen.getByText(/Adaptabilidad/).closest("button")!);
    const dueInput = screen.getByLabelText("Fecha límite");
    fireEvent.change(dueInput, { target: { value: "2026-12-01" } });
    fireEvent.click(screen.getByRole("button", { name: "Asignar" }));

    await waitFor(() =>
      expect(assignModules).toHaveBeenCalledWith(
        "u1",
        expect.arrayContaining(["a", "b"]),
        expect.any(String),
        null,
      ),
    );
    await waitFor(() => expect(onAssigned).toHaveBeenCalled());
  });

  it("disables the submit button without a due date", async () => {
    setup();
    await waitFor(() => expect(screen.getByText(/Adaptabilidad/)).toBeTruthy());
    fireEvent.click(screen.getByText(/Adaptabilidad/).closest("button")!);
    const submit = screen.getByRole("button", { name: "Asignar" }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
  });

  it("marks a block as already assigned when all its units are assigned", async () => {
    setup({ alreadyAssignedIds: new Set(["a", "b"]) });
    await waitFor(() => expect(screen.getByText(/ya asignado/)).toBeTruthy());
    const block = screen.getByText(/ya asignado/).closest("button");
    expect(block?.disabled).toBe(true);
  });
});
