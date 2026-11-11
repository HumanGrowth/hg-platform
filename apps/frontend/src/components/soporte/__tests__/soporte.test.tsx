import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  submitPublic: vi.fn(),
  createTicket: vi.fn(),
  toast: vi.fn(),
}));

vi.mock("@/lib/api", async (orig) => ({
  ...(await orig<typeof import("@/lib/api")>()),
  apiSubmitPublicSupportTicket: mocks.submitPublic,
  apiCreateSupportTicket: mocks.createTicket,
}));
vi.mock("@/lib/toast-store", () => ({ toast: mocks.toast }));

import { MarketingLanguageProvider } from "@/components/marketing/LanguageProvider";
import SupportPublicForm from "@/components/marketing/SupportPublicForm";
import { SupportTicketForm } from "@/components/soporte/SupportTicketForm";
import { TicketThread } from "@/components/soporte/TicketThread";
import { ApiError } from "@/lib/api";

function renderPublic() {
  return render(
    <MarketingLanguageProvider>
      <SupportPublicForm />
    </MarketingLanguageProvider>,
  );
}

function fillPublic() {
  fireEvent.change(screen.getByLabelText("Nombre *"), { target: { value: "Ana" } });
  fireEvent.change(screen.getByLabelText("Email *"), { target: { value: "ana@example.com" } });
  fireEvent.change(screen.getByLabelText("Asunto *"), { target: { value: "No me llegó la invitación" } });
  fireEvent.change(screen.getByLabelText("Detalle *"), {
    target: { value: "Pasaron dos días y no recibí el correo." },
  });
}

beforeEach(() => vi.clearAllMocks());

describe("SupportPublicForm", () => {
  it("envía el ticket y muestra la confirmación", async () => {
    mocks.submitPublic.mockResolvedValue(undefined);
    renderPublic();
    fillPublic();
    fireEvent.click(screen.getByRole("button", { name: "Enviar solicitud" }));

    await screen.findByText("Recibimos tu solicitud");
    const payload = mocks.submitPublic.mock.calls[0][0];
    expect(payload).toMatchObject({
      name: "Ana",
      email: "ana@example.com",
      category: "access",
    });
    expect(payload.website).toBeUndefined();
  });

  it("el honeypot está fuera de la navegación y, si un bot lo llena, viaja en el payload", async () => {
    mocks.submitPublic.mockResolvedValue(undefined);
    const { container } = renderPublic();
    const honeypot = container.querySelector<HTMLInputElement>("#sp-website")!;
    expect(honeypot.tabIndex).toBe(-1);
    expect(honeypot.closest("[aria-hidden='true']")).not.toBeNull();

    fillPublic();
    fireEvent.change(honeypot, { target: { value: "http://spam.example" } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar solicitud" }));
    await waitFor(() => expect(mocks.submitPublic).toHaveBeenCalled());
    expect(mocks.submitPublic.mock.calls[0][0].website).toBe("http://spam.example");
  });

  it("valida campos requeridos sin llamar a la API", async () => {
    renderPublic();
    fireEvent.click(screen.getByRole("button", { name: "Enviar solicitud" }));
    await screen.findByText("Ingresá tu nombre");
    expect(mocks.submitPublic).not.toHaveBeenCalled();
  });

  it("avisa cuando el backend limita la tasa (429)", async () => {
    mocks.submitPublic.mockRejectedValue(new ApiError("too many requests", 429));
    renderPublic();
    fillPublic();
    fireEvent.click(screen.getByRole("button", { name: "Enviar solicitud" }));
    await waitFor(() =>
      expect(mocks.toast).toHaveBeenCalledWith(expect.stringContaining("varias solicitudes"), "danger"),
    );
    expect(screen.queryByText("Recibimos tu solicitud")).toBeNull();
  });
});

describe("SupportTicketForm (usuario autenticado)", () => {
  it("rechaza un asunto corto", async () => {
    render(<SupportTicketForm onCreated={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Asunto"), { target: { value: "ab" } });
    fireEvent.change(screen.getByLabelText("Detalle"), { target: { value: "Detalle suficiente" } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar solicitud" }));
    await screen.findByText("Contanos el tema en pocas palabras");
    expect(mocks.createTicket).not.toHaveBeenCalled();
  });

  it("crea el ticket y avisa al padre", async () => {
    const created = { id: "t1", code: "SP-0001" };
    mocks.createTicket.mockResolvedValue(created);
    const onCreated = vi.fn();
    render(<SupportTicketForm onCreated={onCreated} />);
    fireEvent.change(screen.getByLabelText("Asunto"), { target: { value: "No me carga el video" } });
    fireEvent.change(screen.getByLabelText("Detalle"), { target: { value: "Se queda en negro al dar play" } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar solicitud" }));

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(created));
    expect(mocks.createTicket.mock.calls[0][0]).toMatchObject({
      subject: "No me carga el video",
      category: "question",
    });
  });
});

describe("TicketThread", () => {
  const items = [
    { id: "1", actor_kind: "user", body: "Hola", created_at: "2026-11-11T12:00:00Z" },
    { id: "2", actor_kind: "admin", body: "Parece el CDN", created_at: "2026-11-11T12:05:00Z", is_internal: true },
  ];

  it("rotula las notas internas con texto", () => {
    render(<TicketThread items={items} viewer="admin" />);
    expect(screen.getByText("· Nota interna")).toBeTruthy();
    expect(screen.getByText("Usuario")).toBeTruthy();
  });

  it("muestra un estado vacío", () => {
    render(<TicketThread items={[]} viewer="user" />);
    expect(screen.getByText(/Todavía no hay mensajes/)).toBeTruthy();
  });
});
