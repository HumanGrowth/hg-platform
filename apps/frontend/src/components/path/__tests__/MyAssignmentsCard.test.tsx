import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ModuleAssignment } from "@/lib/types";

import { MyAssignmentsCard } from "../MyAssignmentsCard";

const { mine } = vi.hoisted(() => ({ mine: vi.fn() }));
vi.mock("@/lib/api", () => ({ apiMyAssignments: mine }));

const assignment = (o: Partial<ModuleAssignment> = {}): ModuleAssignment => ({
  id: "a1",
  user_id: "u1",
  learning_unit_id: "lu1",
  unit_slug: "decisiones-bajo-presion",
  unit_title: "Decisiones bajo presión",
  pillar_code: "P1",
  status: "assigned",
  note: null,
  due_date: null,
  assigned_at: "2026-09-20T10:00:00Z",
  assigned_by_user_id: "m1",
  assigned_by_name: "Ana Gómez",
  ...o,
});

describe("MyAssignmentsCard", () => {
  beforeEach(() => mine.mockReset());
  afterEach(() => cleanup());

  it("lista los módulos asignados con quién, cuándo y a qué módulo llevan", async () => {
    mine.mockResolvedValue([assignment({ note: "Prioridad del trimestre", due_date: "2026-10-30T00:00:00Z" })]);
    render(<MyAssignmentsCard />);
    const link = await screen.findByRole("link", { name: /Decisiones bajo presión/ });
    expect(link.getAttribute("href")).toBe("/modulos/decisiones-bajo-presion");
    expect(screen.getByText(/Asignado por Ana Gómez/)).toBeTruthy();
    expect(screen.getByText("Pendiente")).toBeTruthy();
    expect(screen.getByText(/Para el/)).toBeTruthy();
    expect(screen.getByText(/Prioridad del trimestre/)).toBeTruthy();
    expect(screen.getByText(/No cambian el orden de Tu ruta/)).toBeTruthy();
  });

  it("no muestra fecha límite en un módulo ya completado", async () => {
    mine.mockResolvedValue([assignment({ status: "completed", due_date: "2026-10-30T00:00:00Z" })]);
    render(<MyAssignmentsCard />);
    await screen.findByText("Completado");
    expect(screen.queryByText(/Para el/)).toBeNull();
  });

  it("sin asignaciones no renderiza nada", async () => {
    mine.mockResolvedValue([]);
    const { container } = render(<MyAssignmentsCard />);
    await waitFor(() => expect(mine).toHaveBeenCalled());
    expect(container.innerHTML).toBe("");
  });
});
