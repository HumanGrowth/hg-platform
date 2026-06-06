"use client";

import { X } from "lucide-react";
import * as React from "react";

/**
 * Banner global mientras DEC-03 (identidad visual final) no esté firmada.
 * Dismissible (no persistido en v1).
 */
export function BetaBanner() {
  const [dismissed, setDismissed] = React.useState(false);
  if (dismissed) return null;
  return (
    <div className="flex w-full items-center justify-center gap-3 bg-warning-bg px-4 py-2 text-warning">
      <p className="font-sans text-micro font-semibold uppercase tracking-meta">
        Beta · Direction v1 — identidad visual pendiente de DEC-03
      </p>
      <button
        type="button"
        aria-label="Descartar aviso"
        onClick={() => setDismissed(true)}
        className="rounded-sm p-0.5 transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warning"
      >
        <X size={14} strokeWidth={1.75} />
      </button>
    </div>
  );
}
