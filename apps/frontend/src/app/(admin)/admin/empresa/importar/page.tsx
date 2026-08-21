"use client";

import { ArrowLeft, Download, Upload } from "lucide-react";
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
import { apiBulkImport, apiBulkImportTemplate, ApiError } from "@/lib/api";
import { toast } from "@/lib/toast-store";
import type { BulkImportResponse } from "@/lib/types";

function ImportContent() {
  const { companyId, ready } = useScopedCompanyId();
  const [file, setFile] = React.useState<File | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [report, setReport] = React.useState<BulkImportResponse | null>(null);

  async function downloadTemplate() {
    try {
      const blob = await apiBulkImportTemplate();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "plantilla_miembros.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast("No se pudo descargar la plantilla.", "danger");
    }
  }

  async function upload() {
    if (!file) return;
    setUploading(true);
    setReport(null);
    try {
      const res = await apiBulkImport(file, companyId);
      setReport(res);
      toast(
        `Listo: ${res.creados} creados, ${res.actualizados} actualizados, ${res.errores} errores.`,
        res.errores > 0 ? "danger" : "success",
      );
    } catch (err) {
      toast(
        err instanceof ApiError ? err.message : "No se pudo procesar el archivo.",
        "danger",
      );
    } finally {
      setUploading(false);
    }
  }

  if (!ready) return null; // superadmin sin empresa elegida → el hook redirige al selector.

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
        Importar miembros desde Excel
      </Display>
      <p className="mt-3 max-w-prose text-sm text-fg-muted">
        Descargá la plantilla, completá una fila por persona y subila. El proceso es idempotente por
        email (no duplica) y te devuelve un reporte fila por fila.
      </p>

      <Card className="mt-8 flex flex-col gap-5 p-6">
        <div>
          <Button variant="secondary" onClick={downloadTemplate}>
            <Download size={18} strokeWidth={1.75} />
            Descargar plantilla .xlsx
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-sm text-fg-muted file:mr-3 file:rounded-md file:border file:border-border file:bg-bg-raised file:px-4 file:py-2 file:font-sans file:text-sm file:text-fg hover:file:bg-bg-sunken"
          />
          <Button onClick={upload} disabled={!file || uploading}>
            <Upload size={18} strokeWidth={1.75} />
            {uploading ? "Procesando…" : "Subir e importar"}
          </Button>
        </div>
      </Card>

      {report ? (
        <Card className="mt-6 overflow-x-auto overflow-y-hidden p-0">
          <div className="flex flex-wrap gap-3 border-b border-border px-5 py-4 text-sm">
            <span className="text-fg-muted">Total: {report.total}</span>
            <Badge variant="success">{report.creados} creados</Badge>
            <Badge>{report.actualizados} actualizados</Badge>
            {report.errores > 0 ? <Badge variant="danger">{report.errores} errores</Badge> : null}
          </div>
          <table className="w-full text-left">
            <thead className="border-b border-border bg-bg-sunken">
              <tr className="font-sans text-micro uppercase tracking-meta text-fg-muted">
                <th className="px-5 py-3 font-semibold">Fila</th>
                <th className="px-5 py-3 font-semibold">Email</th>
                <th className="px-5 py-3 font-semibold">Estado</th>
                <th className="px-5 py-3 font-semibold">Motivo</th>
              </tr>
            </thead>
            <tbody>
              {report.filas.map((r) => (
                <tr key={r.fila} className="border-b border-border last:border-0">
                  <td className="px-5 py-3 font-mono text-xs text-fg-muted">{r.fila}</td>
                  <td className="px-5 py-3 font-mono text-xs text-fg">{r.email}</td>
                  <td className="px-5 py-3">
                    <Badge
                      variant={
                        r.estado === "error"
                          ? "danger"
                          : r.estado === "creado"
                            ? "success"
                            : "default"
                      }
                    >
                      {r.estado}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-sm text-fg-muted">{r.motivo ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
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
