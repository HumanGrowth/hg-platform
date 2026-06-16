import { en } from "./locales/en";
import { es } from "./locales/es";

/**
 * Minimal i18n stub — replaces react-i18next (10MB+ deps) from the lovable source.
 *
 * Two access patterns:
 *  - `t("nav.login", lang)` → dot-path string lookup with fallback to the key.
 *  - `getCopy(lang)` → the full structured locale tree (for arrays/objects like
 *    `features.items`, `pricing.tiers`, `footer.columns`).
 *
 * Arranca en español hardcodeado (target HG = CR/LatAm). El switcher EN/ES se
 * puede agregar después con cookie + middleware sin tocar los componentes.
 */
export type Lang = "es" | "en";

export const defaultLang: Lang = "es";

// `es` is the canonical shape; `en` is structurally identical.
export type Copy = typeof es;

const locales: Record<Lang, Copy> = { es, en };

export function getCopy(lang: Lang = defaultLang): Copy {
  return locales[lang] ?? locales[defaultLang];
}

/** Dot-path lookup, e.g. t("hero.ctaPrimary"). Returns the key if unresolved. */
export function t(key: string, lang: Lang = defaultLang): string {
  const tree = getCopy(lang);
  const value = key.split(".").reduce<unknown>((acc, part) => {
    if (acc && typeof acc === "object" && part in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, tree);
  return typeof value === "string" ? value : key;
}
