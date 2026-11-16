import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CompanyStatusDialog } from "@/components/company/CompanyStatusDialog";
import type { Company, CompanyStatus, LifecyclePreview } from "@/lib/types";

const { change, toast } = vi.hoisted(() => ({ change: vi.fn(), toast: vi.fn() }));

vi.mock("@/lib/api", () => ({
  apiChangeCompanyStatus: change,
  apiErrorMessage: (_e: unknown, fallback: string) => fallback,
}));
vi.mock("@/lib/toast-store", () => ({ toast }));

function company(status: CompanyStatus): Company {
  return {
    id: "c1",
    name: "Acme",
    slug: "acme",
    tier: "C",
    billing_status: "trial",
    licenses_total: 50,
    licenses_used: 3,
    org_count: 1,
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
    status,
    status_changed_at: "2026-01-01T00:00:00Z",
    grace_ends_at: null,
    grace_days: 30,
  };
}

const PREVIEW: LifecyclePreview = {
  company_id: "c1",
  from_status: "active",
  to_status: "grace",
  active_users_by_role: { collaborator: 2, company_admin: 1 },
  active_users_total: 3,
  pending_invitations: 4,
  admins: 1,
  grace_ends_at: "2026-12-16T12:00:00Z",
};

function setup(status: CompanyStatus = "active") {
  const onClose = vi.fn();
  const onChanged = vi.fn();
  const co = company(status);
  render(<CompanyStatusDialog company={co} open onClose={onClose} onChanged={onChanged} />);
  return { onClose, onChanged, co };
}

function pick(value: string) {
  fireEvent.change(screen.getByLabelText("Nuevo estado"), { target: { value } });
}

beforeEach(() => {
  change.mockImplementation(async (_id: string, body: { to_status: CompanyStatus; dry_run?: boolean }) => ({
    applied: !body.dry_run,
    preview: { ...PREVIEW, to_status: body.to_status },
    company: company(body.to_status),
  }));
});
afterEach(() => {
  change.mockReset();
  toast.mockReset();
});

describe("CompanyStatusDialog", () => {
  it("offers only the transitions allowed from the current state", () => {
    setup("active");
    const opts = screen.getAllByRole("option").map((o) => o.textContent);
    expect(opts).toEqual(["Elegí un estado", "Gracia", "Suspendida"]);
    expect((screen.getByText("Ver vista previa").closest("button") as HTMLButtonElement).disabled).toBe(true);
  });

  it("terminated can only be rescued to suspended", () => {
    setup("terminated");
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual(["Elegí un estado", "Suspendida"]);
  });

  it("previews with a dry-run (no reason needed) and shows the numbers before anything is applied", async () => {
    setup("active");
    pick("grace");
    fireEvent.click(screen.getByText("Ver vista previa"));

    const box = await screen.findByTestId("lifecycle-preview");
    expect(change).toHaveBeenCalledTimes(1);
    expect(change).toHaveBeenCalledWith("c1", { to_status: "grace", dry_run: true });
    expect(box.textContent).toContain("Usuarios activos");
    expect(box.textContent).toContain("3");
    expect(box.textContent).toContain("4"); // invitaciones pendientes
    expect(box.textContent).toContain("Colaboradores");
    expect(box.textContent).toContain("RRHH");
    expect(box.textContent).toContain("La gracia termina el");
  });

  it("applies a grace change without slug confirmation (reason optional)", async () => {
    const { onChanged, onClose } = setup("active");
    pick("grace");
    fireEvent.click(screen.getByText("Ver vista previa"));
    await screen.findByTestId("lifecycle-preview");
    expect(screen.queryByLabelText(/Para confirmar/)).toBeNull();

    fireEvent.click(screen.getByText("Aplicar cambio"));
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
    expect(change).toHaveBeenLastCalledWith("c1", { to_status: "grace", reason: null, confirm_slug: null });
    expect(onClose).toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith("Estado actualizado.", "success");
  });

  it("suspending requires a reason AND typing the slug before it can be applied", async () => {
    const { onChanged } = setup("active");
    pick("suspended");
    fireEvent.click(screen.getByText("Ver vista previa"));
    await screen.findByTestId("lifecycle-preview");

    const apply = () => screen.getByText("Aplicar cambio").closest("button") as HTMLButtonElement;
    expect(apply().disabled).toBe(true);

    fireEvent.change(screen.getByLabelText("Motivo"), { target: { value: "Impago" } });
    expect(apply().disabled).toBe(true); // falta el slug

    fireEvent.change(screen.getByLabelText(/Para confirmar, escribí acme/), { target: { value: "otra" } });
    expect(apply().disabled).toBe(true); // slug incorrecto

    fireEvent.change(screen.getByLabelText(/Para confirmar/), { target: { value: "acme" } });
    expect(apply().disabled).toBe(false);

    fireEvent.click(apply());
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
    expect(change).toHaveBeenLastCalledWith("c1", {
      to_status: "suspended",
      reason: "Impago",
      confirm_slug: "acme",
    });
  });

  it("a whitespace-only reason does not unlock suspending", async () => {
    setup("grace");
    pick("suspended");
    fireEvent.click(screen.getByText("Ver vista previa"));
    await screen.findByTestId("lifecycle-preview");
    fireEvent.change(screen.getByLabelText("Motivo"), { target: { value: "   " } });
    fireEvent.change(screen.getByLabelText(/Para confirmar/), { target: { value: "acme" } });
    expect((screen.getByText("Aplicar cambio").closest("button") as HTMLButtonElement).disabled).toBe(true);
  });

  it("shows the error and keeps the dialog open when the API rejects", async () => {
    const { onChanged, onClose } = setup("active");
    pick("grace");
    fireEvent.click(screen.getByText("Ver vista previa"));
    await screen.findByTestId("lifecycle-preview");

    change.mockRejectedValueOnce(new Error("409"));
    fireEvent.click(screen.getByText("Aplicar cambio"));
    expect((await screen.findByRole("alert")).textContent).toBe("No se pudo cambiar el estado.");
    expect(onChanged).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("'Volver' returns to the state picker without applying anything", async () => {
    setup("active");
    pick("grace");
    fireEvent.click(screen.getByText("Ver vista previa"));
    await screen.findByTestId("lifecycle-preview");
    fireEvent.click(screen.getByText("Volver"));
    expect(screen.queryByTestId("lifecycle-preview")).toBeNull();
    expect(change).toHaveBeenCalledTimes(1); // solo el dry-run
  });
});
