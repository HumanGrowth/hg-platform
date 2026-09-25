"use client";

import { X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { useMarketingCopy } from "@/components/marketing/LanguageProvider";

import { CtaLink } from "./CtaLink";

const KEY = "hg-sticky-cta-dismissed";

/**
 * CTA flotante que aparece tras leer un buen tramo de la página y se oculta
 * cerca del footer (para no tapar el CTA final). Descartable por sesión.
 */
export function StickyCta() {
  const c = useMarketingCopy().stickyCta;
  const path = usePathname();
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(KEY)) setDismissed(true);
    } catch {
      /* storage no disponible: se muestra igual */
    }
  }, []);

  useEffect(() => {
    const on = () => {
      const y = window.scrollY;
      const remaining = document.documentElement.scrollHeight - (y + window.innerHeight);
      setShow(y > 700 && remaining > 700);
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  if (dismissed || path === "/contacto") return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-5 z-40 flex justify-center px-4 transition-all duration-500"
      style={{ opacity: show ? 1 : 0, transform: show ? "translateY(0)" : "translateY(24px)" }}
      aria-hidden={!show}
    >
      <div
        className={`glass-surface-strong flex items-center gap-3 rounded-full py-2 pl-5 pr-2 ${
          show ? "pointer-events-auto" : ""
        }`}
      >
        <span className="hidden text-sm font-medium text-fg sm:inline">{c.text}</span>
        <CtaLink href="/contacto" className="!px-4 !py-2 text-sm">
          {c.button}
        </CtaLink>
        <button
          type="button"
          aria-label={c.dismiss}
          tabIndex={show ? 0 : -1}
          onClick={() => {
            setDismissed(true);
            try {
              sessionStorage.setItem(KEY, "1");
            } catch {
              /* noop */
            }
          }}
          className="flex h-8 w-8 items-center justify-center rounded-full text-fg-muted hover:text-fg"
        >
          <X size={16} strokeWidth={1.75} aria-hidden />
        </button>
      </div>
    </div>
  );
}
