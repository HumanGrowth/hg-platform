"use client";

import { useMarketingLanguage } from "@/components/marketing/LanguageProvider";

/**
 * Toggle ES/EN — stub UI (item 2, fase 1). EN queda deshabilitado con tooltip
 * "Próximamente"; sin lógica i18n real todavía (el sitio corre en ES).
 */
export function LanguageToggle() {
  const { lang, setLang } = useMarketingLanguage();
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
        onClick={() => setLang("en")}
        aria-pressed={lang === "en"}
        className={`px-2 py-1 rounded transition-colors ${
          lang === "en" ? "text-fg" : "text-fg-subtle hover:text-fg"
        }`}
      >
        EN
      </button>
    </div>
  );
}
