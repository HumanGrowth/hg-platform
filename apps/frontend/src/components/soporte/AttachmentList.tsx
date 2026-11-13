"use client";

import { FileText, Image as ImageIcon, Paperclip } from "lucide-react";
import * as React from "react";

import { apiDownloadSupportAttachment, apiErrorMessage } from "@/lib/api";
import { formatBytes } from "@/lib/support";
import { toast } from "@/lib/toast-store";
import type { SupportAttachment } from "@/lib/types";

/** Adjuntos ya guardados de un ticket. Se bajan con el token de sesión (no hay URL pública). */
export function AttachmentList({
  scope,
  ticketId,
  attachments,
}: {
  scope: "me" | "admin";
  ticketId: string;
  attachments: SupportAttachment[];
}) {
  const [busy, setBusy] = React.useState<string | null>(null);
  if (attachments.length === 0) return null;

  async function open(a: SupportAttachment) {
    setBusy(a.id);
    try {
      const blob = await apiDownloadSupportAttachment(scope, ticketId, a.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      if (a.content_type.startsWith("image/") || a.content_type === "application/pdf") {
        link.target = "_blank";
        link.rel = "noopener";
      } else {
        link.download = a.filename;
      }
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      toast(apiErrorMessage(err, "No pudimos abrir el archivo."), "danger");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section aria-label="Archivos adjuntos">
      <h3 className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-fg-muted">
        <Paperclip size={12} strokeWidth={2} /> Adjuntos
      </h3>
      <ul className="flex flex-wrap gap-2">
        {attachments.map((a) => (
          <li key={a.id}>
            <button
              type="button"
              onClick={() => void open(a)}
              disabled={busy === a.id}
              className="flex items-center gap-2 rounded-md border border-border bg-bg-raised px-3 py-1.5 text-sm text-fg hover:bg-bg-sunken disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hg-amber"
            >
              {a.content_type.startsWith("image/") ? (
                <ImageIcon size={14} strokeWidth={1.75} />
              ) : (
                <FileText size={14} strokeWidth={1.75} />
              )}
              <span className="max-w-[16rem] truncate">{a.filename}</span>
              <span className="text-xs text-fg-muted">{formatBytes(a.size_bytes)}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
