"use client";

import Hls from "hls.js";
import {
  Maximize,
  Pause,
  Play,
  Settings,
  Volume2,
  VolumeX,
} from "lucide-react";
import * as React from "react";

import { formatDuration } from "@/lib/utils";

export interface VideoPlayerProps {
  src: string; // HLS master.m3u8
  poster?: string | null;
  startAt?: number; // last_position_seconds para reanudar
  onProgress?: (data: {
    position_seconds: number;
    watch_pct: number;
    duration_seconds: number;
  }) => void;
  onComplete?: () => void; // una sola vez al cruzar 80%
}

const SPEEDS = [0.75, 1, 1.25, 1.5];
const COMPLETE_PCT = 80;

export function VideoPlayer({ src, poster, startAt = 0, onProgress, onComplete }: VideoPlayerProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const hlsRef = React.useRef<Hls | null>(null);
  const completedRef = React.useRef(false);
  const onProgressRef = React.useRef(onProgress);
  const onCompleteRef = React.useRef(onComplete);
  onProgressRef.current = onProgress;
  onCompleteRef.current = onComplete;

  const [playing, setPlaying] = React.useState(false);
  const [current, setCurrent] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const [volume, setVolume] = React.useState(1);
  const [muted, setMuted] = React.useState(false);
  const [levels, setLevels] = React.useState<{ height: number }[]>([]);
  const [level, setLevel] = React.useState(-1); // -1 = auto
  const [speed, setSpeed] = React.useState(1);
  const [menu, setMenu] = React.useState<null | "quality" | "speed">(null);

  // ── Setup HLS / native ──
  React.useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src; // Safari / iOS nativo
    } else if (Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true });
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setLevels(hls.levels.map((l) => ({ height: l.height })));
      });
    } else {
      video.src = src;
    }
    return () => {
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [src]);

  // ── onProgress cada 5s mientras reproduce ──
  React.useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      const v = videoRef.current;
      if (!v || !v.duration) return;
      const pct = (v.currentTime / v.duration) * 100;
      onProgressRef.current?.({
        position_seconds: Math.floor(v.currentTime),
        watch_pct: Math.min(100, Math.round(pct * 10) / 10),
        duration_seconds: Math.floor(v.duration),
      });
    }, 5000);
    return () => clearInterval(id);
  }, [playing]);

  // ── Pausar al perder visibilidad ──
  React.useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "hidden") videoRef.current?.pause();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // ── Aplicar volumen/velocidad al elemento ──
  React.useEffect(() => {
    const v = videoRef.current;
    if (v) {
      v.volume = volume;
      v.muted = muted;
    }
  }, [volume, muted]);
  React.useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = speed;
  }, [speed]);

  // ── Handlers de eventos del <video> ──
  function handleLoadedMetadata() {
    const v = videoRef.current;
    if (!v) return;
    setDuration(v.duration || 0);
    if (startAt > 5 && startAt < (v.duration || Infinity)) v.currentTime = startAt;
  }
  function handleTimeUpdate() {
    const v = videoRef.current;
    if (!v) return;
    setCurrent(v.currentTime);
    if (v.duration && !completedRef.current && (v.currentTime / v.duration) * 100 >= COMPLETE_PCT) {
      completedRef.current = true;
      onCompleteRef.current?.();
    }
  }

  // ── Controles ──
  function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) void v.play();
    else v.pause();
  }
  function seekTo(t: number) {
    const v = videoRef.current;
    if (v) v.currentTime = Math.max(0, Math.min(t, v.duration || 0));
  }
  function selectLevel(idx: number) {
    setLevel(idx);
    if (hlsRef.current) hlsRef.current.currentLevel = idx;
    setMenu(null);
  }
  function toggleFullscreen() {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen?.();
  }

  // ── Teclado ──
  function onKeyDown(e: React.KeyboardEvent) {
    const v = videoRef.current;
    if (!v) return;
    switch (e.key) {
      case " ":
        e.preventDefault();
        togglePlay();
        break;
      case "ArrowRight":
        seekTo(v.currentTime + 5);
        break;
      case "ArrowLeft":
        seekTo(v.currentTime - 5);
        break;
      case "ArrowUp":
        setVolume((x) => Math.min(1, x + 0.1));
        break;
      case "ArrowDown":
        setVolume((x) => Math.max(0, x - 0.1));
        break;
      case "f":
      case "F":
        toggleFullscreen();
        break;
      case "m":
      case "M":
        setMuted((x) => !x);
        break;
    }
  }

  const pct = duration ? (current / duration) * 100 : 0;
  const ctrlBtn = "text-cream-200 hover:text-orange transition-colors";

  return (
    <div
      ref={containerRef}
      className="group relative aspect-video w-full overflow-hidden rounded-lg bg-ink-900 outline-none"
      tabIndex={0}
      onKeyDown={onKeyDown}
      data-testid="video-player"
    >
      <video
        ref={videoRef}
        poster={poster ?? undefined}
        className="h-full w-full"
        playsInline
        onClick={togglePlay}
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onDurationChange={() => setDuration(videoRef.current?.duration || 0)}
      />

      {/* Overlay play central cuando está pausado */}
      {!playing && (
        <button
          type="button"
          aria-label="Reproducir"
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-ink-900/30"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-orange text-white">
            <Play size={28} strokeWidth={2} />
          </span>
        </button>
      )}

      {/* Barra de controles */}
      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 bg-gradient-to-t from-ink-900/90 to-transparent px-3 pb-2 pt-6">
        {/* Seek */}
        <input
          type="range"
          aria-label="Progreso"
          min={0}
          max={duration || 0}
          step={0.1}
          value={current}
          onChange={(e) => seekTo(Number(e.target.value))}
          className="h-1 w-full cursor-pointer accent-orange"
          data-testid="seek"
        />
        <div className="flex items-center gap-3 text-sm">
          <button type="button" onClick={togglePlay} className={ctrlBtn} aria-label={playing ? "Pausar" : "Reproducir"}>
            {playing ? <Pause size={20} /> : <Play size={20} />}
          </button>
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={() => setMuted((x) => !x)} className={ctrlBtn} aria-label="Silenciar">
              {muted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <input
              type="range"
              aria-label="Volumen"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={(e) => {
                setVolume(Number(e.target.value));
                setMuted(false);
              }}
              className="h-1 w-20 cursor-pointer accent-orange"
            />
          </div>
          <span className="font-mono text-xs text-cream-200">
            {formatDuration(current)} / {formatDuration(duration)}
          </span>
          <div className="flex-1" />

          {/* Velocidad */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenu((m) => (m === "speed" ? null : "speed"))}
              className={`${ctrlBtn} font-mono text-xs`}
              aria-label="Velocidad"
            >
              {speed}x
            </button>
            {menu === "speed" && (
              <div className="absolute bottom-7 right-0 flex flex-col rounded-md bg-ink-800 p-1">
                {SPEEDS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setSpeed(s);
                      setMenu(null);
                    }}
                    className={`px-3 py-1 text-left text-xs ${s === speed ? "text-orange" : "text-cream-200"} hover:text-orange`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Calidad */}
          {levels.length > 0 && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenu((m) => (m === "quality" ? null : "quality"))}
                className={ctrlBtn}
                aria-label="Calidad"
              >
                <Settings size={18} />
              </button>
              {menu === "quality" && (
                <div className="absolute bottom-7 right-0 flex flex-col rounded-md bg-ink-800 p-1">
                  <button
                    type="button"
                    onClick={() => selectLevel(-1)}
                    className={`px-3 py-1 text-left text-xs ${level === -1 ? "text-orange" : "text-cream-200"} hover:text-orange`}
                  >
                    Auto
                  </button>
                  {levels.map((l, i) => (
                    <button
                      key={l.height}
                      type="button"
                      onClick={() => selectLevel(i)}
                      className={`px-3 py-1 text-left text-xs ${level === i ? "text-orange" : "text-cream-200"} hover:text-orange`}
                    >
                      {l.height}p
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <button type="button" onClick={toggleFullscreen} className={ctrlBtn} aria-label="Pantalla completa">
            <Maximize size={18} />
          </button>
        </div>
      </div>

      {/* Barra de progreso fina (indicador) */}
      <div className="absolute bottom-0 left-0 h-0.5 bg-orange" style={{ width: `${pct}%` }} aria-hidden />
    </div>
  );
}
