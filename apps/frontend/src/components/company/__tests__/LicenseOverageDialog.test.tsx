import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { LicenseOverageDialog } from "@/components/company/LicenseOverageDialog";

const USAGE = { active: 1, invited: 3, to_invite: 3, pool: 5, overage: 2 };

describe("LicenseOverageDialog", () => {
  it("shows every number of the projection", () => {
    render(<LicenseOverageDialog usage={USAGE} open onAdjust={vi.fn()} onSendAnyway={vi.fn()} />);
    const t = screen.getByTestId("overage-numbers").textContent ?? "";
    for (const label of ["Licencias en uso", "Invitaciones vigentes", "Por invitar ahora", "Licencias de la empresa", "Sobrecupo"]) {
      expect(t).toContain(label);
    }
    expect(screen.getByText("Se superan las licencias")).toBeTruthy();
  });

  it("offers exactly two exits and wires them", () => {
    const onAdjust = vi.fn();
    const onSendAnyway = vi.fn();
    render(<LicenseOverageDialog usage={USAGE} open onAdjust={onAdjust} onSendAnyway={onSendAnyway} />);
    fireEvent.click(screen.getByText("Ajustar licencias"));
    expect(onAdjust).toHaveBeenCalledTimes(1);
    expect(onSendAnyway).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("Enviar de todos modos"));
    expect(onSendAnyway).toHaveBeenCalledTimes(1);
  });

  it("disables both buttons while sending", () => {
    render(<LicenseOverageDialog usage={USAGE} open busy onAdjust={vi.fn()} onSendAnyway={vi.fn()} />);
    expect((screen.getByText("Ajustar licencias").closest("button") as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByText("Enviando…").closest("button") as HTMLButtonElement).disabled).toBe(true);
  });

  it("closing the dialog (Esc) counts as 'adjust', never as sending", () => {
    const onAdjust = vi.fn();
    const onSendAnyway = vi.fn();
    render(<LicenseOverageDialog usage={USAGE} open onAdjust={onAdjust} onSendAnyway={onSendAnyway} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onAdjust).toHaveBeenCalled();
    expect(onSendAnyway).not.toHaveBeenCalled();
  });

  it("has English parity", () => {
    render(<LicenseOverageDialog usage={USAGE} open lang="en" onAdjust={vi.fn()} onSendAnyway={vi.fn()} />);
    expect(screen.getByText("Send anyway")).toBeTruthy();
    expect(screen.getByText("Adjust licenses")).toBeTruthy();
  });
});
