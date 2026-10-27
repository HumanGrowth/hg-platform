"use client";

import { AlertTriangle, ArrowLeft, Download, Send, Upload } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import * as React from "react";

import { CompanyAdminGate } from "@/components/CompanyAdminGate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Display } from "@/components/ui/display";
import { Eyebrow } from "@/components/ui/eyebrow";
import { useScopedCompanyId } from "@/lib/acting-company";
import {
  apiBulkImport,
  apiBulkImportTemplate,
  apiErrorMessage,
  apiSendInvitations,
} from "@/lib/api";
import { toast } from "@/lib/toast-store";
import type { BulkImportResponse } from "@/lib/types";

type Step = "upload" | "preview" | "done";

const TH = "px-5 py-3 font-semibold";

function stateVariant(estado: string): "danger" | "success" | "default" {
  if (estado === "error") return "danger";
  if (["creado", "creada", "asignado"].includes(estado)) return "success";
  return "default";
}

/** Las tres hojas del reporte. Se usa tanto en la vista previa como en el resultado. */
function ReportTables({ report }: { report: BulkImportResponse }) {
  return (
    <div className="flex flex-col gap-6">
      {report.organizaciones.length > 0 ? (
        <Card className="overflow-x-auto overflow-y-hidden p-0">
          <div className="border-b border-border px-5 py-3 font-sans text-sm font-semibold text-fg">
            Organizaciones
          </div>
          <table className="w-full text-left">
            <thead className="border-b border-border bg-bg-sunken">
              <tr className="font-sans text-micro uppercase tracking-meta text-fg-muted">
                <th className={TH}>Fila</th>
                <th className={TH}>Organización</th>
                <th className={TH}>Estado</th>
                <th className={TH}>Motivo</th>
              </tr>
            </thead>
            <tbody>
              {report.organizaciones.map((r) => (
                <tr key={r.fila} className="border-b border-border last:border-0">
                  <td className="px-5 py-3 font-mono text-xs text-fg-muted">{r.fila}</td>
                  <td className="px-5 py-3 text-sm text-fg">{r.organizacion}</td>
                  <td className="px-5 py-3">
                    <Badge variant={stateVariant(r.estado)}>{r.estado.replace("_", " ")}</Badge>
                  </td>
                  <td className="px-5 py-3 text-sm text-fg-muted">{r.motivo ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : null}

      {report.filas.length > 0 ? (
        <Card className="overflow-x-auto overflow-y-hidden p-0">
          <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-3 text-sm">
            <span className="font-sans font-semibold text-fg">Miembros</span>
            <span className="text-fg-muted">Total: {report.total}</span>
            <Badge variant="success">{report.creados} nuevos</Badge>
            <Badge>{report.actualizados} actualizados</Badge>
            {report.errores > 0 ? <Badge variant="danger">{report.errores} errores</Badge> : null}
          </div>
          <table className="w-full text-left">
            <thead className="border-b border-border bg-bg-sunken">
              <tr className="font-sans text-micro uppercase tracking-meta text-fg-muted">
                <th className={TH}>Fila</th>
                <th className={TH}>Email</th>
                <th className={TH}>Estado</th>
                <th className={TH}>Detalle</th>
              </tr>
            </thead>
            <tbody>
              {report.filas.map((r) => (
                <tr key={r.fila} className="border-b border-border last:border-0">
                  <td className="px-5 py-3 font-mono text-xs text-fg-muted">{r.fila}</td>
                  <td className="px-5 py-3 font-mono text-xs text-fg">{r.email}</td>
                  <td className="px-5 py-3">
                    <Badge variant={stateVariant(r.estado)}>{r.estado}</Badge>
                  </td>
                  <td className="px-5 py-3 text-sm text-fg-muted">
                    {r.motivo ?? null}
                    {r.aviso ? <span className="text-warning">{r.aviso}</span> : null}
                    {!r.motivo && !r.aviso ? "—" : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : null}

      {report.modulos.length > 0 ? (
        <Card className="overflow-x-auto overflow-y-hidden p-0">
          <div className="border-b border-border px-5 py-3 font-sans text-sm font-semibold text-fg">
            Módulos por organización
          </div>
          <table className="w-full text-left">
            <thead className="border-b border-border bg-bg-sunken">
              <tr className="font-sans text-micro uppercase tracking-meta text-fg-muted">
                <th className={TH}>Fila</th>
                <th className={TH}>Organización</th>
                <th className={TH}>Módulo</th>
                <th className={TH}>Estado</th>
                <th className={TH}>Motivo</th>
              </tr>
            </thead>
            <tbody>
              {report.modulos.map((r) => (
                <tr key={r.fila} className="border-b border-border last:border-0">
                  <td className="px-5 py-3 font-mono text-xs text-fg-muted">{r.fila}</td>
                  <td className="px-5 py-3 text-sm text-fg">{r.organizacion}</td>
                  <td className="px-5 py-3 font-mono text-xs text-fg">{r.modulo}</td>
                  <td className="px-5 py-3">
                    <Badge variant={stateVariant(r.estado)}>{r.estado.replace("_", " ")}</Badge>
                  </td>
                  <td className="px-5 py-3 text-sm text-fg-muted">{r.motivo ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : null}
    </div>
  );
}

function ImportContent() {
  const { companyId, ready } = useScopedCompanyId();
  const [file, setFile] = React.useState<File | null>(null);
  const [step, setStep] = React.useState<Step>("upload");
  const [busy, setBusy] = React.useState(false);
  const [report, setReport] = React.useState<BulkImportResponse | null>(null);

  async function downloadTemplate() {
    try {
      const blob = await apiBulkImportTemplate();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "plantilla_estructura.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast("No se pudo descargar la plantilla.", "danger");
    }
  }

  /** Paso 1 → 2: vista previa. No escribe nada ni manda correos. */
  async function validate() {
    if (!file) return;
    setBusy(true);
    try {
      setReport(await apiBulkImport(file, companyId, { validateOnly: true }));
      setStep("preview");
    } catch (err) {
      toast(apiErrorMessage(err, "No se pudo procesar el archivo."), "danger");
    } finally {
      setBusy(false);
    }
  }

  /** Paso 2 → 3: carga real. Las invitaciones se envían aparte salvo que se pida. */
  async function apply(sendInvitations: boolean) {
    if (!file) return;
    setBusy(true);
    try {
      const res = await apiBulkImport(file, companyId, { sendInvitations });
      setReport(res);
      setStep("done");
      toast(
        sendInvitations
          ? `Cargado. ${res.invitaciones_enviadas} invitaciones enviadas.`
          : "Estructura cargada. Las invitaciones todavía no se enviaron.",
        res.errores > 0 ? "danger" : "success",
      );
    } catch (err) {
      toast(apiErrorMessage(err, "No se pudo cargar el archivo."), "danger");
    } finally {
      setBusy(false);
    }
  }

  async function sendAll() {
    setBusy(true);
    try {
      const res = await apiSendInvitations({}, companyId);
      const failed = Object.keys(res.errores).length;
      toast(
        `${res.enviadas} invitaciones enviadas${failed ? `, ${failed} con error` : ""}${
          res.pendientes ? `. Quedan ${res.pendientes}: volvé a enviar.` : "."
        }`,
        failed ? "danger" : "success",
      );
    } catch (err) {
      toast(apiErrorMessage(err, "No se pudieron enviar las invitaciones."), "danger");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setFile(null);
    setReport(null);
    setStep("upload");
  }

  if (!ready) return null; // superadmin sin empresa elegida → el hook redirige al selector.

  const invalidRows = report
    ? report.errores +
      report.organizaciones.filter((o) => o.estado === "error").length +
      report.modulos.filter((m) => m.estado === "error").length
    : 0;

  return (
    <main className="mx-auto w-full max-w-app px-5 py-10 sm:px-8">
      <Link
        href={"/admin/empresa/miembros" as Route}
        className="mb-6 inline-flex items-center gap-2 text-sm text-fg-muted hover:text-fg"
      >
        <ArrowLeft size={16} strokeWidth={1.75} />
        Miembros
      </Link>
      <Eyebrow accent>Empresa</Eyebrow>
      <Display variant="display-3" className="mt-1">
        Cargar la estructura de la empresa
      </Display>
      <p className="mt-3 max-w-prose text-sm text-fg-muted">
        Definí organizaciones, personas, managers y módulos antes de que nadie acepte su invitación.
        Cada persona queda con su cuenta ya configurada y se activa cuando acepta. Primero ves una
        vista previa; los correos solo salen cuando vos lo decidís.
      </p>

      {step === "upload" ? (
        <Card className="mt-8 flex flex-col gap-5 p-6">
          <div className="flex flex-col gap-2">
            <p className="text-sm text-fg-muted">
              La plantilla trae tres hojas: <strong className="text-fg">Organizaciones</strong>{" "}
              (nombre y cupo de licencias), <strong className="text-fg">Miembros</strong> (con su
              manager, que puede estar más abajo en el mismo archivo) y{" "}
              <strong className="text-fg">Módulos</strong> (por organización, con fecha límite
              opcional). Subir el mismo archivo dos veces no duplica nada.
            </p>
            <div>
              <Button variant="secondary" onClick={downloadTemplate}>
                <Download size={18} strokeWidth={1.75} />
                Descargar plantilla .xlsx
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="text-sm text-fg-muted file:mr-3 file:rounded-md file:border file:border-border file:bg-bg-raised file:px-4 file:py-2 file:font-sans file:text-sm file:text-fg hover:file:bg-bg-sunken"
            />
            <Button onClick={validate} disabled={!file || busy}>
              <Upload size={18} strokeWidth={1.75} />
              {busy ? "Validando…" : "Validar y ver vista previa"}
            </Button>
          </div>
        </Card>
      ) : null}

      {step === "preview" && report ? (
        <>
          <Card className="mt-8 flex flex-col gap-4 p-6">
            <div>
              <p className="font-sans text-sm font-semibold text-fg">Vista previa</p>
              <p className="mt-1 text-sm text-fg-muted">
                Así quedaría la carga. Todavía no se guardó nada ni se mandó ningún correo.
                {invalidRows > 0
                  ? ` Las ${invalidRows} filas con error se omiten; podés corregirlas y volver a subir el archivo.`
                  : ""}
              </p>
            </div>
            {report.advertencias.map((w) => (
              <p key={w} className="flex items-start gap-2 text-sm text-warning">
                <AlertTriangle size={16} strokeWidth={1.75} className="mt-0.5 shrink-0" />
                {w}
              </p>
            ))}
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => apply(false)} disabled={busy}>
                {busy ? "Cargando…" : "Cargar estructura (sin enviar correos)"}
              </Button>
              <Button variant="secondary" onClick={() => apply(true)} disabled={busy}>
                <Send size={16} strokeWidth={1.75} />
                Cargar y enviar invitaciones
              </Button>
              <Button variant="ghost" onClick={reset} disabled={busy}>
                Cambiar archivo
              </Button>
            </div>
          </Card>
          <div className="mt-6">
            <ReportTables report={report} />
          </div>
        </>
      ) : null}

      {step === "done" && report ? (
        <>
          <Card className="mt-8 flex flex-col gap-4 p-6">
            <p className="font-sans text-sm font-semibold text-fg">Estructura cargada</p>
            <p className="text-sm text-fg-muted">
              {report.invitaciones_enviadas > 0
                ? `Se enviaron ${report.invitaciones_enviadas} invitaciones.`
                : "Las personas nuevas quedaron como invitados preparados: ya tienen organización, rol, manager y módulos, pero no recibieron ningún correo."}
            </p>
            <div className="flex flex-wrap gap-3">
              {report.invitaciones_enviadas === 0 ? (
                <Button onClick={sendAll} disabled={busy}>
                  <Send size={16} strokeWidth={1.75} />
                  {busy ? "Enviando…" : "Enviar invitaciones ahora"}
                </Button>
              ) : null}
              <Link href={"/admin/empresa/miembros" as Route}>
                <Button variant="secondary">Ver miembros</Button>
              </Link>
              <Button variant="ghost" onClick={reset}>
                Cargar otro archivo
              </Button>
            </div>
          </Card>
          <div className="mt-6">
            <ReportTables report={report} />
          </div>
        </>
      ) : null}
    </main>
  );
}

export default function CompanyImportPage() {
  return (
    <CompanyAdminGate>
      <ImportContent />
    </CompanyAdminGate>
  );
}
