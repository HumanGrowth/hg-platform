"use client";

import { useState } from "react";

/**
 * Toggle ES/EN — stub UI (item 2, fase 1). EN queda deshabilitado con tooltip
 * "Próximamente"; sin lógica i18n real todavía (el sitio corre en ES).
 */
export function LanguageToggle() {
  const [lang, setLang] = useState<"es" | "en">("es");
  return (
    <div className="flex items-center gap-1 text-xs font-heading font-semibold uppercase tracking-meta">
      <button
        type="button"
        onClick={() => setLang("es")}
        aria-pressed={lang === "es"}
        className={`px-2 py-1 rounded transition-colors ${
          lang === "es" ? "text-fg" : "text-fg-subtle hover:text-fg"
        }`}
      >
        ES
      </button>
      <span className="text-fg-subtle" aria-hidden>
        ·
      </span>
      <button
        type="button"
        aria-pressed={lang === "en"}
        disabled
        title="Próximamente"
        className="px-2 py-1 rounded text-fg-subtle opacity-40 cursor-not-allowed"
      >
        EN
      </button>
    </div>
  );
}
