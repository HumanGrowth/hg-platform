# Video player · autoplay & cross-browser (TASK player-04)

El `VideoBlockView` (player TikTok-style full-bleed) hace **autoplay muted** al
entrar el bloque en viewport (`IntersectionObserver`, threshold 0.5). Notas de
comportamiento por browser y las garantías a nivel de código.

## Garantías a nivel de código (verificables en CI)

- **`muted` + `playsInline`** en el `<video>` — requisito de las políticas de
  autoplay (sin ellos, iOS Safari abre fullscreen o rechaza el play).
- **`safePlay()`** envuelve `video.play()` en un `.catch()`: si el browser
  rechaza el autoplay (sin gesto previo, política restrictiva), el player cae a
  estado **`ready`** con botón play manual central — nunca queda "colgado".
- **`prefers-reduced-motion`** (vía `useShouldAnimate`) **desactiva el autoplay**
  y el **auto-hide** de controles. Cubierto por unit test
  (`VideoBlockView.test.tsx`: "does NOT autoplay under reduced motion").
- **Sin `<video controls>` nativo, sin fullscreen/portal** → no depende del
  chrome nativo de cada browser.

## Comportamiento esperado por browser

| Browser | Autoplay muted | Notas |
|---|---|---|
| **Chrome desktop** | ✅ sin gesto | `play()` resuelve; aparece el hint de unmute. |
| **Chrome Android** | ✅ sin gesto | Igual que desktop; `playsInline` evita fullscreen. |
| **Safari iOS 17+** | ✅ con `muted`+`playsInline` | **Sin `playsInline` abriría fullscreen** — por eso es obligatorio. Unmute por tap del usuario. |
| **Safari macOS** | ✅ (muted) | El autoplay muted está permitido; si una política del usuario lo bloquea, `safePlay` cae a `ready`. |
| **Firefox** | ✅ muted (default) | El usuario puede desactivar autoplay globalmente → cae a `ready` con play manual. |

## Verificación

- **Automatizada (CI / este entorno)**: `playsInline` presente, autoplay
  gateado por reduced motion, fallback a `ready` — cubiertos por unit tests +
  `next build`.
- **Manual (pendiente, requiere devices reales)**: Chrome desktop, Chrome
  Android, Safari iOS 17+, Safari macOS. **No verificable en este entorno**
  (sin browser automation ni devices/simuladores) — mismo límite honesto que
  las tasks previas (polish-01/B-02). El diseño (muted + playsInline + fallback)
  sigue las políticas documentadas de cada browser.
- **Reduced motion**: en Chrome DevTools → `Rendering → Emulate CSS
  prefers-reduced-motion: reduce` → el video NO hace autoplay, muestra el botón
  play central.
