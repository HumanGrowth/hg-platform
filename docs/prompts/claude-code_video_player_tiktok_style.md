# Prompt Claude Code · Video Player · TikTok-style full-bleed 16:9

> **Modo recomendado:** `/effort high` con **Claude Opus 4.8**.
> Rediseño completo del `VideoBlockView` para lograr **full-bleed integrado al div padre** en mobile y desktop, con UX minimalista tipo TikTok pero video 16:9 horizontal. **6 TASKs · ~5-7h · 1 PR**.
> Rama: `feat/video-player-tiktok-style`.

---

## ⚙️ Resume protocol

1. Releé este prompt.
2. `git status && git log --oneline -8 && cd apps/frontend && pnpm typecheck 2>&1 | tail -5`
3. Reanudá desde el primer `[ ]`.

## 🧱 Reglas duras

- Un commit por TASK · prefijo `feat(player): ...` / `refactor(player): ...`
- Editá ESTE archivo al avanzar
- **NO tocar backend / assessment / motion**
- **NO instalar deps nuevas** — todo con HTML5 `<video>` + framer-motion (ya está)
- **NO usar `<video controls>` nativo** — controles custom sobrepuestos
- **Videos son SIEMPRE 16:9 horizontal** en la DB — no manejar otras orientaciones
- **prefers-reduced-motion:** desactivar autoplay + no auto-hide de controles
- Cross-browser: Chrome desktop + Chrome Android + Safari desktop + **Safari iOS específicamente probado** (autoplay policies)

## 🎯 Resultado esperado

Reproductor que en cualquier viewport se comporta así:

- **Se integra al div padre al 100%** (ancho y alto del contenedor · aspect-video 16:9)
- **Sin marcos visibles** — el video ES el div
- **Autoplay muted** al entrar en viewport (mobile y desktop)
- **Tap central:** toggle play/pause
- **Progress bar minimalista bottom** (3px · primary green · siempre visible)
- **Timer 0:12 / 0:30 esquina inferior derecha** (fade in/out con actividad)
- **Botón "🔊 Sonido" prominente al primer play** (una vez destapado, se oculta)
- **Auto-mark completed on `ended`**
- Sin overlay fullscreen mobile · sin portal · sin webkitEnterFullscreen · sin controls nativos

**Referencia mental:** TikTok/Reels · pero para video horizontal 16:9 · integrado en el div del block dentro del player de la unit.

---

## Diseño visual detallado

### Layout del contenedor

```
┌─────────────────────────────────────────┐  ← div padre (aspect-video w-full)
│                                         │
│                                         │
│              [VIDEO 16:9]               │  ← object-cover · llena TODO
│                                         │
│                                         │
│  ─────────────────────────      0:12/0:30│  ← progress bar + timer (bottom overlay)
└─────────────────────────────────────────┘
```

### Estados visuales

**1. Loading (video buffering primera vez)**
- Poster image llenando el div (si `poster_url` existe)
- Spinner sutil centrado (usa `<Loader2/>` de lucide con animate-spin)
- Progress bar oculta

**2. Ready to play (autoplay disabled por browser policy o preferencia)**
- Poster + botón play centrado grande
- Progress bar oculta
- Fade in de la UI

**3. Playing (autoplay OK)**
- Video reproduciéndose
- Progress bar visible bottom
- Timer visible bottom-right
- UI se auto-oculta a los 2.5s si no hay interacción · reappear on tap

**4. Paused (después de user tap)**
- Video congelado
- Botón play centrado grande overlay (semi-transparent)
- Progress bar visible
- Timer visible

**5. Ended**
- Auto-mark completed
- Botón "↻ Ver de nuevo" centrado
- Progress bar al 100%

**6. Error (video 404 o network fail)**
- Icon alerta centrado + copy "No pudimos cargar el video · Reintentar"
- Sin controles

### Controles custom overlay

- **Tap zone central** (invisible · 60% del área): toggle play/pause
- **Botón unmute (top-right o center-bottom)**: aparece SOLO al primer play si `muted=true` → fade out después de unmute o después de 4s si el user no lo tocó
- **Progress bar**: `absolute bottom-0 h-1 bg-primary` con width % según `currentTime/duration` · scrubbable (click/tap para seek)
- **Timer**: `absolute bottom-2 right-2 text-white/80 text-xs` con `mm:ss / mm:ss`
- Sin volume slider · sin fullscreen button · sin PIP · sin download

---

# TASKS

## TASK player-01 · Rediseñar `VideoBlockView.tsx` full-bleed · `[x]`

Reemplazar completamente el componente actual (con overlay + portal + fullscreen custom) por diseño integrado al div padre.

