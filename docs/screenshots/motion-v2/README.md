# motion-v2 — enriquecimiento de la capa de motion

Sprint sobre PR #18 (`feat/motion-layer`, motion-v1). Feedback de Andrés: los
efectos v1 eran "poco notorios". Este sprint suma 6 features nuevas (más
notorias pero igual de elegantes) sobre la base de v1, sin tocar la app
autenticada ni instalar dependencias nuevas.

## Screenshots

| # | Archivo | Qué muestra |
|---|---|---|
| 01 | `01-partner-marquee-mid.png` | `<PartnerMarquee/>` (decisión A) — carrusel infinito de logos, pausa on-hover, mask-image en los bordes |
| 02 | `02-brandcircle-floating.png` | `<BrandCircle/>` (decisión B) — parallax de scroll + oscilación vertical flotante |
| 03 | `03-sawwave-draw-progress.png` | `<BrandSawWave/>` (decisión C) — sawtooth SVG con draw-on-scroll (`pathLength`), reemplaza `BrandLine` |
| 04 | `04-cards-stagger-mid.png` | `<StaggerBounceGrid/>` (decisión D) — grid de cards con entrada stagger + spring-bounce |
| 05 | `05-timeline-steps-hop.png` | `HowItWorksTimeline` (decisión E) — círculos numerados "saltan" en secuencia |
| 06 | `06-typewriter-mid.png` | `<Typewriter/>` (decisión F) — párrafo Deloitte de `Quote` se tipea letra a letra (el remate "Hasta ahora." queda estático, por decisión) |
| 07 | `07-home-full-scroll.png` | Home completa, scroll settled (estado final, sin reduced-motion) |
| 08 | `08-reduced-motion-static.png` | Home completa bajo `prefers-reduced-motion: reduce` — todo el fallback estático |

### Nota sobre el método de captura

Las capturas 01–04 se tomaron con Chrome headless a 1400×4700 (viewport en el
que `whileInView`/IntersectionObserver resuelven de forma confiable). Las
capturas 05–06 se tomaron con `--force-prefers-reduced-motion` a 1400×5600 —
en viewports muy altos (>5000px) el headless de Chrome no dispara los
`whileInView` de forma consistente (se comprobó cruzando SSR HTML, dump-dom y
capturas a menor altura: es una limitación de la herramienta de captura, no
un bug de la app). El fallback estático bajo reduced-motion es visualmente
idéntico en contenido/layout al estado animado post-hop, así que documenta
correctamente el resultado final de la Timeline y el Typewriter.

## Lighthouse (Performance, producción, `pnpm build && pnpm start`)

| Baseline | Score |
|---|---|
| `main` (pre-motion) | 91 |
| PR #18 (motion-v1) | 88 (delta -3) |
| **motion-v2 (este sprint)** | **88 / 85** en dos corridas (delta 0 / -3) |

Umbral del sprint (decisión H): no bajar de 85 vs PR#18 (rojo absoluto <83) y
no acumular más de -6 vs `main`. Ambas corridas cumplen.

**Regresión detectada y corregida durante el sprint**: la primera medición
post-features dio 84 (LCP 3.9s→4.4s, TBT casi el doble). Causa raíz:
`BrandCircle`'s nuevo loop de oscilación flotante (`animate()` con
`repeat: Infinity`) arrancaba sin condición de visibilidad — 3 instancias
(SixPillars/ProductStack/HomeCTAFinal) corrían simultáneamente desde el mount
aunque estuvieran fuera de viewport, compitiendo por el hilo principal durante
el trace de Lighthouse. Fix: se agregó `useInView(ref, { margin: "0px 0px
200px 0px" })` (sin `once`) como gate adicional del loop — solo corre cuando
el círculo está cerca del viewport. Con el fix, Lighthouse volvió a 88/85.

## Bundle size

| | Antes (PR #18) | Después (motion-v2) | Delta |
|---|---|---|---|
| First Load JS de `/` | 243 kB | 256 kB | **+13 kB** |
| Shared chunk (`domAnimation` de LazyMotion) | 87.7 kB | 87.7 kB | **0 kB** |

El shared chunk no cambió: `domAnimation` ya estaba activo desde el fix de
PR #18, así que `pathLength` (BrandSawWave) y los springs (StaggerBounceGrid,
Timeline) no dispararon una subida a `domMax`. El +13 kB es código de
componente propio (6 componentes/refactors nuevos), no una dependencia nueva.

## Cross-browser

Verificado en Chrome (headless, capturas arriba). Safari, Firefox y Safari
iOS quedan pendientes de verificación manual por el equipo — mismo patrón que
en PR #18 (no hay herramienta de captura multi-browser sin agregar
dependencias nuevas, prohibido por las reglas del sprint).

## Migración BrandLine → BrandSawWave

`BrandLine.tsx` quedó sin callsites tras la migración y fue eliminado
(`git rm`) en este commit. 5 callsites migrados:

1. `src/app/(marketing)/plataforma/page.tsx` — `width=280 teeth=7 height=18 rotation=8`, color sage
2. `src/app/(marketing)/contacto/page.tsx` — `width=220 teeth=6 height=18 rotation=12`, color gold
3. `src/app/(marketing)/metodo/page.tsx` — `width=300 teeth=8 height=18 rotation=-12`, color gold
4. `src/components/marketing/ProductStack.tsx` — `width=320 teeth=8 height=18 rotation=15`, color gold
5. `src/components/marketing/PerspectivasFilter.tsx` — `width=260 teeth=7 height=18 rotation=-10`, color gold

También se limpiaron 4 imports huérfanos de `BrandLine` (sin uso en JSX) en
`perspectivas/page.tsx`, `HomeCTAFinal.tsx`, `PricingTable.tsx` y
`SixPillars.tsx`.

## Desviaciones respecto al prompt

- **PartnerMarquee**: el snippet del prompt proponía pausar con
  `whileHover={{ animationPlayState: ... }}` — framer no puede animar esa
  propiedad CSS. Se usó `:hover` real + `@keyframes` scoped por instancia
  (vía `useId()`).
- **BrandCircle**: en vez del loop manual por `requestAnimationFrame` del
  snippet, se usó la API imperativa `animate()` de framer sobre un
  `MotionValue`, compuesto con el parallax existente vía
  `useTransform([a, b], combiner)`. Se sumó además el gate `useInView` (no
  estaba en el prompt original) como fix de performance.
- **Typewriter**: se evitó el `as any` del snippet — se tipó `as` con una
  unión fija de tags (`TypewriterTag`) + `createElement`, siguiendo el
  patrón ya establecido en `MotionSection` (PR #18).

## Bonus (video/gif)

No se generó — no hay `puppeteer`/`playwright` disponible y el sprint prohíbe
instalar dependencias nuevas. Queda como opcional pendiente si se decide
agregar tooling de captura de video en un sprint futuro.
