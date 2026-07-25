"use client";

import * as React from "react";

import type { Chapter } from "@/lib/types";
import { cn } from "@/lib/utils";

function fmt(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Lista de capítulos del video (Sprint UI · TASK 3). Overlay inferior que
 * permite saltar a cada capítulo; resalta el capítulo activo. Se muestra sólo
 * si la unit tiene `chapters` (backward-compat: null → el player no lo renderiza).
 */
export function ChapterList({
  chapters,
  currentTime,
  onSeek,
  onClose,
}: {
  chapters: Chapter[];
  currentTime: number;
  onSeek: (sec: number) => void;
  onClose: () => void;
}) {
  const activeIndex = chapters.reduce((acc, c, i) => (currentTime >= c.start_sec ? i : acc), 0);

  return (
    <div className="absolute inset-x-0 bottom-0 z-[6] max-h-[55%] overflow-y-auto rounded-t-xl bg-black/85 p-3 backdrop-blur-md">
      <div className="mb-1 flex items-center justify-between px-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-white/70">Capítulos</span>
        <button
          type="button"
          onClick={onClose}
          className="rounded px-2 py-1 text-xs font-semibold text-white/80 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        >
          Cerrar
        </button>
      </div>
      <ul className="flex flex-col">
        {chapters.map((c, i) => (
          <li key={`${c.start_sec}-${i}`}>
            <button
              type="button"
              onClick={() => onSeek(c.start_sec)}
              className={cn(
                "flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60",
                i === activeIndex ? "bg-white/15 text-white" : "text-white/80 hover:bg-white/10",
              )}
            >
              <span className="w-10 shrink-0 tabular-nums text-xs text-white/60">{fmt(c.start_sec)}</span>
              <span className="min-w-0 flex-1 truncate">{c.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