Archivo: `apps/frontend/src/components/modulos/blocks/VideoBlockView.tsx`

```tsx
"use client";

import { Loader2, Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import * as React from "react";

import { useShouldAnimate } from "@/lib/motion/useShouldAnimate";
import type { VideoBlock } from "@/lib/types";

interface Props {
  block: VideoBlock;
  isCompleted: boolean;
  onCompleteBlock: () => Promise<void>;
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function VideoBlockView({ block, isCompleted, onCompleteBlock }: Props) {
  const shouldAnimate = useShouldAnimate();
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const [state, setState] = React.useState<"loading" | "ready" | "playing" | "paused" | "ended" | "error">("loading");
  const [muted, setMuted] = React.useState(true);
  const [showUnmuteHint, setShowUnmuteHint] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration, setDuration] = React.useState(block.duration_seconds || 0);
  const [uiVisible, setUiVisible] = React.useState(true);
  const uiTimerRef = React.useRef<number | null>(null);

  // Autoplay muted cuando el video entra en viewport
  React.useEffect(() => {
    if (!containerRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!videoRef.current) return;
        if (entry.isIntersecting) {
          if (!shouldAnimate) return; // reduced motion → no autoplay
          videoRef.current.play().catch(() => {
            // Browser bloqueó autoplay · quedamos en "ready"
            setState("ready");
          });
        } else {
          videoRef.current.pause();
        }
      },
      { threshold: 0.5 },
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [shouldAnimate]);

  // Auto-ocultar UI después de 2.5s sin interacción
  function resetUiTimer() {
    setUiVisible(true);
    if (uiTimerRef.current) window.clearTimeout(uiTimerRef.current);
    if (state === "playing") {
      uiTimerRef.current = window.setTimeout(() => setUiVisible(false), 2500);
    }
  }

  React.useEffect(() => {
    resetUiTimer();
    return () => {
      if (uiTimerRef.current) window.clearTimeout(uiTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  function handleTogglePlay(e: React.MouseEvent | React.KeyboardEvent) {
    e.stopPropagation();
    if (!videoRef.current) return;
    if (state === "ended") {
      videoRef.current.currentTime = 0;
      videoRef.current.play();
      return;
    }
    if (videoRef.current.paused) videoRef.current.play();
    else videoRef.current.pause();
  }

  function handleUnmute(e: React.MouseEvent) {
    e.stopPropagation();
    setMuted(false);
    setShowUnmuteHint(false);
    if (videoRef.current) videoRef.current.muted = false;
  }

  async function handleEnded() {
    setState("ended");
    setUiVisible(true);
    if (!isCompleted) {
      await onCompleteBlock();
    }
  }

  function handleSeek(e: React.MouseEvent<HTMLDivElement>) {
    e.stopPropagation();
    if (!videoRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    videoRef.current.currentTime = pct * duration;
  }

  // Keyboard shortcuts
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!videoRef.current) return;
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") return;
      if (e.key === " ") {
        e.preventDefault();
        handleTogglePlay(e as unknown as React.KeyboardEvent);
      } else if (e.key === "ArrowRight") {
        videoRef.current.currentTime = Math.min(videoRef.current.currentTime + 5, duration);
      } else if (e.key === "ArrowLeft") {
        videoRef.current.currentTime = Math.max(videoRef.current.currentTime - 5, 0);
      } else if (e.key === "m") {
        setMuted((m) => {
          if (videoRef.current) videoRef.current.muted = !m;
          return !m;
        });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration]);

  const pct = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className="relative aspect-video w-full overflow-hidden bg-black cursor-pointer select-none"
      onClick={handleTogglePlay}
      onMouseMove={resetUiTimer}
      role="button"
      tabIndex={0}
      aria-label="Video del módulo · tap para play/pause"
    >
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        src={block.video_url}
        poster={block.poster_url ?? undefined}
        muted={muted}
        playsInline
        preload="metadata"
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onPlay={() => {
          setState("playing");
          if (muted && !showUnmuteHint) {
            setShowUnmuteHint(true);
            window.setTimeout(() => setShowUnmuteHint(false), 4000);
          }
        }}
        onPause={() => setState((s) => (s === "ended" ? s : "paused"))}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onEnded={handleEnded}
        onError={() => setState("error")}
        onWaiting={() => setState("loading")}
        onCanPlay={() => setState((s) => (s === "loading" ? "ready" : s))}
      />

      {/* Loading spinner */}
      {state === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
          <Loader2 size={40} className="animate-spin text-white/80" />
        </div>
      )}

      {/* Error state */}
      {state === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 text-white">
          <p className="text-sm">No pudimos cargar el video.</p>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              videoRef.current?.load();
            }}
            className="rounded-md bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Central play/pause icon overlay — visible cuando paused/ready/ended */}
      <AnimatePresence>
        {(state === "paused" || state === "ready" || state === "ended") && state !== "error" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
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

      {/* Botón unmute (aparece solo al primer play si muted) */}
      <AnimatePresence>
        {showUnmuteHint && muted && state === "playing" && (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            onClick={handleUnmute}
            className="absolute right-3 top-3 flex items-center gap-2 rounded-full bg-black/60 px-3 py-2 text-xs font-semibold text-white shadow-lg backdrop-blur-sm hover:bg-black/80"
          >
            <VolumeX size={16} />
            Activar sonido
          </motion.button>
        )}
      </AnimatePresence>

      {/* Mute/unmute toggle discreto (persistente) */}
      {state === "playing" && !showUnmuteHint && (
        <button
          type="button"
          onClick={handleUnmute}
          aria-label={muted ? "Activar sonido" : "Silenciar"}
          className="absolute right-3 top-3 rounded-full bg-black/40 p-2 text-white/80 backdrop-blur-sm transition-opacity hover:bg-black/60 hover:text-white"
          style={{ opacity: uiVisible ? 1 : 0 }}
        >
          {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
      )}

      {/* Progress bar + timer (bottom) */}
      <AnimatePresence>
        {(state === "playing" || state === "paused" || state === "ended") && uiVisible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-x-0 bottom-0 flex flex-col gap-1 bg-gradient-to-t from-black/60 to-transparent px-3 pb-2 pt-6"
          >
            <div
              onClick={handleSeek}
              className="group h-1 w-full cursor-pointer overflow-hidden rounded-full bg-white/20"
            >
              <div
                className="h-full bg-primary transition-[width] duration-100"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] font-medium text-white/90">
              <span>
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
              {isCompleted && (
                <span className="text-primary font-semibold">✓ Completado</span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

### Puntos críticos del diseño

- **`aspect-video w-full`** en el contenedor → aspecto 16:9 llenando el ancho del padre en cualquier viewport
- **`object-cover`** en el `<video>` → llena el div sin bordes negros (si el video es exactamente 16:9 no recorta)
- **`bg-black`** de fondo por si hay 1px de mismatch
- **Autoplay via IntersectionObserver** → suena solo cuando el user llega al bloque
- **Autoplay muted por default** (browser policy) + hint prominente al primer play
- **UI auto-hide después de 2.5s** cuando está reproduciendo (mouse move reactivate)
- **Keyboard: espacio, flechas, M** (accesibilidad + power users)
- **`playsInline`** en `<video>` para prevenir fullscreen automático en iOS Safari

### Criterios
- [x] Video llena aspect-video 16:9 del div padre completo · sin bordes
- [x] Autoplay muted al entrar en viewport
- [x] Tap central: play/pause con overlay visual central
- [x] Progress bar bottom scrubbable · timer visible
- [x] Botón unmute prominente primer play · fade out
- [x] Auto-mark completed on ended · botón replay
- [x] Keyboard: espacio/flechas/M
- [x] Loading + error states
- [x] `<video controls>` nativo eliminado
- [x] Commit: `feat(player): TikTok-style full-bleed 16:9 video player`

**Notas de implementación:**
- Reemplazado el componente polish-01 (overlay + `createPortal` + fullscreen)
  por el player full-bleed: el `<video>` es `absolute inset-0 object-cover`
  dentro de un contenedor `relative aspect-video w-full bg-black`, sin `controls`
  nativos ni portal.
- **Tap zone**: un `<button absolute inset-0 z-[1]>` (no un `div role=button`)
  para play/pause — más limpio para a11y/lint. Los controles (progress, unmute,
  hint, replay) son hermanos posteriores con z mayor → reciben sus propios
  clicks; el ícono central es `pointer-events-none` para que el tap caiga al
  botón.
- Autoplay muted vía `IntersectionObserver` (threshold 0.5); pausa al salir.
  `safePlay()` cachea el rechazo del browser → cae a estado `ready` con play
  manual. **Reduced motion (`useShouldAnimate`) desactiva autoplay _y_ el
  auto-hide** de la UI (regla dura).
- Hint "Activar sonido" prominente sólo al primer play (`hintShownRef`, 4s);
  después, botón mute discreto. `playsInline` para iOS. Keyboard: espacio /
  ←→ (±5s) / M. `handleEnded` marca completed + estado `ended` con replay
  (`RotateCcw`). Progress bar `bg-primary` scrubbable (click → seek) + timer
  `mm:ss / mm:ss`. Estados loading (spinner) y error (Reintentar → `video.load()`).
- Hardening sobre el sketch: `Number.isFinite` en duration/seek/format,
  `void`/`.catch` en los `play()`, y `stateRef` para leer el estado actual en
  timers/observer sin stale closures.
- **Tests reescritos** (el player cambió por completo): `VideoBlockView.test.tsx`
  (9: `<video>` sin controls/iframe, autoplay on-intersect, NO autoplay reduced
  motion, pause off-viewport, tap→play, espacio→play, ended→completed+replay,
  unmute hint→muted false, error+retry) con IntersectionObserver mockeable +
  `useShouldAnimate` mockeado. `BlockRenderer.test.tsx` y `UnitStoriesPlayer.test.tsx`
  ajustados (completan el video vía `ended`, ya no via "Ya lo vi"). 139/139
  frontend verdes · `tsc`/`eslint` limpios.

---

## TASK player-02 · Adaptar layout del bloque en `<UnitStoriesPlayer/>` mobile · `[x]`

El stories player mobile actualmente wrappea el bloque con padding. Cambiar para que el video ocupe el ancho completo del viewport.

Archivo: `apps/frontend/src/components/modulos/UnitStoriesPlayer.tsx`

- El wrapper del bloque debe ser `w-full` sin padding horizontal para videos
- Los text_blocks / quiz / reflection siguen con padding normal
- Video se sirve del `aspect-video w-full` del `VideoBlockView` → altura = ancho * 9/16

Cambio: agregar padding condicional en el wrapper según `block.block_type`:

```tsx
const isVideo = block.block_type.startsWith("video_");
<div className={isVideo ? "w-full" : "px-4 py-6"}>
  <BlockRenderer block={block} ... />
