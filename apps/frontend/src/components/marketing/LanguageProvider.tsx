"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { defaultLang, getCopy, type Lang, t } from "@/lib/i18n";

const STORAGE_KEY = "hg:marketing-lang";

type MarketingLanguageContextValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
};

const MarketingLanguageContext = createContext<MarketingLanguageContextValue | undefined>(undefined);

export function MarketingLanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(defaultLang);

  useEffect(() => {
    // try/catch: localStorage puede no estar disponible (modo privado, jsdom).
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === "es" || saved === "en") {
        setLangState(saved);
      }
    } catch {
      /* noop */
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* noop */
    }
  }, []);

  const value = useMemo(() => ({ lang, setLang }), [lang, setLang]);

  return <MarketingLanguageContext.Provider value={value}>{children}</MarketingLanguageContext.Provider>;
}

export function useMarketingLanguage(): MarketingLanguageContextValue {
  const ctx = useContext(MarketingLanguageContext);
  if (!ctx) {
    throw new Error("useMarketingLanguage must be used inside MarketingLanguageProvider");
  }
  return ctx;
}

export function useMarketingCopy() {
  const { lang } = useMarketingLanguage();
  return useMemo(() => getCopy(lang), [lang]);
}

export function useMarketingT() {
  const { lang } = useMarketingLanguage();
  return useCallback((key: string) => t(key, lang), [lang]);
}
