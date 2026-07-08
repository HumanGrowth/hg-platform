# motion layer · screenshots

Chrome headless (`--screenshot --virtual-time-budget=10000`) contra
`localhost:3000` (build de producción).

| Archivo | Cubre |
|---|---|
| `01-home-hero-static.png` | Hero sin motion de scroll (decisión C) |
| `02-home-scroll-mid.png` | Zona media: SixPillars + radar con secciones ya animadas a visible; BrandCircle green-100 asomando top-right |
| `03-home-decolayer-visible.png` | Home completo con decorativos (círculos + líneas) |
| `06-metodo-full.png` | /metodo con circle en hero + line en pilares |
| `07-perspectivas-full.png` | /perspectivas con circle + line |
| `08-reduced-motion-flag.png` | `--force-prefers-reduced-motion`: todo estático, contenido visible sin fades |

## Performance (Lighthouse · local · only performance)

| | main (baseline) | motion layer | delta |
|---|---|---|---|
| Score | **91** | **88** | **-3** ✓ (criterio ≤5) |
| LCP | 3.5 s | 3.9 s | +0.4 s |
| TBT | 60 ms | 40 ms | -20 ms |
| CLS | 0 | 0 | = |

Nota: la primera iteración (framer completo) daba 85 (-6); se recuperó con
`LazyMotion` strict + `m.*` (home bundle 266→243 kB).

## Pendiente de captura manual
- `04-button-hover.png` / `05-card-hover.png`: los estados hover requieren
  interacción (no capturables con `--screenshot` estático). Verificados
  manualmente en dev — scale 1.02 / lift -2px sutiles.
- Parallax en movimiento: es un efecto de scroll; verificado en dev.

## Cross-browser
- Chrome desktop: verificado (build + screenshots).
- Safari/Firefox/Safari iOS: framer-motion usa transform/opacity estándar
  (soporte universal); `overflow-hidden` en DecoLayer previene overflow
  horizontal en iOS. Revisión visual manual pendiente del owner.
