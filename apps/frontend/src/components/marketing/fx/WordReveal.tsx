"use client";

import type { ElementType, ReactNode } from "react";

import { cn } from "@/lib/utils";

import { useInView } from "./useInView";

/**
 * Titular cinético: cada palabra entra con blur + slide escalonado. El texto
 * completo vive en un span sr-only; las palabras sueltas son aria-hidden.
 * `children` para partes con estilo propio (p. ej. una palabra de color) se
 * pasa como `tail` y entra después.
 */
export function WordReveal({
  text,
  as: Tag = "h2",
  className,
  step = 0.055,
  delay = 0,
  tail,
}: {
  text: string;
  as?: ElementType;
  className?: string;
  step?: number;
  delay?: number;
  tail?: ReactNode;
}) {
  const { ref, inView } = useInView<HTMLElement>("0px 0px -8% 0px");
  const words = text.split(" ");
  return (
    <Tag
      ref={ref}
      data-in={inView}
      className={cn("fx-words", className)}
    >
      {/* Texto completo para lectores de pantalla / buscadores; las palabras
          animadas de abajo son solo visuales. */}
      <span className="sr-only">{text}</span>
      {words.map((w, i) => (
        <span
          key={i}
          aria-hidden
          className="fx-word"
          style={{ animationDelay: `${delay + i * step}s` }}
        >
          {w}
          {i < words.length - 1 ? " " : ""}
        </span>
      ))}
      {tail ? (
        <span aria-hidden className="fx-word" style={{ animationDelay: `${delay + words.length * step}s` }}>
          {" "}
          {tail}
        </span>
      ) : null}
    </Tag>
  );
}
