"use client";

import { Check, Maximize2 } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { useMediaQuery } from "@/lib/hooks/useMediaQuery";
import type { VideoBlock } from "@/lib/types";

/** iOS Safari expone fullscreen vía un método propio (no estándar) en vez
 * de `Element.requestFullscreen()`. */
interface SafariVideoElement extends HTMLVideoElement {
  webkitEnterFullscreen?: () => void;
}

/**
 * `<video>` HTML5 nativo apuntando a un MP4 en R2 (TASK lu-refine-B-02) —
 * reemplaza el iframe de YouTube (fuera de scope, ver B-01/A-02). Fullscreen
 * mobile vía botón custom + auto-mark on ended; "Ya lo vi" sigue disponible
 * como alternativa manual (ej. si el usuario navega antes de que termine).
 */
export function VideoBlockView({
  block,
  isCompleted,
  onCompleteBlock,
}: {
  block: VideoBlock;
  isCompleted: boolean;
  onCompleteBlock: () => Promise<void>;
}) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [marking, setMarking] = React.useState(false);
  const isMobile = useMediaQuery("(max-width: 768px)");

  async function markSeen() {
    if (isCompleted || marking) return;
    setMarking(true);
    try {
      await onCompleteBlock();
    } finally {
      setMarking(false);
    }
  }

  async function handleEnded() {
    if (isCompleted) return;
    // No usamos `marking` acá — sería confuso mostrar "Guardando…" en el
    // botón "Ya lo vi" cuando fue el propio video el que disparó el mark.
    await onCompleteBlock();
  }

  async function requestFullscreen() {
    const el = videoRef.current as SafariVideoElement | null;
    if (!el) return;
    try {
      if (typeof el.webkitEnterFullscreen === "function") {
        // iOS Safari: único método que realmente entra a fullscreen nativo.
        el.webkitEnterFullscreen();
      } else if (el.requestFullscreen) {
        await el.requestFullscreen();
      }
    } catch {
      // Algunos navegadores rechazan requestFullscreen sin gesto de usuario
      // directo — silencioso porque este handler ya corre dentro de un
      // onClick, así que un rechazo acá es un caso límite del browser, no
      // un error real de la app.
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {block.eyebrow_label && <Eyebrow accent>{block.eyebrow_label}</Eyebrow>}
      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-hg-ink">
        <video
          ref={videoRef}
          className="h-full w-full bg-hg-ink object-contain"
          src={block.video_url}
          title="Video del módulo"
          poster={block.poster_url ?? undefined}
          controls
          playsInline
          preload="metadata"
          onEnded={() => void handleEnded()}
        >
          {block.subtitle_url && (
            <track kind="subtitles" srcLang="es" label="Español" src={block.subtitle_url} default />
          )}
          Tu navegador no soporta video HTML5.
        </video>
        {isMobile && (
          <button
            type="button"
            aria-label="Ver en pantalla completa"
            onClick={() => void requestFullscreen()}
            className="absolute right-2 top-2 rounded-md bg-hg-ink/60 p-2 text-white"
          >
            <Maximize2 size={18} strokeWidth={1.75} />
          </button>
        )}
      </div>
      {isCompleted ? (
        <div className="flex items-center gap-2 self-start font-sans text-sm font-semibold text-success">
          <Check size={18} strokeWidth={2} /> Visto
        </div>
      ) : (
        <Button variant="secondary" size="sm" onClick={() => void markSeen()} disabled={marking} className="self-start">
          {marking ? "Guardando…" : "Ya lo vi"}
        </Button>
      )}
    </div>
  );
}
