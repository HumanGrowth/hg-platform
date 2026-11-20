import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const change = vi.fn();
const forgot = vi.fn();
const logout = vi.fn();
const replace = vi.fn();
const clear = vi.fn();
const toastMock = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
vi.mock("@/lib/api", () => ({
  ApiError: class ApiError extends Error {},
  apiChangePassword: (...a: unknown[]) => change(...a),
  apiForgotPassword: (...a: unknown[]) => forgot(...a),
  apiLogout: () => logout(),
}));
vi.mock("@/lib/toast-store", () => ({ toast: (...a: unknown[]) => toastMock(...a) }));
vi.mock("@/lib/auth-store", () => ({
  useAuthStore: (sel: (s: unknown) => unknown) => sel({ user: { email: "ana@hg.test" }, clear }),
}));

import { PasswordSection } from "../PasswordSection";

function open() {
  render(<PasswordSection />);
  fireEvent.click(screen.getByRole("button", { name: "Cambiar contraseña" }));
}
function fill(cur: string, next: string, confirm: string) {
  fireEvent.change(screen.getByLabelText("Contraseña actual"), { target: { value: cur } });
  fireEvent.change(screen.getByLabelText("Nueva contraseña"), { target: { value: next } });
  fireEvent.change(screen.getByLabelText("Repetir la nueva contraseña"), { target: { value: confirm } });
}
const submit = () =>
  fireEvent.click(screen.getAllByRole("button", { name: /^Cambiar contraseña$/ }).slice(-1)[0]!);

beforeEach(() => {
  [change, forgot, logout, replace, clear, toastMock].forEach((m) => m.mockReset());
  logout.mockResolvedValue(null);
});

describe("PasswordSection", () => {
  it("valida mínimo y coincidencia sin llamar a la API", async () => {
    open();
    fill("", "123", "456");
    submit();
    expect(await screen.findByText("Ingresá tu contraseña actual")).toBeTruthy();
    expect(screen.getByText("Mínimo 6 caracteres", { selector: "p[role=alert]" })).toBeTruthy();
    expect(screen.getByText("Las contraseñas no coinciden")).toBeTruthy();
    expect(change).not.toHaveBeenCalled();
  });

  it("éxito: cambia, cierra sesión local y redirige a /login", async () => {
    change.mockResolvedValue(undefined);
    open();
    fill("vieja123", "nueva123", "nueva123");
    submit();
    await waitFor(() => expect(change).toHaveBeenCalledWith("vieja123", "nueva123"));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login"));
    expect(clear).toHaveBeenCalled();
    expect(toastMock).toHaveBeenCalledWith(expect.any(String), "success");
  });

  it("error 400: muestra mensaje genérico y conserva el formulario", async () => {
    change.mockRejectedValue({ response: { status: 400 } });
    open();
    fill("mala", "nueva123", "nueva123");
    submit();
    expect(await screen.findByText(/no es correcta/i)).toBeTruthy();
    expect(replace).not.toHaveBeenCalled();
  });

  it("mostrar/ocultar contraseña alterna el tipo del input", () => {
    open();
    const input = screen.getByLabelText("Contraseña actual") as HTMLInputElement;
    expect(input.type).toBe("password");
    fireEvent.click(screen.getByRole("button", { name: /mostrar contraseña actual/i }));
    expect(input.type).toBe("text");
  });

  it("alternativa por link: mensaje neutro", async () => {
    forgot.mockResolvedValue({ status: "ok" });
    render(<PasswordSection />);
    fireEvent.click(screen.getByRole("button", { name: /te enviamos un link/i }));
    await waitFor(() => expect(forgot).toHaveBeenCalledWith("ana@hg.test"));
    expect(await screen.findByText("Si el email existe, te enviamos un link.")).toBeTruthy();
  });
});
