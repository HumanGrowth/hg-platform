import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type {
  AccountProgress,
  AssessmentOverview,
  AssignmentCompliance,
  ManagerEngagement,
} from "@/lib/types";

import { computeDelta, DeltaPill } from "../DeltaPill";
import {
  AssessmentOverviewWidget,
  AssignmentComplianceWidget,
  AccountProgressTable,
  ManagerEngagementWidget,
} from "../OrgInsightWidgets";

describe("DeltaPill", () => {
  it("computes pp for rates and units for counts", () => {
    expect(computeDelta(0.45, 0.3, "pp")).toBe(15);
    expect(computeDelta(8, 5, "count")).toBe(3);
  });

  it("renders nothing without a previous period", () => {
    const { container } = render(
      <DeltaPill current={0.5} previous={null} kind="pp" goodWhen="up" />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("marks more inactive people as a worsening (danger) and shows an arrow", () => {
    const { container } = render(
      <DeltaPill current={8} previous={5} kind="count" goodWhen="down" />,
    );
    expect(container.textContent).toContain("▲ +3");
    expect(container.querySelector(".text-danger")).not.toBeNull();
  });

  it("marks higher adoption as an improvement", () => {
    const { container } = render(
      <DeltaPill current={0.6} previous={0.5} kind="pp" goodWhen="up" />,
    );
    expect(container.querySelector(".text-primary")).not.toBeNull();
    expect(container.textContent).toContain("+10 pp");
  });
});

describe("AccountProgressTable", () => {
  const acc = (over: Partial<AccountProgress>): AccountProgress => ({
    user_id: "u",
    full_name: "Persona",
    email: "p@x.test",
    org_id: "o1",
    org_name: "Org A",
    manager_id: "m1",
    manager_name: "Luis",
    last_login_at: null,
    is_inactive: false,
    modules_completed: 0,
    modules_assigned: 0,
    modules_assigned_completed: 0,
    ...over,
  });
  const accounts = [
    acc({ user_id: "1", full_name: "Ana Pérez", email: "ana@x.test", modules_completed: 4, modules_assigned: 3, modules_assigned_completed: 2 }),
    acc({ user_id: "2", full_name: "José Soto", email: "jose@x.test", org_id: "o2", org_name: "Org B", manager_id: "m2", manager_name: "Rita", is_inactive: true }),
    acc({ user_id: "3", full_name: "Sin Jefe", email: "sj@x.test", org_id: "o2", org_name: "Org B", manager_id: null, manager_name: null }),
  ];

  it("shows the renamed columns and every account", () => {
    render(<AccountProgressTable accounts={accounts} />);
    for (const h of ["Último login", "Asignados completados", "Completados en total"]) {
      expect(screen.getByText(h)).toBeTruthy();
    }
    expect(screen.getByText("Ana Pérez")).toBeTruthy();
    expect(screen.getAllByText("Nunca").length).toBe(3);
    expect(screen.getByText("Inactivo")).toBeTruthy();
  });

  it("shows assigned progress and the total, flagging completions outside the assignment", () => {
    render(<AccountProgressTable accounts={accounts} />);
    // 2 de 3 asignados, 4 en total => 2 completados que no son de lo asignado.
    expect(screen.getByText("(+2 no asignados)")).toBeTruthy();
    expect(screen.getAllByText("/ 3").length).toBe(1);
  });

  it("searches by name ignoring accents, and by email", () => {
    render(<AccountProgressTable accounts={accounts} />);
    const box = screen.getByLabelText("Buscar usuario");
    fireEvent.change(box, { target: { value: "jose" } });
    expect(screen.getByText("José Soto")).toBeTruthy();
    expect(screen.queryByText("Ana Pérez")).toBeNull();
    fireEvent.change(box, { target: { value: "ana@" } });
    expect(screen.getByText("Ana Pérez")).toBeTruthy();
  });

  it("filters by organization and limits managers to that organization", () => {
    render(<AccountProgressTable accounts={accounts} />);
    fireEvent.change(screen.getByLabelText("Filtrar por organización"), { target: { value: "o2" } });
    expect(screen.queryByText("Ana Pérez")).toBeNull();
    expect(screen.getByText("José Soto")).toBeTruthy();
    const managerOptions = within(screen.getByLabelText("Filtrar por manager"))
      .getAllByRole("option")
      .map((o) => o.textContent);
    expect(managerOptions).toEqual(["Todos los managers", "Rita", "Sin manager"]);
    fireEvent.change(screen.getByLabelText("Filtrar por manager"), { target: { value: "none" } });
    expect(screen.getByText("Sin Jefe")).toBeTruthy();
    expect(screen.queryByText("José Soto")).toBeNull();
  });

  it("shows an empty message when nothing matches and lets you clear filters", () => {
    render(<AccountProgressTable accounts={accounts} />);
    fireEvent.change(screen.getByLabelText("Buscar usuario"), { target: { value: "zzz" } });
    expect(screen.getByText(/Ninguna cuenta coincide/)).toBeTruthy();
    fireEvent.click(screen.getByText("Limpiar filtros"));
    expect(screen.getByText("Ana Pérez")).toBeTruthy();
  });
});

describe("AssignmentComplianceWidget", () => {
  const base: AssignmentCompliance = {
    total: 10, completed: 4, overdue: 2, due_soon: 1, open: 3, users_with_overdue: 2,
    by_org: [],
  };

  it("shows an empty state with no assignments", () => {
    render(
      <AssignmentComplianceWidget
        data={{ ...base, total: 0, completed: 0, overdue: 0, due_soon: 0, open: 0, users_with_overdue: 0 }}
      />,
    );
    expect(screen.getByText(/Todavía no hay módulos asignados/)).toBeTruthy();
  });

  it("lists every status with its count and no chips for a single org", () => {
    render(<AssignmentComplianceWidget data={base} />);
    expect(screen.getByText("Vencidas")).toBeTruthy();
    expect(screen.getByText(/2 personas tienen asignaciones vencidas/)).toBeTruthy();
    expect(screen.queryByRole("group", { name: "Filtrar por organización" })).toBeNull();
  });

  it("renders one chip per organization and switches the metrics when selected", () => {
    const data: AssignmentCompliance = {
      ...base,
      by_org: [
        { org_id: "a", org_name: "Finanzas", total: 6, completed: 5, overdue: 0, due_soon: 0, open: 1 },
        { org_id: "b", org_name: "IT", total: 4, completed: 2, overdue: 2, due_soon: 0, open: 0 },
      ],
    };
    render(<AssignmentComplianceWidget data={data} />);
    const group = screen.getByRole("group", { name: "Filtrar por organización" });
    expect(within(group).getAllByRole("button").length).toBe(3); // Todas + 2 orgs
    expect(within(group).getAllByText("2 vencidas").length).toBe(2); // Todas + IT
    fireEvent.click(within(group).getByText("Finanzas"));
    expect(screen.getByText("5 · 83%")).toBeTruthy(); // Cumplidas de Finanzas
  });
});

describe("AssessmentOverviewWidget", () => {
  it("hides distributions for groups below the minimum size", () => {
    const data: AssessmentOverview = {
      total_users: 20,
      with_results: 3,
      min_group: 5,
      dimensions: [{ code: "P1", n: 3, suppressed: true, states: [] }],
    };
    render(<AssessmentOverviewWidget data={data} />);
    expect(screen.getByText(/Grupo menor a 5/)).toBeTruthy();
  });

  it("explains the empty state when nobody has results", () => {
    render(
      <AssessmentOverviewWidget
        data={{ total_users: 4, with_results: 0, min_group: 5, dimensions: [] }}
      />,
    );
    expect(screen.getByText(/Todavía nadie completó el assessment/)).toBeTruthy();
  });
});

describe("ManagerEngagementWidget", () => {
  const data: ManagerEngagement = {
    window_days: 21,
    managers_with_team: 2,
    engaged: 1,
    engagement_rate: 0.5,
    managers: [
      {
        user_id: "m1", full_name: "Mara Idle", org_id: "o", org_name: "Org", team_size: 4,
        team_active: 1, reviewed_members: 0, assignments_made: 0, last_login_at: null,
        status: "no_follow_up",
      },
      {
        user_id: "m2", full_name: "Leo Activo", org_id: "o", org_name: "Org", team_size: 3,
        team_active: 3, reviewed_members: 2, assignments_made: 5, last_login_at: null,
        status: "engaged",
      },
    ],
  };

  it("shows the engagement rate and each manager's status", () => {
    render(<ManagerEngagementWidget data={data} />);
    expect(screen.getByText("50%")).toBeTruthy();
    expect(screen.getByText("Sin seguimiento")).toBeTruthy();
    expect(screen.getByText("Con seguimiento")).toBeTruthy();
    expect(screen.getByText("2/3")).toBeTruthy();
  });

  it("shows an empty message without managers", () => {
    render(
      <ManagerEngagementWidget
        data={{ ...data, managers: [], managers_with_team: 0, engaged: 0, engagement_rate: null }}
      />,
    );
    expect(screen.getByText("No hay managers en este alcance.")).toBeTruthy();
  });
});
