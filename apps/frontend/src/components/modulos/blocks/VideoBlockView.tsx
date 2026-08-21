"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronsLeft,
  ChevronsRight,
  Gauge,
  List,
  Loader2,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
} from "lucide-react";
import * as React from "react";

import { ChapterList } from "@/components/modulos/blocks/ChapterList";
import { useShouldAnimate } from "@/lib/motion/useShouldAnimate";
import { dimensionStyle } from "@/lib/dimension-styles";
import { cn } from "@/lib/utils";
import type { VideoBlock } from "@/lib/types";

interface Props {
  block: VideoBlock;
  isCompleted: boolean;
  onCompleteBlock: () => Promise<void>;
  /** Pilar de la unit (Sprint UI) — color de la barra + marcadores de capítulos. */
  dimensionCode?: string;
}

type PlayerState = "loading" | "ready" | "playing" | "paused" | "ended" | "error";

function formatTime(sec: number): string {
  const safe = Number.isFinite(sec) && sec > 0 ? sec : 0;
  const m = Math.floor(safe / 60);
  const s = Math.floor(safe % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const UI_HIDE_MS = 3000; // auto-hide de controles (Sprint UI T2)
const DOUBLE_TAP_MS = 300;
const SEEK_STEP = 10; // doble-tap ±10s (Sprint UI T1)
const NEXT_ENABLE_SECONDS = 10; // a los 10s el bloque se completa → habilita "Siguiente"
const HOLD_MS = 350; // press-and-hold sobre el video → 2x mientras se mantiene

/**
 * Reproductor full-bleed estilo TikTok/Reels para video **9:16 vertical**
 * (TASK player-01, evolucionado en Sprint UI T1/T2/T3 — NO reemplazado).
 * El `<video>` **ES** el bloque (`aspect-[9/16]`, `object-cover`, sin bordes),
 * sin `controls` nativos. Controles custom: tap central play/pause (56px),
 * doble-tap lateral ±10s con overlay, barra scrubbable con buffered + marcadores
 * de capítulos, timer, fullscreen y lista de capítulos.
 *
 * Autoplay muted al entrar en viewport (IntersectionObserver). `prefers-
 * reduced-motion` (via `useShouldAnimate`) desactiva el autoplay **y** el
 * auto-hide de controles.
 */
export function VideoBlockView({ block, isCompleted, onCompleteBlock, dimensionCode }: Props) {
  const shouldAnimate = useShouldAnimate();
  const glow = dimensionStyle(dimensionCode).glow;
  const chapters = block.chapters ?? null;

  const videoRef = React.useRef<HTMLVideoElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const progressBarRef = React.useRef<HTMLDivElement>(null);
  const uiTimerRef = React.useRef<number | null>(null);
  const lastTapRef = React.useRef<{ time: number; side: number }>({ time: 0, side: 0 });
  const scrubbingRef = React.useRef(false);
  // Press-and-hold para 2x + supresión del tap que le sigue.
  const holdTimerRef = React.useRef<number | null>(null);
  const holdActiveRef = React.useRef(false);
  const suppressClickRef = React.useRef(false);
  // El bloque se completa una sola vez a los 10s (no en cada timeupdate).
  const completedFiredRef = React.useRef(false);

  const [state, setState] = React.useState<PlayerState>("loading");
  // TASK 2: intentamos autoplay CON sonido; si el browser lo bloquea (autoplay
  // policy), safePlay cae a mutado + badge "Activar sonido" (nunca deja el
  // video pausado esperando gesto).
  const [muted, setMuted] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration, setDuration] = React.useState(block.duration_seconds || 0);
  const [bufferedEnd, setBufferedEnd] = React.useState(0);
  const [uiVisible, setUiVisible] = React.useState(true);
  const [speedBoost, setSpeedBoost] = React.useState(false); // 2x activo (hold)
  const [scrubbing, setScrubbing] = React.useState(false); // engrosa barra + thumb al arrastrar
  const [showChapters, setShowChapters] = React.useState(false);
  const [seekFeedback, setSeekFeedback] = React.useState<{ dir: number; id: number } | null>(null);

  const stateRef = React.useRef<PlayerState>(state);
  stateRef.current = state;

  function safePlay() {
    const video = videoRef.current;
    if (!video) return;
    video.play().catch(() => {
      // Autoplay con sonido bloqueado (sin gesto de usuario) → mutear y
      // reintentar. El onPlay muestra el badge "Activar sonido" al ver muted.
      video.muted = true;
      setMuted(true);
      video.play().catch(() => {
        // Ni mutado pudo (raro) → estado manual, el usuario toca para reproducir.
        setState((s) => (s === "playing" ? s : "ready"));
      });
    });
  }

  // Auto-hide de la UI a los 3s reproduciendo (salvo reduced motion).
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

  // Limpia el overlay de doble-tap tras un instante.
  React.useEffect(() => {
    if (!seekFeedback) return;
    const t = window.setTimeout(() => setSeekFeedback(null), 550);
    return () => window.clearTimeout(t);
  }, [seekFeedback]);

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

  function seekBy(delta: number) {
    const video = videoRef.current;
    if (!video) return;
    const dur = duration || video.duration || 0;
    const next = Math.max(0, dur > 0 ? Math.min(video.currentTime + delta, dur) : video.currentTime + delta);
    video.currentTime = next;
    setCurrentTime(next);
    resetUiTimer();
  }

  // Tap central = play/pause. Doble-tap en el tercio izq/der = ∓10s. Los dos
  // toggles del doble-tap se cancelan entre sí (net: sólo el seek).
  function handleTapZone(e: React.MouseEvent<HTMLButtonElement>) {
    // El click que sigue a un press-and-hold (2x) no debe pausar/seek.
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    // Si el video reproduce MUTADO (autoplay forzado por el browser), el primer
    // tap ACTIVA el sonido —el "inicio real" consciente del usuario— en vez de
    // pausar. A partir de ahí, el tap vuelve a ser play/pause normal.
    if (stateRef.current === "playing" && videoRef.current?.muted) {
      unmute();
      return;
    }
    const now = Date.now();
    const rect = containerRef.current?.getBoundingClientRect();
    const w = rect?.width ?? 0;
    const x = rect && w > 0 ? (e.clientX - rect.left) / w : 0.5;
    const side = x < 0.35 ? -1 : x > 0.65 ? 1 : 0;
    const dt = now - lastTapRef.current.time;
    if (dt < DOUBLE_TAP_MS && side !== 0 && side === lastTapRef.current.side) {
      seekBy(side * SEEK_STEP);
      setSeekFeedback({ dir: side, id: now });
      lastTapRef.current = { time: 0, side: 0 };
    } else {
      lastTapRef.current = { time: now, side };
    }
    togglePlay();
  }

  function unmute() {
    setMuted(false);
    if (videoRef.current) videoRef.current.muted = false;
  }

  function toggleMute() {
    setMuted((m) => {
      const next = !m;
      if (videoRef.current) videoRef.current.muted = next;

      return next;
    });
  }

  // ── Press-and-hold sobre el video → 2x mientras se mantiene ──
  function startHold() {
    if (holdTimerRef.current) window.clearTimeout(holdTimerRef.current);
    holdTimerRef.current = window.setTimeout(() => {
      const video = videoRef.current;
      if (!video || video.paused) return;
      holdActiveRef.current = true;
      video.playbackRate = 2;
      setSpeedBoost(true);
    }, HOLD_MS);
  }
  function endHold() {
    if (holdTimerRef.current) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (holdActiveRef.current) {
      holdActiveRef.current = false;
      suppressClickRef.current = true; // el click que sigue NO debe pausar
      if (videoRef.current) videoRef.current.playbackRate = 1;
      setSpeedBoost(false);
    }
  }

  async function handleEnded() {
    setState("ended");
    setUiVisible(true);
    if (!isCompleted) await onCompleteBlock();
  }

  // Scrub: click o drag sobre la barra de progreso.
  function scrubToClientX(clientX: number) {
    const bar = progressBarRef.current;
    const video = videoRef.current;
    if (!bar || !video) return;
    const rect = bar.getBoundingClientRect();
    if (rect.width <= 0) return;
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const dur = duration || video.duration || 0;
    if (dur <= 0) return;
    video.currentTime = ratio * dur;
    setCurrentTime(video.currentTime);
  }

  function onScrubPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.stopPropagation();
    scrubbingRef.current = true;
    setScrubbing(true);
    e.currentTarget.setPointerCapture?.(e.pointerId);
    scrubToClientX(e.clientX);
    resetUiTimer();
  }
  function onScrubPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (scrubbingRef.current) scrubToClientX(e.clientX);
  }
  function onScrubPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    scrubbingRef.current = false;
    setScrubbing(false);
    e.currentTarget.releasePointerCapture?.(e.pointerId);
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
  const bufferedPct = Number.isFinite(duration) && duration > 0 ? (bufferedEnd / duration) * 100 : 0;
  // TASK 2: el botón de play NO aparece en el estado inicial de autoplay — solo
  // tras una pausa manual (paused) o al terminar (ended, para el replay).
  const showCentralIcon = state === "paused" || state === "ended";
  const showBottomUi = state === "playing" || state === "paused" || state === "ended";
  const currentChapter =
    chapters && chapters.length > 0
      ? chapters.reduce((acc, c) => (currentTime >= c.start_sec ? c : acc), chapters[0])
      : null;

  return (
    <div
      ref={containerRef}
      // TASK 2 · full-bleed: el player LLENA su contenedor padre (sin aspect
      // propio ni centrado). El padre define la forma: en mobile (stories) es
      // el viewport completo (object-cover recorta), en desktop es el panel
      // 9:16. El `<video>` usa object-cover, así que nunca hay barras negras.
      className="relative h-full w-full select-none overflow-hidden bg-black"
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
        preload="auto"
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration;
          if (Number.isFinite(d) && d > 0) setDuration(d);
        }}
        onProgress={(e) => {
          const b = e.currentTarget.buffered;
          if (b.length > 0) setBufferedEnd(b.end(b.length - 1));
        }}
        onPlay={() => setState("playing")}
        // `onPlaying` dispara cuando el video REALMENTE está reproduciendo (tras
        // buffering / autoplay). Garantiza que el estado quede "playing" y que
        // el overlay de play se oculte aunque el arranque haya sido mutado.
        onPlaying={() => setState("playing")}
        onPause={() => setState((s) => (s === "ended" ? s : "paused"))}
        onTimeUpdate={(e) => {
          const t = e.currentTarget.currentTime;
          setCurrentTime(t);
          // A los 10s el bloque se marca completo → habilita "Siguiente" sin
          // exigir ver todo el video. (Videos <10s completan en onEnded.)
          if (!completedFiredRef.current && !isCompleted && t >= NEXT_ENABLE_SECONDS) {
            completedFiredRef.current = true;
            void onCompleteBlock();
          }
        }}
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

      {/* Scrims (difuminado) arriba/abajo para que los tabs de progreso y los
          controles sobre el video se lean bien. Puramente decorativos. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/50 to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/50 to-transparent"
      />

      {/* Tap zone: toggle play/pause + doble-tap lateral. Debajo de los controles
          (hermanos posteriores en el DOM), encima del video. */}
      {state !== "error" && (
        <button
          type="button"
          onClick={handleTapZone}
          onPointerDown={startHold}
          onPointerUp={endHold}
          onPointerLeave={endHold}
          onPointerCancel={endHold}
          aria-label={
            state === "playing"
              ? muted
                ? "Activar sonido"
                : "Pausar video (mantené presionado para 2x)"
              : "Reproducir video"
          }
          className="absolute inset-0 z-[1] h-full w-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/60"
        />
      )}

      {/* Overlay de doble-tap ±10s. */}
      <AnimatePresence>
        {seekFeedback && (
          <motion.div
            key={seekFeedback.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.18 }}
            className={`pointer-events-none absolute inset-y-0 z-[2] flex w-1/3 flex-col items-center justify-center gap-1 text-white ${
              seekFeedback.dir < 0 ? "left-0 bg-gradient-to-r" : "right-0 bg-gradient-to-l"
            } from-black/40 to-transparent`}
          >
            {seekFeedback.dir < 0 ? <ChevronsLeft size={32} /> : <ChevronsRight size={32} />}
            <span className="text-sm font-semibold">{seekFeedback.dir < 0 ? "−10s" : "+10s"}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Indicador de 2x mientras se mantiene presionado el video. */}
      <AnimatePresence>
        {speedBoost && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="pointer-events-none absolute left-1/2 top-3 z-[5] flex -translate-x-1/2 items-center gap-1 rounded-full bg-black/70 px-3 py-1 text-xs font-bold text-white backdrop-blur-sm"
          >
            <Gauge size={14} /> 2x
          </motion.div>
        )}
      </AnimatePresence>

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

      {/* Ícono central play / replay 56px (pointer-events-none → el tap llega al botón). */}
      <AnimatePresence>
        {showCentralIcon && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.15 }}
            className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
              {state === "ended" ? (
                <RotateCcw size={28} className="text-white" strokeWidth={2.25} />
              ) : (
                <Play size={30} className="text-white" strokeWidth={2.25} fill="white" />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hint "Activar sonido" PERSISTENTE mientras el video reproduce mutado
          (autoplay forzado). Tappear acá —o en cualquier parte del video—
          activa el sonido. */}
      <AnimatePresence>
        {muted && state === "playing" && (
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

      {/* Toggle discreto de silenciar — sólo cuando YA hay sonido (si está
          mutado, el pill "Activar sonido" de arriba es la acción). */}
      {state === "playing" && !muted && (
        <button
          type="button"
          onClick={toggleMute}
          aria-label={muted ? "Activar sonido" : "Silenciar"}
          className="absolute right-3 top-3 z-[4] flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-white/80 backdrop-blur-sm transition-opacity hover:bg-black/60 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          style={{ opacity: uiVisible ? 1 : 0, pointerEvents: uiVisible ? "auto" : "none" }}
        >
          {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
      )}

      {/* Lista de capítulos (overlay). */}
      <AnimatePresence>
        {showChapters && chapters && chapters.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[6]">
            <ChapterList
              chapters={chapters}
              currentTime={currentTime}
              onSeek={(sec) => {
                if (videoRef.current) {
                  videoRef.current.currentTime = sec;
                  setCurrentTime(sec);
                }
                setShowChapters(false);
              }}
              onClose={() => setShowChapters(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress bar scrubbable + buffered + marcadores + timer (bottom).
          Fondo transparente: los scrims arriba/abajo ya dan legibilidad. */}
      <AnimatePresence>
        {showBottomUi && uiVisible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-x-0 bottom-0 z-[3] flex flex-col gap-1 px-3 pb-2 pt-6"
          >
            {currentChapter && (
              <span className="truncate text-[11px] font-semibold text-white/90 drop-shadow">{currentChapter.label}</span>
            )}
            {/* Hit-area alta (py-3) para que sea fácil de agarrar con el dedo. */}
            <div
              ref={progressBarRef}
              role="slider"
              tabIndex={0}
              aria-label="Barra de progreso"
              aria-valuemin={0}
              aria-valuemax={Math.round(duration) || 0}
              aria-valuenow={Math.round(currentTime)}
              onPointerDown={onScrubPointerDown}
              onPointerMove={onScrubPointerMove}
              onPointerUp={onScrubPointerUp}
              className="group/scrub relative -mx-1 h-9 w-full cursor-pointer touch-none px-1"
            >
              <div
                className={cn(
                  "absolute inset-x-1 top-1/2 -translate-y-1/2 overflow-hidden rounded-full bg-white/25 transition-[height]",
                  scrubbing ? "h-2" : "h-1.5",
                )}
              >
                {/* buffered */}
                <div className="absolute inset-y-0 left-0 bg-white/30" style={{ width: `${bufferedPct}%` }} />
                {/* progreso (color del pilar) */}
                <div className="absolute inset-y-0 left-0" style={{ width: `${pct}%`, backgroundColor: glow }} />
              </div>
              {/* marcadores de capítulos */}
              {chapters?.map((c, i) => {
                const left = duration > 0 ? Math.min(100, (c.start_sec / duration) * 100) : 0;
                return (
                  <span
                    key={`${c.start_sec}-${i}`}
                    aria-hidden
                    className="absolute top-1/2 h-2 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/70"
                    style={{ left: `calc(0.25rem + ${left}% * (100% - 0.5rem) / 100%)` }}
                  />
                );
              })}
              {/* Thumb/knob arrastrable — crece al hacer scrub. */}
              <span
                aria-hidden
                className={cn(
                  "absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-md ring-2 ring-black/20 transition-transform",
                  scrubbing ? "h-4 w-4" : "h-3.5 w-3.5",
                )}
                style={{ left: `calc(0.25rem + ${pct}% * (100% - 0.5rem) / 100%)` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] font-medium text-white/90 drop-shadow">
              <span className="tabular-nums">
                {formatTime(currentTime)} / {formatTime(duration)}
                {isCompleted && <span className="ml-2 font-semibold text-primary">✓ Completado</span>}
              </span>
              {chapters && chapters.length > 0 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowChapters((s) => !s);
                  }}
                  aria-label="Capítulos"
                  className="flex h-9 w-9 items-center justify-center rounded-full text-white/80 hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                >
                  <List size={16} />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
