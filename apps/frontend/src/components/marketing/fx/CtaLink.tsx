"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRef, type PointerEvent, type ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * CTA con micro-interacciones: leve atracción magnética hacia el cursor,
 * brillo que barre el botón y flecha que se desplaza. `variant="ghost"` es la
 * versión glass secundaria.
 */
export function CtaLink({
  href,
  children,
  variant = "primary",
  arrow = true,
  className,
  onClick,
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "ghost";
  arrow?: boolean;
  className?: string;
  onClick?: () => void;
}) {
  const ref = useRef<HTMLAnchorElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  function move(e: PointerEvent<HTMLAnchorElement>) {
    if (e.pointerType !== "mouse") return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--tx", `${(e.clientX - (r.left + r.width / 2)) * 0.12}px`);
    el.style.setProperty("--ty", `${(e.clientY - (r.top + r.height / 2)) * 0.2}px`);
  }
  function leave() {
    ref.current?.style.setProperty("--tx", "0px");
    ref.current?.style.setProperty("--ty", "0px");
  }

  const classes = cn(
    "fx-cta group relative inline-flex items-center gap-2 overflow-hidden rounded-xl px-6 py-3.5 text-[15px] font-semibold whitespace-nowrap",
    variant === "primary"
      ? "fx-cta-shine bg-primary text-white shadow-[0_10px_30px_-10px_rgba(74,122,84,0.8)] hover:bg-primary-hover"
      : "glass-fill-strong text-fg hover:text-primary",
    className,
  );
  const inner = (
    <>
      <span className="relative z-10">{children}</span>
      {arrow ? (
        <ArrowRight
          size={16}
          strokeWidth={2}
          aria-hidden
          className="relative z-10 transition-transform duration-300 group-hover:translate-x-1"
        />
      ) : null}
    </>
  );

  // href="#id": scroll suave a la sección (botón, no navegación).
  if (href.startsWith("#")) {
    return (
      <button
        ref={btnRef}
        type="button"
        className={classes}
        onClick={() => {
          onClick?.();
          document.getElementById(href.slice(1))?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
      >
        {inner}
      </button>
    );
  }

  return (
    <Link
      ref={ref}
      href={href as never}
      onClick={onClick}
      onPointerMove={move}
      onPointerLeave={leave}
      className={classes}
    >
      {inner}
    </Link>
  );
}
