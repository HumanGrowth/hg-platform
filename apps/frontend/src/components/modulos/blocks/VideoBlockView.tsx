"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";
import * as React from "react";

import { useShouldAnimate } from "@/lib/motion/useShouldAnimate";
import type { VideoBlock } from "@/lib/types";

interface Props {
  block: VideoBlock;
  isCompleted: boolean;
  onCompleteBlock: () => Promise<void>;
}

type PlayerState = "loading" | "ready" | "playing" | "paused" | "ended" | "error";

function formatTime(sec: number): string {
  const safe = Number.isFinite(sec) && sec > 0 ? sec : 0;
  const m = Math.floor(safe / 60);
  const s = Math.floor(safe % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const UI_HIDE_MS = 2500;
const UNMUTE_HINT_MS = 4000;

/**
 * Reproductor full-bleed estilo TikTok/Reels para video 16:9 horizontal
 * (TASK player-01). El `<video>` **ES** el div del bloque (`aspect-video
 * w-full`, `object-cover`, sin bordes) — sin `controls` nativos, sin overlay
 * fullscreen ni portal (eso era el approach anterior, polish-01). Controles
 * custom sobrepuestos: tap central play/pause, progress bar minimalista +
 * timer abajo, hint de "activar sonido" al primer play (autoplay muted).
 *
 * Autoplay muted al entrar en viewport (IntersectionObserver). `prefers-
 * reduced-motion` (via `useShouldAnimate`) desactiva el autoplay **y** el
 * auto-hide de controles.
 */
export function VideoBlockView({ block, isCompleted, onCompleteBlock }: Props) {
  const shouldAnimate = useShouldAnimate();
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const uiTimerRef = React.useRef<number | null>(null);
  const hintShownRef = React.useRef(false);

  const [state, setState] = React.useState<PlayerState>("loading");
  const [muted, setMuted] = React.useState(true);
  const [showUnmuteHint, setShowUnmuteHint] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration, setDuration] = React.useState(block.duration_seconds || 0);
  const [uiVisible, setUiVisible] = React.useState(true);

  const stateRef = React.useRef<PlayerState>(state);
  stateRef.current = state;

  function safePlay() {
    videoRef.current?.play().catch(() => {
      // El browser bloqueó el play (autoplay policy / sin gesto) → estado manual.
      setState((s) => (s === "playing" ? s : "ready"));
    });
  }

  // Auto-hide de la UI a los 2.5s reproduciendo (salvo reduced motion).
  const resetUiTimer = React.useCallback(() => {
    setUiVisible(true);
    if (uiTimerRef.current) window.clearTimeout(uiTimerRef.current);
    if (shouldAnimate && stateRef.current === "playing") {
      uiTimerRef.current = window.setTimeout(() => setUiVisible(false), UI_HIDE_MS);
    }
  }, [shouldAnimate]);

  React.useEffect(() => {
    resetUiTimer();
    return () => {
      if (uiTimerRef.current) window.clearTimeout(uiTimerRef.current);
    };
  }, [state, resetUiTimer]);

  // Autoplay muted al entrar en viewport (pausa al salir).
  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        const video = videoRef.current;
        if (!video) return;
        if (entry.isIntersecting) {
          if (!shouldAnimate) return; // reduced motion → sin autoplay
          safePlay();
        } else {
          video.pause();
        }
      },
      { threshold: 0.5 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [shouldAnimate]);

  function togglePlay() {
    const video = videoRef.current;
    if (!video || stateRef.current === "error") return;
    if (stateRef.current === "ended") {
      video.currentTime = 0;
      safePlay();
      return;
    }
    if (video.paused) safePlay();
    else video.pause();
  }

  function unmute() {
    setMuted(false);
    setShowUnmuteHint(false);
    if (videoRef.current) videoRef.current.muted = false;
  }

  function toggleMute() {
    setMuted((m) => {
      const next = !m;
      if (videoRef.current) videoRef.current.muted = next;
      if (!next) setShowUnmuteHint(false);
      return next;
    });
  }

  async function handleEnded() {
    setState("ended");
    setUiVisible(true);
    if (!isCompleted) await onCompleteBlock();
  }

  function handleSeek(e: React.MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video || !Number.isFinite(duration) || duration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    video.currentTime = ratio * duration;
    setCurrentTime(video.currentTime);
  }

  // Keyboard: espacio (play/pause), flechas (±5s), M (mute).
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const video = videoRef.current;
      if (!video) return;
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
        togglePlay();
      } else if (e.key === "ArrowRight") {
        video.currentTime = Math.min(video.currentTime + 5, duration || video.duration || 0);
      } else if (e.key === "ArrowLeft") {
        video.currentTime = Math.max(video.currentTime - 5, 0);
      } else if (e.key === "m" || e.key === "M") {
        toggleMute();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration]);

  const pct = Number.isFinite(duration) && duration > 0 ? (currentTime / duration) * 100 : 0;
  const showCentralIcon = state === "paused" || state === "ready" || state === "ended";
  const showBottomUi = state === "playing" || state === "paused" || state === "ended";

  return (
    <div
      ref={containerRef}
      className="relative aspect-video w-full select-none overflow-hidden bg-black"
      onMouseMove={resetUiTimer}
    >
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        src={block.video_url}
        title="Video del módulo"
        poster={block.poster_url ?? undefined}
        muted={muted}
        playsInline
        preload="metadata"
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration;
          if (Number.isFinite(d) && d > 0) setDuration(d);
        }}
        onPlay={() => {
          setState("playing");
          if (muted && !hintShownRef.current) {
            hintShownRef.current = true;
            setShowUnmuteHint(true);
            window.setTimeout(() => setShowUnmuteHint(false), UNMUTE_HINT_MS);
          }
        }}
        onPause={() => setState((s) => (s === "ended" ? s : "paused"))}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onEnded={() => void handleEnded()}
        onError={() => setState("error")}
        onWaiting={() => setState((s) => (s === "playing" ? "loading" : s))}
        onCanPlay={() => setState((s) => (s === "loading" ? "ready" : s))}
      >
        {block.subtitle_url && (
          <track kind="subtitles" srcLang="es" label="Español" src={block.subtitle_url} default />
        )}
        Tu navegador no soporta video HTML5.
      </video>

      {/* Tap zone: toggle play/pause. Debajo de los controles (hermanos
          posteriores en el DOM), encima del video. */}
      {state !== "error" && (
        <button
          type="button"
          onClick={togglePlay}
          aria-label={state === "playing" ? "Pausar video" : "Reproducir video"}
          className="absolute inset-0 z-[1] h-full w-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/60"
        />
      )}

      {/* Loading spinner */}
      {state === "loading" && (
        <div className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center bg-black/40">
          <Loader2 size={40} className="animate-spin text-white/80" />
        </div>
      )}

      {/* Error state */}
      {state === "error" && (
        <div className="absolute inset-0 z-[3] flex flex-col items-center justify-center gap-3 bg-black/80 px-4 text-center text-white">
          <p className="text-sm">No pudimos cargar el video.</p>
          <button
            type="button"
            onClick={() => {
              setState("loading");
              videoRef.current?.load();
            }}
            className="rounded-md bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Ícono central play / replay (pointer-events-none → el tap llega al botón). */}
      <AnimatePresence>
        {showCentralIcon && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.15 }}
            className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center"
          >
            <div className="rounded-full bg-white/20 p-5 backdrop-blur-sm">
              {state === "ended" ? (
                <RotateCcw size={40} className="text-white" strokeWidth={2.25} />
              ) : (
                <Play size={44} className="text-white" strokeWidth={2.25} fill="white" />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hint "Activar sonido" prominente al primer play (muted). */}
      <AnimatePresence>
        {showUnmuteHint && muted && state === "playing" && (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            onClick={unmute}
            className="absolute right-3 top-3 z-[4] flex items-center gap-2 rounded-full bg-black/60 px-3 py-2 text-xs font-semibold text-white shadow-lg backdrop-blur-sm hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            <VolumeX size={16} /> Activar sonido
          </motion.button>
        )}
      </AnimatePresence>

      {/* Mute/unmute discreto (persistente) mientras reproduce. */}
      {state === "playing" && !showUnmuteHint && (
        <button
          type="button"
          onClick={toggleMute}
          aria-label={muted ? "Activar sonido" : "Silenciar"}
          className="absolute right-3 top-3 z-[4] rounded-full bg-black/40 p-2 text-white/80 backdrop-blur-sm transition-opacity hover:bg-black/60 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          style={{ opacity: uiVisible ? 1 : 0, pointerEvents: uiVisible ? "auto" : "none" }}
        >
          {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
      )}

      {/* Progress bar minimalista + timer (bottom). */}
      <AnimatePresence>
        {showBottomUi && uiVisible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-x-0 bottom-0 z-[3] flex flex-col gap-1 bg-gradient-to-t from-black/60 to-transparent px-3 pb-2 pt-6"
          >
            <button
              type="button"
              onClick={handleSeek}
              aria-label="Barra de progreso · click para saltar"
              className="group h-1 w-full cursor-pointer overflow-hidden rounded-full bg-white/25"
            >
              <div className="h-full bg-primary transition-[width] duration-100" style={{ width: `${pct}%` }} />
            </button>
            <div className="flex items-center justify-between text-[11px] font-medium text-white/90">
              <span>
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
              {isCompleted && <span className="font-semibold text-primary">✓ Completado</span>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