</div>
```

O aún mejor: cada block-view internamente decide su padding · el wrapper del stories player no impone.

### Criterios
- [x] Video block ocupa el ancho completo del viewport mobile
- [x] Text/quiz/reflection blocks mantienen padding de lectura
- [~] Sin regresión visual en desktop (smoke — player-06)
- [x] Commit: `refactor(player): remove padding wrapper for video blocks in stories player`

**Notas:** el wrapper del bloque en `UnitStoriesPlayer` ahora es condicional:
video → `relative z-0 w-full` (sin `max-w-md`/`px-6`/`py-6`), el resto mantiene
`mx-auto max-w-md px-6 py-6`. Las tap-zones de nav prev/next (left/right 15%,
`z-10`) quedan por encima del tap-zone del video (`z-[1]` dentro del bloque),
así que left/right navegan y el centro hace play/pause. Long-press para pausar
auto-advance sigue funcionando (bubbling). tsc/eslint/tests verdes.

---

## TASK player-03 · Adaptar layout del bloque en `<UnitBackToBackPlayer/>` desktop · `[x]`

Similar a TASK 02 pero para el desktop back-to-back player. El panel izquierdo tiene 60% del ancho · el video block llena ese 60% al 100% (con aspect-video calculando la altura).

### Criterios
- [x] Video llena el ancho del panel 60% en desktop
- [x] Sin padding entre el edge del panel y el video
- [x] Text/quiz/reflection blocks mantienen padding
- [x] Commit: `refactor(player): full-bleed video block in back-to-back desktop`

**Notas:** panel izquierdo condicional en `UnitBackToBackPlayer`: video →
`self-start overflow-hidden rounded-lg bg-black` (sin `p-8`/borde, el video
`aspect-video w-full` llena el ancho del panel `1fr`; `self-start` evita que
se estire al alto de la columna del índice). Text/quiz/reflection mantienen
`border p-8 bg-bg-raised`. tsc/eslint limpios (no hay tests de este componente).

---

## TASK player-04 · Verificar autoplay policies · `[ ]`

Diferencias importantes por browser:

- **Chrome desktop + Android:** autoplay muted funciona sin user gesture. `videoRef.play()` promete y resuelve OK.
- **Safari iOS:** autoplay muted requiere `playsInline` en el `<video>` · si no está, se abre fullscreen. **Ya incluido en TASK 01.**
- **Safari macOS:** autoplay muted OK con user gesture previo en la sesión · si no, `play()` puede rechazar → cae a estado "ready" con botón play manual.
- **Firefox:** políticas más restrictivas · autoplay muted funciona pero user puede desactivarlo global.

Verificación cross-browser:
- Chrome desktop: entrar a un módulo con video → autoplay muted OK · botón unmute aparece
- Chrome Android: mismo
- Safari iOS 17+: autoplay muted OK · `playsInline` previene fullscreen · unmute tap funciona
- Safari macOS: autoplay muted OK si hubo gesture previo · sino play manual

Test manual con `--force-prefers-reduced-motion` (Chrome DevTools) → autoplay NO se ejecuta · estado "ready" con botón play.

### Criterios
- [ ] Verificado en 4 browsers (Chrome desktop/Android, Safari iOS/macOS)
- [ ] `playsInline` presente
- [ ] Reduced motion respetado
- [ ] Documentar comportamiento por browser en el commit
- [ ] Commit: `test(player): verify autoplay policies cross-browser`

---

## TASK player-05 · Progress bar del stories player NO tape el video · `[ ]`

El stories player tiene una progress bar top (segmentada por block). Actualmente puede tapar la parte superior del video full-bleed.

Fix:
- El video en stories mobile tiene un `padding-top` mínimo del contenedor stories = altura del progress bar top (~20px + safe area top)
- O el progress bar del stories tiene `pointer-events-none` y `bg-transparent` → los segmentos son solo líneas overlay
- O aún mejor: `position: absolute; top: 0` sobre el video con altura de 4px y opacity 0.7 → se mezcla sutil

Decisión: **overlay transparente z-10** sobre el video (no ocupa espacio en el layout).

### Criterios
- [ ] Progress bar top no ocupa altura vertical
- [ ] Se ve sobre el video pero no lo tapa (opacity blend)
- [ ] Commit: `fix(player): stories progress bar overlays video without taking space`

---

## TASK player-06 · Tests + smoke + screenshots · `[ ]`

### Tests unitarios

Actualizar `VideoBlockView.test.tsx`:
- Autoplay se llama on IntersectionObserver entry
- Autoplay NO se llama si `useShouldAnimate` retorna false
- Tap central llama `play()` si pausado y `pause()` si playing
- `onEnded` marca completed y muestra replay
- Botón unmute setea `videoRef.current.muted = false`
- Progress bar scrub actualiza `currentTime`
- Keyboard: espacio toggle · flechas +/- 5s · M mute toggle

Mock `HTMLMediaElement.play/pause/load` (ya está en setup.ts según nota previa).

### Smoke manual

Login collab1 → `/modulos/[slug]` con video block:

- Mobile: video ocupa el ancho completo · autoplay muted · botón unmute aparece · tap pausa · progress bar visible bottom
- Desktop: video llena panel 60% · mismo comportamiento
- Ended → botón replay + block marked completed
- Reduced motion (Chrome DevTools) → no autoplay · botón play centrado

### Screenshots

```
docs/screenshots/player-tiktok/
├── 01-mobile-playing-fullbleed.png
├── 02-mobile-paused-play-overlay.png
├── 03-mobile-unmute-hint.png
├── 04-mobile-ended-replay.png
├── 05-desktop-panel-60pct.png
├── 06-progress-bar-scrub.png
├── 07-reduced-motion-no-autoplay.png
```

### Criterios
- [ ] Tests unitarios verdes
- [ ] 7 screenshots
- [ ] Cross-browser verificado (TASK 04)
- [ ] Commit: `test(player): unit tests + 7 screenshots + cross-browser notes`

---

# 🎯 Criterios globales

- [ ] Video llena aspect-video 16:9 del div padre sin bordes
- [ ] Autoplay muted + unmute hint prominente
- [ ] UI overlay minimalista (progress + timer + play/pause)
- [ ] Sin `<video controls>` nativo
- [ ] `playsInline` para iOS
- [ ] Reduced motion respetado
- [ ] Auto-mark completed on ended
- [ ] Tests + 7 screenshots
- [ ] PR contra `main`

# 📤 Entrega

- SHA + PR
- 7 screenshots + video corto (bonus) del flow mobile
- Nota cross-browser (4 browsers)

# 🔴 Fuera de scope

- PIP mode
- Fullscreen viewport button (el div ya ES el "fullscreen" del contenido)
- Volume slider (solo mute/unmute)
- Playback rate control (defer)
- Captions/subtítulos UI (schema los soporta pero UI no critical MVP)
- Analytics de watch% granular (deferrable a Fase 2)

---

# Status por TASK

| ID | Subject | Status |
|---|---|---|
| player-01 | Rediseñar VideoBlockView full-bleed | `[x]` |
| player-02 | Layout stories player mobile | `[x]` |
| player-03 | Layout back-to-back desktop | `[x]` |
| player-04 | Autoplay policies cross-browser | `[ ]` |
| player-05 | Progress bar top no tape video | `[ ]` |
| player-06 | Tests + screenshots | `[ ]` |
