# Prompt Claude Code · Motion layer v2 · enrichment

> **Modo recomendado:** `/effort high` con **Claude Opus 4.8**.
> Enriquecer capa motion existente (PR #18) con 7 animaciones más visibles. **7 TASKs · ~6-9h**.
> Base: `main` con PR #18 (motion base) mergeado.
> Rama: `feat/motion-v2-enrichment`.

---

## ⚙️ Resume protocol

1. Releé este prompt.
2. Releé `docs/prompts/claude-code_motion_layer.md` (v1 base).
3. `git status && git log --oneline -10 && cd apps/frontend && pnpm typecheck`
4. Reanudá desde el primer `[ ]`.

## 🧱 Reglas duras

- Un commit por TASK · prefijo `feat(motion-v2): ...` / `refactor(motion-v2): ...`
- Editá ESTE archivo al avanzar
- **NO tocar app autenticada** (`(app)`, `(admin)`, `(auth)`, `(onboarding)`)
- **NO instalar dependencias nuevas** (framer-motion ya está)
- **`prefers-reduced-motion` obligatorio** — cada nueva animación con su fallback estático explícito
- **Solo animar `transform`, `opacity`, `strokeDashoffset`, `strokeDasharray`** (allowlist)
- **LazyMotion strict conservado**: seguir usando `m.*` en vez de `motion.*` — bundle budget crítico
- **Feature bundle**: si necesitás spring/pathLength, cargar `domAnimation` (no `domMax`). Mide el delta antes/después
- **Cada componente motion → `"use client"`** en top

## 🎯 Objetivo funcional

Andrés reporta que los efectos actuales son "poco notorios". Sumar visibilidad **manteniendo la estética elegante** (nada llamativo, nada agresivo). El brief NO cambia: sutil pero perceptible al scroll.

## 🧠 Decisiones firmadas Andrés (post PR #18)

| # | Decisión |
|---|---|
| A | **Partners:** carrusel lateral infinito (marquee) con pause on hover |
| B | **BrandCircle:** floating vertical (oscilación) además del parallax existente |
| C | **BrandLine:** cambiar a **sawtooth** SVG (`/\/\/\`) inspirado en el mosaic + draw-on-scroll (`strokeDashoffset`) |
| D | **Tarjetas:** stagger entrance con spring bounce (una tras otra al entrar en viewport) |
| E | **Steps HowItWorks:** hop animation staggered (saltan uno tras otro) |
| F | **Quote "por qué":** typewriter effect letter-by-letter |
| G | Alcance sigue siendo **solo marketing** |
| H | Bundle budget: Lighthouse Performance NO puede bajar >3 puntos vs PR #18 (que ya perdió -3 vs baseline). Total acumulado ≤ -6 vs main pre-motion |

---

# TASKS

## TASK motion-v2-01 · `<PartnerMarquee/>` carrusel lateral infinito · `[x]`

Marquee horizontal con los logos de partners deslizándose continuamente. Pause on hover.

### 1.1 · Componente

Archivo: `src/components/motion/PartnerMarquee.tsx`

```tsx
"use client";

import { m } from "framer-motion";
import type { ReactNode } from "react";

interface PartnerMarqueeProps {
  children: ReactNode[];         // items del marquee (logos)
  speed?: number;                // segundos para completar 1 ciclo · default 30
  direction?: "left" | "right";
  pauseOnHover?: boolean;        // default true
}

export function PartnerMarquee({
  children,
  speed = 30,
  direction = "left",
  pauseOnHover = true,
}: PartnerMarqueeProps) {
  // Duplicar children para loop infinito seamless
  const duplicated = [...children, ...children];
  const distance = direction === "left" ? "-50%" : "50%";

  return (
    <div
      className="overflow-hidden relative w-full [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]"
      role="region"
      aria-label="Partners"
    >
      <m.div
        className="flex gap-16 w-max"
        animate={{ x: [0, distance] }}
        transition={{
          duration: speed,
          repeat: Infinity,
          ease: "linear",
        }}
        whileHover={pauseOnHover ? { animationPlayState: "paused" } : undefined}
      >
        {duplicated.map((child, i) => (
          <div key={i} className="shrink-0 flex items-center">
            {child}
          </div>
        ))}
      </m.div>
    </div>
  );
}
```

### 1.2 · Reduced motion fallback

Si `useShouldAnimate()` retorna `false`, renderizar un grid estático 3xN de los logos originales (sin marquee, sin duplicación).

### 1.3 · Wire en `<PartnerStrip/>` o donde estén los partners hoy

Ubicar el componente que renderiza los logos de empresas del home. Wrappearlo con `<PartnerMarquee>`.

### Criterios
- [ ] Marquee loop seamless (sin salto al reiniciar)
- [ ] Pause on hover funcional
- [ ] Mask gradient a los costados (fade in/out)
- [ ] Reduced motion → grid estático
- [ ] Commit: `feat(motion-v2): PartnerMarquee with infinite loop`

---

## TASK motion-v2-02 · `<BrandCircle/>` refactor · parallax + floating oscillation · `[x]`

Sumar oscilación vertical continua al parallax existente. **Combinar ambas transforms.**

### 2.1 · Editar `src/components/motion/BrandCircle.tsx`

Framer-motion permite componer motion values. Pattern:

```tsx
"use client";

import { m, useScroll, useTransform, useMotionValue, useMotionTemplate } from "framer-motion";
import { useEffect, useRef } from "react";
import { useShouldAnimate } from "@/lib/motion/useShouldAnimate";

interface BrandCircleProps {
  size: number;
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
  color?: string;
  opacity?: number;
  speed?: number;
  floatAmplitude?: number;        // px de oscilación · default 8
  floatDuration?: number;         // segundos para 1 ciclo · default 6
  zIndex?: number;
}

export function BrandCircle({
  size,
  top,
  left,
  right,
  bottom,
  color = "var(--hg-green-100)",
  opacity = 0.5,
  speed = 0.15,
  floatAmplitude = 8,
  floatDuration = 6,
  zIndex = -1,
}: BrandCircleProps) {
  const shouldAnimate = useShouldAnimate();
  const ref = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const parallaxY = useTransform(scrollYProgress, [0, 1], [`${-speed * 100}px`, `${speed * 100}px`]);
  const floatY = useMotionValue(0);

  useEffect(() => {
    if (!shouldAnimate) return;
    const controls = { start: 0 };
    const start = Date.now();
    let raf = 0;
    const tick = () => {
      const t = (Date.now() - start) / 1000;
      const value = Math.sin((t / floatDuration) * Math.PI * 2) * floatAmplitude;
      floatY.set(value);
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [floatY, floatAmplitude, floatDuration, shouldAnimate]);

  // Componer parallax + float con useMotionTemplate
  const y = useMotionTemplate`calc(${parallaxY} + ${floatY}px)`;

  const baseStyle: React.CSSProperties = {
    position: "absolute",
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: "50%",
    background: color,
    opacity,
    top, left, right, bottom, zIndex,
    pointerEvents: "none",
  };

  if (!shouldAnimate) return <div aria-hidden style={baseStyle} ref={ref} />;

  return <m.div aria-hidden style={{ ...baseStyle, y }} ref={ref} />;
}
```

**⚠️ Alternativa simpler:** si el pattern `useMotionTemplate` con `calc()` complica, hacer 2 divs anidados — outer con parallax, inner con `animate={{ y: [0, -8, 0] }}`.

### Criterios
- [ ] Circle oscila arriba-abajo continuamente (sin scroll también)
- [ ] Parallax preservado
- [ ] Reduced motion → estático
- [ ] Sin memory leaks (rAF cancelado en cleanup)
- [ ] Commit: `refactor(motion-v2): BrandCircle parallax + floating oscillation`

---

## TASK motion-v2-03 · `<BrandSawWave/>` reemplaza `<BrandLine/>` · SVG sawtooth + draw-on-scroll · `[x]`

Andrés quiere reemplazar las líneas rectas por sawtooth (`/\/\/\`) inspirado en el mosaic pattern. La onda se dibuja progresivamente al scrollear (draw-on-scroll con `strokeDashoffset`).

### 3.1 · Nuevo componente

Archivo: `src/components/motion/BrandSawWave.tsx`

```tsx
"use client";

import { m, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { useShouldAnimate } from "@/lib/motion/useShouldAnimate";

interface BrandSawWaveProps {
  width: number;                  // px
  height?: number;                // px · amplitud · default 24
  teeth?: number;                 // cantidad de dientes · default 8
  thickness?: number;             // default 2
  rotation?: number;              // deg
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
  color?: string;                 // default var(--hg-gold)
  opacity?: number;               // default 0.5
  speed?: number;                 // parallax · default 0.1
  zIndex?: number;                // default -1
}

/** Genera el path SVG para una onda sawtooth /\/\/\ */
function sawtoothPath(width: number, height: number, teeth: number): string {
  const step = width / teeth;
  const half = step / 2;
  let d = `M 0 ${height / 2}`;
  for (let i = 0; i < teeth; i++) {
    const x1 = i * step + half;
    const x2 = (i + 1) * step;
    d += ` L ${x1} 0 L ${x2} ${height / 2}`;
  }
  return d;
}

export function BrandSawWave({
  width,
  height = 24,
  teeth = 8,
  thickness = 2,
  rotation = 0,
  top,
  left,
  right,
  bottom,
  color = "var(--hg-gold)",
  opacity = 0.5,
  speed = 0.1,
  zIndex = -1,
}: BrandSawWaveProps) {
  const shouldAnimate = useShouldAnimate();
  const ref = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  // Draw-on-scroll: pathLength va de 0 a 1 según scrollYProgress
  const pathLength = useTransform(scrollYProgress, [0, 0.5], [0, 1]);
  const parallaxY = useTransform(scrollYProgress, [0, 1], [`${-speed * 80}px`, `${speed * 80}px`]);

  const path = sawtoothPath(width, height, teeth);

  const wrapperStyle: React.CSSProperties = {
    position: "absolute",
    width: `${width}px`,
    height: `${height}px`,
    transform: `rotate(${rotation}deg)`,
    transformOrigin: "center",
    top, left, right, bottom, zIndex,
    pointerEvents: "none",
    opacity,
  };

  if (!shouldAnimate) {
    return (
      <div aria-hidden style={wrapperStyle} ref={ref}>
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
          <path d={path} stroke={color} strokeWidth={thickness} fill="none" />
        </svg>
      </div>
    );
  }

  return (
    <m.div aria-hidden ref={ref} style={{ ...wrapperStyle, y: parallaxY }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <m.path
          d={path}
          stroke={color}
          strokeWidth={thickness}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ pathLength }}
        />
      </svg>
    </m.div>
  );
}
```

### 3.2 · Feature bundle · verificar impacto

`pathLength` requiere `domAnimation` feature bundle en LazyMotion (el `domMini` actual no lo soporta). Cambiar en el `MotionConfig`/`LazyMotion` wrapper:

```tsx
import { LazyMotion, domAnimation } from "framer-motion";

<LazyMotion features={domAnimation} strict>...</LazyMotion>
```

**Medir bundle size antes y después de este cambio.** Documentar delta en el commit. Si el aumento > 8KB, evaluar alternativas (CSS `stroke-dashoffset` con `@scroll-timeline` como fallback progresivo).

### 3.3 · Migrar callsites `<BrandLine/>` → `<BrandSawWave/>`

Grep `BrandLine` en `src/`. En cada uso, decidir:
- Si la línea es decorativa "de acento" → migrar a `BrandSawWave`
- Si era un separador funcional (nunca fue el caso hasta ahora) → dejar

Mantener `BrandLine.tsx` en el árbol pero marcar con JSDoc `@deprecated use BrandSawWave` — el cleanup final va en TASK 07.

### Criterios
- [ ] SVG sawtooth renderiza correctamente
- [ ] Draw-on-scroll visible (empieza en 0, completa a 1 en la primera mitad del recorrido)
- [ ] Parallax preservado
- [ ] Reduced motion → sawtooth estático dibujado completo
- [ ] Bundle delta documentado
- [ ] Commit: `feat(motion-v2): BrandSawWave with SVG draw-on-scroll (replaces BrandLine)`

---

## TASK motion-v2-04 · Card stagger bounce entrance · `[x]`

Andrés: "Las tarjetas deben de subir una tras otra y rebotar al igual que las imágenes de en vivo".

Interpretación: cards de una sección (SixPillars, WhatIsHg, ProductStack cards, `/plataforma` features) entran una tras otra con spring bounce.

### 4.1 · Componente `<StaggerBounceGrid/>`

Archivo: `src/components/motion/StaggerBounceGrid.tsx`

```tsx
"use client";

import { m, type Variants } from "framer-motion";
import type { ReactNode } from "react";
import { useShouldAnimate } from "@/lib/motion/useShouldAnimate";

interface StaggerBounceGridProps {
  children: ReactNode[];
  className?: string;
  itemDelay?: number;             // default 0.08s por card
  bounce?: number;                // default 0.4 (0=lineal, 1=elástico)
}

const containerVariants: Variants = {
  hidden: {},
  visible: (custom: number) => ({
    transition: { staggerChildren: custom },
  }),
};

const itemVariants: Variants = {
  hidden: { y: 40, opacity: 0 },
  visible: (bounce: number) => ({
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      bounce,
      duration: 0.6,
    },
  }),
};

export function StaggerBounceGrid({
  children,
  className,
  itemDelay = 0.08,
  bounce = 0.4,
}: StaggerBounceGridProps) {
  const shouldAnimate = useShouldAnimate();

  if (!shouldAnimate) {
    return <div className={className}>{children}</div>;
  }

  return (
    <m.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "0px 0px -15% 0px" }}
      variants={containerVariants}
      custom={itemDelay}
    >
      {children.map((child, i) => (
        <m.div key={i} variants={itemVariants} custom={bounce}>
          {child}
        </m.div>
      ))}
    </m.div>
  );
}
```

### 4.2 · Wire en las secciones con grid de cards

- SixPillars grid → wrappear los 6 items
- WhatIsHg (3 cards) → wrappear
- `/plataforma` features (6 cards) → wrappear
- HomeCTAFinal si tiene múltiples cards → wrappear

**No wrappear el `<MotionSection/>` que ya tenían.** El stagger va **dentro** del section (que ya hace fade+slide de la sección entera).

### 4.3 · Requiere `domAnimation` feature

Spring necesita `domAnimation` (ya migrado en TASK 03).

### Criterios
- [ ] Cards suben con bounce en secuencia
- [ ] Delay ~80ms entre cada card
- [ ] Reduced motion → aparecen todas a la vez sin transform
- [ ] Sin flicker en primera render
- [ ] Commit: `feat(motion-v2): StaggerBounceGrid on card sections`

---

## TASK motion-v2-05 · Steps HowItWorksTimeline · hop animation · `[x]`

Andrés: "Los pasos en 'como funciona' deben saltar uno después del otro".

Interpretación: los 4 números circulares del timeline "hopean" (saltan levemente hacia arriba y vuelven) en secuencia al entrar en viewport.

### 5.1 · Editar `HowItWorksTimeline.tsx`

Reemplazar los `<div/>` de los números circulares por `<m.div>` con variants:

```tsx
const hopVariants: Variants = {
  hidden: { y: 0, opacity: 0 },
  visible: (index: number) => ({
    y: [0, -12, 0],
    opacity: 1,
    transition: {
      delay: index * 0.15,
      y: {
        type: "spring",
        bounce: 0.5,
        duration: 0.7,
      },
      opacity: { duration: 0.2, delay: index * 0.15 },
    },
  }),
};
```

Wrappear los círculos con `<m.div variants={hopVariants} custom={index} whileInView="visible" initial="hidden" viewport={{once: true}}>`.

**Alternativa:** el `<MotionSection>` que envuelve el timeline puede orquestar el stagger con `staggerChildren` en su config. Pero los números circulares están dentro de `<li/>` items, no directamente hijos del section. Aplicar variants directas a cada círculo.

### 5.2 · Text y body de cada step

Sumar `fadeIn` con delay coordinado al hop. El texto aparece **después** del hop del número circular (delay + 0.2s).

### Criterios
- [ ] Los 4 números "hopean" con spring bounce en secuencia (~150ms delay entre cada uno)
- [ ] Text de cada step aparece después del hop del número
- [ ] Reduced motion → aparecen estáticos
- [ ] Sin regresión mobile (el layout stack vertical debe respetar el hop también)
- [ ] Commit: `feat(motion-v2): HowItWorksTimeline steps hop stagger`

---

## TASK motion-v2-06 · Quote "por qué" · typewriter effect · `[ ]`

Andrés: "El texto del por qué debe escribirse tipo typewriter".

Interpretación: el copy Deloitte del componente `<Quote/>` se escribe letra por letra cuando entra en viewport.

### 6.1 · Componente `<Typewriter/>`

Archivo: `src/components/motion/Typewriter.tsx`

```tsx
"use client";

import { useAnimate, useInView } from "framer-motion";
import { useEffect, useRef } from "react";
import { useShouldAnimate } from "@/lib/motion/useShouldAnimate";

interface TypewriterProps {
  text: string;
  speed?: number;         // ms por caracter · default 20
  delay?: number;         // ms antes de arrancar · default 0
  className?: string;
  as?: keyof HTMLElementTagNameMap;
  keepCursor?: boolean;   // muestra cursor blinking después · default true
}

export function Typewriter({
  text,
  speed = 20,
  delay = 0,
  className,
  as = "span",
  keepCursor = true,
}: TypewriterProps) {
  const shouldAnimate = useShouldAnimate();
  const ref = useRef<HTMLElement | null>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -10% 0px" });

  useEffect(() => {
    if (!shouldAnimate || !inView || !ref.current) return;

    const el = ref.current;
    el.textContent = "";
    let i = 0;
    let raf = 0;
    let last = 0;

    const timer = setTimeout(() => {
      const tick = (now: number) => {
        if (i >= text.length) return;
        if (now - last >= speed) {
          el.textContent = text.slice(0, ++i);
          last = now;
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, delay);

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [inView, text, speed, delay, shouldAnimate]);

  const Tag = as as any;

  // Reduced motion o SSR: renderiza el texto completo desde el arranque
  if (!shouldAnimate) {
    return <Tag ref={ref} className={className}>{text}</Tag>;
  }

  return (
    <Tag
      ref={ref}
      className={className}
      aria-label={text}   // ← screen reader lee el texto completo, no letra por letra
    >
      {""}
    </Tag>
  );
}
```

### 6.2 · Wire en `Quote.tsx`

El componente Quote (Deloitte) tiene 2 párrafos + remate "Hasta ahora." + firma. Aplicar typewriter solo al primer párrafo:

```tsx
<Typewriter
  as="p"
  text={c.quote.p1}
  speed={15}
  className="text-xl md:text-2xl font-heading"
/>
```

**NO typewriteear:**
- El remate "Hasta ahora." (mantener como aparece con weight bold, sin animación letra por letra — quedaría raro)
- La firma
- La fuente

### 6.3 · Cursor blinking opcional

Si `keepCursor=true`, sumar `::after` CSS con `content: "|"` + `animation: blink 1s infinite` que aparece cuando el typewriter termina. Toggle con estado local `done` en el componente.

### 6.4 · A11y

- `aria-label` con el texto completo → screen readers lo leen entero
- El elemento visible arranca vacío pero el label lo cubre
- Sin motion → texto completo desde SSR (SEO OK)

### Criterios
- [ ] Primer párrafo del Quote se escribe letra por letra
- [ ] Speed configurable (default 15-20ms per char)
- [ ] Screen readers leen el texto completo
- [ ] Sin motion → texto completo estático
- [ ] Sin FOUC/flicker
- [ ] Commit: `feat(motion-v2): Typewriter effect on Quote p1`

---

## TASK motion-v2-07 · Tests + performance re-check + cleanup + screenshots · `[ ]`

### 7.1 · Tests

- Test `PartnerMarquee` renderiza duplicados correctamente
- Test `Typewriter` con reduced motion renderiza texto completo
- Test `StaggerBounceGrid` propaga variants a children
- Test `BrandSawWave` genera path correcto para `teeth=8, width=200, height=24`

### 7.2 · Performance re-check

Correr Lighthouse local en Home post-cambios. Comparar contra baseline PR #18 (Performance 88).

- **Máximo aceptable:** Performance ≥85 (delta -3 sobre PR #18)
- **Absoluto rojo:** Performance ≥83 (delta -6 vs main pre-motion)
- Si baja más:
  - Verificar que LazyMotion sigue en `strict` mode
  - Reducir cantidad de elementos animados
  - Cambiar `Typewriter` speed a menor (menos rAF calls)
  - Considerar CSS animation en vez de framer para el marquee

Documentar en el commit / PR el score final.

### 7.3 · Cleanup

- Eliminar `BrandLine.tsx` (o marcarlo con `@deprecated · replaced by BrandSawWave`) si no queda ningún callsite
- Actualizar exports en `src/components/motion/index.ts` (si existe)

### 7.4 · Screenshots + video corto

```
docs/screenshots/motion-v2/
├── 01-partner-marquee-mid.png         (marquee en movimiento capturado)
├── 02-brandcircle-floating.png        (múltiples circles con float)
├── 03-sawwave-draw-progress.png       (sawtooth siendo dibujada al scroll)
├── 04-cards-stagger-mid.png           (cards apareciendo en secuencia)
├── 05-timeline-steps-hop.png          (números hopeando)
├── 06-typewriter-mid.png              (texto siendo escrito)
├── 07-home-full-scroll.png            (screenshot full page)
└── 08-reduced-motion-static.png       (todo estático con prefers-reduced-motion)
```

Bonus: **video corto** (5-10s) capturando el scroll del home con las animaciones. GIF o mp4. Guardar en `docs/screenshots/motion-v2/scroll.mp4` (o gif).

### Criterios
- [ ] Tests + typecheck + lint verdes
- [ ] Lighthouse ≥85 (delta -3 vs PR #18)
- [ ] 8 screenshots + 1 video
- [ ] BrandLine eliminado o deprecado
- [ ] Cross-browser (Chrome + Safari + Firefox + Safari iOS)
- [ ] Commit: `test(motion-v2): tests + Lighthouse + 8 screenshots + video`

---

# 🎯 Criterios globales

- [ ] 7 TASKs commiteadas
- [ ] `<PartnerMarquee/>` con loop infinito + pause on hover
- [ ] `<BrandCircle/>` con float + parallax
- [ ] `<BrandSawWave/>` reemplaza BrandLine · SVG draw-on-scroll
- [ ] `<StaggerBounceGrid/>` en secciones con grid de cards
- [ ] `<HowItWorksTimeline/>` steps hop staggered
- [ ] `<Typewriter/>` en primer párrafo del Quote
- [ ] Reduced motion respeta al 100%
- [ ] Bundle budget respetado (Lighthouse ≥85)
- [ ] Tests + 8 screenshots + video
- [ ] PR contra `main`

# 📤 Entrega

- SHA + PR
- 8 screenshots + video
- Lighthouse score final (documentado)
- Bundle size delta (KB)
- Nota cross-browser
- Lista de callsites migrados (BrandLine → BrandSawWave)

---

# 🔴 Fuera de scope

- Motion en app autenticada
- AnimatePresence (page transitions)
- Hero animations complejas (typewriter en H1 se probó · queda rechazado por LCP)
- Scroll-linked video playback (requeriría refactor grande)
- Sound effects

---

# Status por TASK

| ID | Subject | Status |
|---|---|---|
| motion-v2-01 | PartnerMarquee | `[x]` |
| motion-v2-02 | BrandCircle floating + parallax | `[x]` |
| motion-v2-03 | BrandSawWave (reemplaza BrandLine) | `[x]` |
| motion-v2-04 | StaggerBounceGrid on cards | `[x]` |
| motion-v2-05 | HowItWorksTimeline steps hop | `[x]` |
| motion-v2-06 | Typewriter on Quote | `[ ]` |
| motion-v2-07 | Tests + Lighthouse + screenshots | `[ ]` |
