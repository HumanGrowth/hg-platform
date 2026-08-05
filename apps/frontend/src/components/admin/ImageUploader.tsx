"use client";

import { Loader2, Upload, X } from "lucide-react";
import * as React from "react";

import { apiUploadImage } from "@/lib/api";
import { toast } from "@/lib/toast-store";

const MAX_MB = 5;
const ACCEPT = "image/jpeg,image/png,image/webp";

/**
 * Uploader de imagen reusable (cierre-beta TASK 4). Sube a R2 vía
 * `POST /admin/upload/image` y devuelve la URL por `onChange`. Con preview,
 * estado de carga y manejo de errores (toast con el detalle del backend).
 */
export function ImageUploader({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const [uploading, setUploading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast("Elegí una imagen (JPG, PNG o WebP).", "danger");
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      toast(`La imagen supera el máximo de ${MAX_MB} MB.`, "danger");
      return;
    }
    setUploading(true);
    try {
      const { url } = await apiUploadImage(file);
      onChange(url);
      toast("Imagen subida.", "success");
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast(detail ?? "No pudimos subir la imagen.", "danger");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      {value ? (
        <div className="relative w-full overflow-hidden rounded-md border border-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Vista previa" className="max-h-40 w-full object-cover" />
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label="Quitar imagen"
            className="absolute right-2 top-2 rounded-md bg-black/60 p-1 text-white hover:bg-black/80"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-bg-raised px-4 py-8 font-sans text-sm text-fg-muted hover:border-primary hover:text-fg disabled:opacity-60"
        >
          {uploading ? (
            <Loader2 size={20} className="animate-spin" strokeWidth={1.75} />
          ) : (
            <Upload size={20} strokeWidth={1.75} />
          )}
          {uploading ? "Subiendo…" : `Subir imagen · JPG, PNG o WebP · máx ${MAX_MB} MB`}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
        }}
      />
    </div>
  );
}
