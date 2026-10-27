import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { BulkImportResponse } from "@/lib/types";

import CompanyImportPage from "../page";

const m = vi.hoisted(() => ({ bulk: vi.fn(), send: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));
vi.mock("@/components/CompanyAdminGate", () => ({
  CompanyAdminGate: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("@/lib/acting-company", () => ({
  useScopedCompanyId: () => ({ companyId: undefined, ready: true }),
}));
vi.mock("@/lib/api", () => ({
  apiBulkImport: m.bulk,
  apiBulkImportTemplate: vi.fn(),
  apiSendInvitations: m.send,
  apiErrorMessage: (_e: unknown, fallback: string) => fallback,
}));

function report(over: Partial<BulkImportResponse> = {}): BulkImportResponse {
  return {
    total: 2,
    creados: 2,
    actualizados: 0,
    errores: 0,
    filas: [
      { fila: 2, email: "a@x.test", estado: "creado", motivo: null, aviso: null },
      { fila: 3, email: "b@x.test", estado: "creado", motivo: null, aviso: null },
    ],
    organizaciones: [{ fila: 2, organizacion: "Ventas", estado: "creada", motivo: null }],
    modulos: [],
    advertencias: ["Entre activos (1) e invitados (2) superan las licencias de la empresa (2)."],
    solo_validar: true,
    invitaciones_enviadas: 0,
    ...over,
  };
}

function pickFile() {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  const file = new File(["x"], "estructura.xlsx");
  fireEvent.change(input, { target: { files: [file] } });
  return file;
}

describe("Importar estructura", () => {
  beforeEach(() => {
    m.bulk.mockReset();
    m.send.mockReset();
  });

  it("valida primero (vista previa) y no envía correos hasta confirmar", async () => {
    m.bulk.mockResolvedValue(report());
    render(<CompanyImportPage />);
    const file = pickFile();
    fireEvent.click(screen.getByText("Validar y ver vista previa"));

    await waitFor(() => expect(screen.getByText("Vista previa")).toBeTruthy());
    expect(m.bulk).toHaveBeenCalledWith(file, undefined, { validateOnly: true });
    expect(screen.getByText(/superan las licencias/)).toBeTruthy();
    expect(screen.getByText("Organizaciones")).toBeTruthy();
    expect(m.send).not.toHaveBeenCalled();
  });

  it("confirmar carga la estructura sin enviar y ofrece enviar después", async () => {
    m.bulk
      .mockResolvedValueOnce(report())
      .mockResolvedValueOnce(report({ solo_validar: false }));
    m.send.mockResolvedValue({ enviadas: 2, omitidas: 0, pendientes: 0, errores: {} });
    render(<CompanyImportPage />);
    const file = pickFile();
    fireEvent.click(screen.getByText("Validar y ver vista previa"));
    await waitFor(() => expect(screen.getByText("Vista previa")).toBeTruthy());

    fireEvent.click(screen.getByText("Cargar estructura (sin enviar correos)"));
    await waitFor(() => expect(screen.getByText("Estructura cargada")).toBeTruthy());
    expect(m.bulk).toHaveBeenLastCalledWith(file, undefined, { sendInvitations: false });
    expect(m.send).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText("Enviar invitaciones ahora"));
    await waitFor(() => expect(m.send).toHaveBeenCalledWith({}, undefined));
  });

  it("'Cargar y enviar invitaciones' pide el envío en la misma carga", async () => {
    m.bulk
      .mockResolvedValueOnce(report())
      .mockResolvedValueOnce(report({ solo_validar: false, invitaciones_enviadas: 2 }));
    render(<CompanyImportPage />);
    const file = pickFile();
    fireEvent.click(screen.getByText("Validar y ver vista previa"));
    await waitFor(() => expect(screen.getByText("Vista previa")).toBeTruthy());
    fireEvent.click(screen.getByText("Cargar y enviar invitaciones"));
    await waitFor(() => expect(screen.getByText("Se enviaron 2 invitaciones.")).toBeTruthy());
    expect(m.bulk).toHaveBeenLastCalledWith(file, undefined, { sendInvitations: true });
  });
});
