import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { NotificationPreferences } from "@/lib/types";

const getPrefs = vi.fn();
const setPrefs = vi.fn();
const toastMock = vi.fn();
vi.mock("@/lib/api", () => ({
  apiGetNotificationPreferences: () => getPrefs(),
  apiSetNotificationPreferences: (p: unknown) => setPrefs(p),
}));
vi.mock("@/lib/toast-store", () => ({ toast: (...a: unknown[]) => toastMock(...a) }));

import { NotificationPreferencesSection } from "../NotificationPreferencesSection";

const base: NotificationPreferences = {
  learning_reminders: true,
  leader_digest: true,
  leader_digest_applicable: false,
  updated_at: "2026-11-01T12:00:00Z",
};

beforeEach(() => {
  getPrefs.mockReset();
  setPrefs.mockReset();
  toastMock.mockReset();
});

describe("NotificationPreferencesSection", () => {
  it("renderiza el interruptor de recordatorios y oculta el del líder si no aplica", async () => {
    getPrefs.mockResolvedValue(base);
    render(<NotificationPreferencesSection />);
    expect(await screen.findByRole("switch", { name: /recordatorios de aprendizaje/i })).toBeTruthy();
    expect(screen.queryByRole("switch", { name: /resumen semanal/i })).toBeNull();
    expect(screen.getByText(/Última actualización/)).toBeTruthy();
  });

  it("muestra el interruptor del líder cuando leader_digest_applicable", async () => {
    getPrefs.mockResolvedValue({ ...base, leader_digest_applicable: true });
    render(<NotificationPreferencesSection />);
    expect(await screen.findByRole("switch", { name: /resumen semanal de mi equipo/i })).toBeTruthy();
  });

  it("estado null: activo, con nota, y guardar habilitado sin tocar nada", async () => {
    getPrefs.mockResolvedValue({ ...base, learning_reminders: null, leader_digest: null, updated_at: null });
    render(<NotificationPreferencesSection />);
    const sw = await screen.findByRole("switch", { name: /recordatorios/i });
    expect(sw.getAttribute("aria-checked")).toBe("true");
    expect(screen.getByText(/Todavía no elegiste/)).toBeTruthy();
    expect((screen.getByRole("button", { name: /guardar preferencias/i }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("guardar está deshabilitado sin cambios y se habilita al alternar", async () => {
    getPrefs.mockResolvedValue(base);
    render(<NotificationPreferencesSection />);
    const save = (await screen.findByRole("button", { name: /guardar preferencias/i })) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    fireEvent.click(screen.getByRole("switch", { name: /recordatorios/i }));
    expect(save.disabled).toBe(false);
  });

  it("guarda con un solo PUT y confirma con toast", async () => {
    getPrefs.mockResolvedValue({ ...base, leader_digest_applicable: true });
    setPrefs.mockResolvedValue({ ...base, leader_digest_applicable: true, learning_reminders: false });
    render(<NotificationPreferencesSection />);
    fireEvent.click(await screen.findByRole("switch", { name: /recordatorios/i }));
    fireEvent.click(screen.getByRole("button", { name: /guardar preferencias/i }));
    await waitFor(() => expect(setPrefs).toHaveBeenCalledTimes(1));
    expect(setPrefs).toHaveBeenCalledWith({ learning_reminders: false, leader_digest: true });
    await waitFor(() => expect(toastMock).toHaveBeenCalledWith(expect.any(String), "success"));
  });

  it("error de guardado: toast de error y sigue habilitado", async () => {
    getPrefs.mockResolvedValue(base);
    setPrefs.mockRejectedValue(new Error("boom"));
    render(<NotificationPreferencesSection />);
    fireEvent.click(await screen.findByRole("switch", { name: /recordatorios/i }));
    fireEvent.click(screen.getByRole("button", { name: /guardar preferencias/i }));
    await waitFor(() => expect(toastMock).toHaveBeenCalledWith(expect.any(String), "danger"));
    expect((screen.getByRole("button", { name: /guardar preferencias/i }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("error de carga: ofrece Reintentar", async () => {
    getPrefs.mockRejectedValueOnce(new Error("x")).mockResolvedValueOnce(base);
    render(<NotificationPreferencesSection />);
    fireEvent.click(await screen.findByRole("button", { name: /reintentar/i }));
    expect(await screen.findByRole("switch", { name: /recordatorios/i })).toBeTruthy();
  });
});
