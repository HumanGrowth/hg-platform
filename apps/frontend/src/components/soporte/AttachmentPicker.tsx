"use client";

import { Paperclip, X } from "lucide-react";
import * as React from "react";

import {
  SUPPORT_ACCEPT,
  SUPPORT_MAX_BYTES,
  SUPPORT_MAX_FILES,
  addSupportFiles,
  formatBytes,
  type AttachmentError,
} from "@/lib/support";

export interface AttachmentLabels {
  label: string;
  hint: string;
  add: string;
  remove: string;
  errors: Record<AttachmentError, string>;
}

export const ATTACHMENT_LABELS_ES: AttachmentLabels = {
  label: "Archivos de respaldo (opcional)",
  hint: `Hasta ${SUPPORT_MAX_FILES} archivos de ${SUPPORT_MAX_BYTES / (1024 * 1024)} MB: capturas (PNG, JPG, WebP, GIF), PDF o texto. También podés pegar una captura en el detalle.`,
  add: "Adjuntar archivos",
  remove: "Quitar",
  errors: {
    tooMany: `Podés adjuntar hasta ${SUPPORT_MAX_FILES} archivos.`,
    tooLarge: `Cada archivo puede pesar hasta ${SUPPORT_MAX_BYTES / (1024 * 1024)} MB.`,
    type: "Ese tipo de archivo no está permitido (usá PNG, JPG, WebP, GIF, PDF o texto).",
  },
};

/** Selector de adjuntos controlado: el padre guarda los `File[]` y los manda al crear el ticket. */
export function AttachmentPicker({
  files,
  onChange,
  labels = ATTACHMENT_LABELS_ES,
  disabled,
  id = "support-files",
}: {
  files: File[];
  onChange: (files: File[]) => void;
  labels?: AttachmentLabels;
  disabled?: boolean;
  id?: string;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [error, setError] = React.useState<AttachmentError | null>(null);

  function add(incoming: File[]) {
    const res = addSupportFiles(files, incoming);
    setError(res.error);
    onChange(res.files);
  }

  return (
    <div>
      <span className="mb-1 block text-sm font-medium text-fg">{labels.label}</span>
      <input
        ref={inputRef}
        id={id}
        type="file"
        multiple
        accept={SUPPORT_ACCEPT}
        className="sr-only"
        disabled={disabled}
        onChange={(e) => {
          add(Array.from(e.target.files ?? []));
          e.target.value = ""; // permite volver a elegir el mismo archivo
        }}
      />
      <button
        type="button"
        disabled={disabled || files.length >= SUPPORT_MAX_FILES}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          add(Array.from(e.dataTransfer.files));
        }}
        className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-border bg-bg-raised px-3 py-3 text-sm text-fg-muted transition-colors hover:bg-bg-sunken disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Paperclip size={16} strokeWidth={1.75} />
        {labels.add}
      </button>
      <p className="mt-1 text-xs text-fg-muted">{labels.hint}</p>
      {error && (
        <p role="alert" className="mt-1 text-sm text-danger">
          {labels.errors[error]}
        </p>
      )}
      {files.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1" aria-label={labels.label}>
          {files.map((f, i) => (
            <li
              key={`${f.name}-${i}`}
              className="flex items-center justify-between gap-2 rounded-md border border-border bg-bg-raised px-3 py-1.5 text-sm"
            >
              <span className="min-w-0 truncate text-fg">
                {f.name} <span className="text-fg-muted">· {formatBytes(f.size)}</span>
              </span>
              <button
                type="button"
                aria-label={`${labels.remove} ${f.name}`}
                disabled={disabled}
                onClick={() => {
                  setError(null);
                  onChange(files.filter((_, j) => j !== i));
                }}
                className="shrink-0 rounded p-1 text-fg-muted hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hg-amber"
              >
                <X size={14} strokeWidth={2} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
