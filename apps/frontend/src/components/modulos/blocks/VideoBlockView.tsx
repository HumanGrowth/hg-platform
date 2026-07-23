"use client";

import { Check, X } from "lucide-react";
import * as React from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { useMediaQuery } from "@/lib/hooks/useMediaQuery";
import type { VideoBlock } from "@/lib/types";

/**
 * `<video>` HTML5 nativo apuntando a un MP4 en R2 (TASK lu-refine-B-02).
 *
 * Fullscreen mobile (TASK polish-01): al dar play en un viewport chico, el
 * video pasa a un **overlay propio** (`fixed inset-0`, portal a `document.body`)
 * con el video 16:9 centrado sobre negro y una `X` para volver a la unit — en
 * vez del fullscreen nativo de iOS (`webkitEnterFullscreen`), que rompía el
 * flujo del stories player. En desktop el video reproduce inline dentro de su
 * contenedor `aspect-video`. Auto-mark on ended (cerrando el overlay si estaba
 * abierto); "Ya lo vi" sigue disponible como alternativa manual.
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
  const inlineRef = React.useRef<HTMLVideoElement>(null);
  const [marking, setMarking] = React.useState(false);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const isMobile = useMediaQuery("(max-width: 768px)");

  // Escape cierra el overlay + lock del scroll del body mientras está abierto.
  React.useEffect(() => {
    if (!isFullscreen) return;

    // Si el viewport deja de ser mobile (resize/rotate), cerramos para evitar
    // quedar con scroll-lock sin overlay visible.
    if (!isMobile) {
      setIsFullscreen(false);
      return;
    }

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setIsFullscreen(false);
    }
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [isFullscreen, isMobile]);

  async function complete() {
    if (isCompleted) return;
    await onCompleteBlock();
  }

  async function markSeen() {
    // Botón manual "Ya lo vi" — usa `marking` para el estado "Guardando…".
    if (isCompleted || marking) return;
    setMarking(true);
    try {
      await onCompleteBlock();
    } finally {
      setMarking(false);
    }
  }

  function handleInlinePlay() {
    // Mobile: el play inline abre el overlay fullscreen (y pausa el inline
    // para que no queden dos reproducciones/audios superpuestos).
    if (!isMobile) return;
    inlineRef.current?.pause();
    setIsFullscreen(true);
  }

  async function handleInlineEnded() {
    // Desktop: el video reproduce inline; al terminar marca completed. En
    // mobile el inline está pausado (juega el overlay), así que no dispara acá.
    await complete();
  }

  async function handleOverlayEnded() {
    setIsFullscreen(false);
    await complete();
  }

  return (
    <div className="flex flex-col gap-4">
      {block.eyebrow_label && <Eyebrow accent>{block.eyebrow_label}</Eyebrow>}
      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-hg-ink">
        <video
          ref={inlineRef}
          className="h-full w-full bg-hg-ink object-contain"
          src={block.video_url}
          title="Video del módulo"
          poster={block.poster_url ?? undefined}
          controls
          playsInline
          preload="metadata"
          onPlay={handleInlinePlay}
          onEnded={() => void handleInlineEnded()}
        >
          {block.subtitle_url && (
            <track kind="subtitles" srcLang="es" label="Español" src={block.subtitle_url} default />
          )}
          Tu navegador no soporta video HTML5.
        </video>
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

      {isFullscreen && isMobile && typeof document !== "undefined"
        ? createPortal(
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Video en pantalla completa"
              className="fixed inset-0 z-[60] flex items-center justify-center bg-black"
            >
              <button
                type="button"
                aria-label="Cerrar video"
                onClick={() => setIsFullscreen(false)}
                className="absolute right-3 top-3 z-10 rounded-full bg-white/10 p-2 text-white"
              >
                <X size={24} strokeWidth={1.75} />
              </button>
              <div className="aspect-video max-h-full w-full">
                <video
                  className="h-full w-full bg-black object-contain"
                  src={block.video_url}
                  title="Video en pantalla completa"
                  poster={block.poster_url ?? undefined}
                  autoPlay
                  controls
                  playsInline
                  onEnded={() => void handleOverlayEnded()}
                >
                  {block.subtitle_url && (
                    <track kind="subtitles" srcLang="es" label="Español" src={block.subtitle_url} default />
                  )}
                </video>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
