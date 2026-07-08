# Prompt Claude Code · Motion layer marketing (Framer Motion)

> **Modo recomendado:** `/effort high` con **Claude Opus 4.8**.
> Sumar capa de motion + elementos decorativos + parallax a las pages marketing. **8 TASKs · ~7-10h**.
> Base: `main` con PR #16 (v2) + PR #17 (v3 addendum) mergeados. Este PR se apila arriba de un `main` limpio.
> Rama: `feat/motion-layer` (nueva desde `main`).

---

## ⚙️ Resume protocol

1. Releé este prompt.
2. `git status && git log --oneline -10 && cd apps/frontend && pnpm typecheck`
3. Reanudá desde el primer `[ ]`.

## 🧱 Reglas duras

- Un commit por TASK con prefijo `feat(motion): ...` / `chore(motion): ...`
- Editá ESTE archivo al avanzar (status + `[x]`)
- **NO tocar app autenticada** (`(app)`, `(admin)`, `(auth)`, `(onboarding)`)
- **NO modificar tokens DS v2**
- **SÍ instalar `framer-motion`** (aprobado por Andrés · única dep nueva permitida en este PR)
- **`prefers-reduced-motion` obligatorio** — cualquier motion se desactiva si el usuario lo prefiere
- **Solo animar `transform` y `opacity`** (evitar reflow · property allowlist)
- Componentes con hooks de framer-motion → `"use client"` en top del archivo

## 🎯 Objetivo funcional

- Fade + slide leve al entrar en viewport de secciones principales del home (whileInView)
- 2 componentes decorativos reusables (`<BrandCircle/>`, `<BrandLine/>`) con parallax suave
- Hover motion en Button + Card (sutil, no agresivo)
- Estética elegante · no llamativa
- Performance: Lighthouse no baja >5 puntos vs baseline

## 🧠 Decisiones firmadas Andrés

| # | Decisión |
|---|---|
| A | `framer-motion` aprobado como dep nueva (~50KB gzipped) |
| B | Alcance limitado a marketing (NO app autenticada) |
| C | `whileInView` en: SixPillars, MarketingRadar, WhatIsHg, ProductStack, HowItWorksTimeline, Quote, HomeCTAFinal · **NO Hero** (se ve on-load) |
| D | Speed parallax: sutil `0.1-0.2` (elegante · no llamativo) |
| E | Elementos decorativos inspirados en `public/patterns/mosaic.svg` — extraer formas geométricas simples (círculos + líneas) · no importar el SVG entero |

---

# TASKS

## TASK motion-01 · Install framer-motion + MotionConfig global · `[x]`

### 1.1 · Install

```bash
cd apps/frontend
pnpm add framer-motion
pnpm dedupe  # asegurar single instance de framer-motion
```

Verificar en `package.json` que la versión sea `^11.x` o superior.

### 1.2 · MotionConfig global en `layout.tsx`

Wrappear los children con `<MotionConfig reducedMotion="user"/>`:

```tsx
// src/app/layout.tsx (marketing group solo · no root para no afectar app)
```

**Alternativa preferida:** poner `MotionConfig` en `src/app/(marketing)/layout.tsx` para que solo aplique al marketing group. Esto respeta la regla de no tocar app autenticada.

```tsx
"use client";

import { MotionConfig } from "framer-motion";
import type { ReactNode } from "react";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </MotionConfig>
  );
}
```

⚠️ **Si `(marketing)/layout.tsx` ya existe**, sumar `MotionConfig` sin romper lo actual.

### 1.3 · Hook `useShouldAnimate`

Archivo: `src/lib/motion/useShouldAnimate.ts`

```ts
"use client";

import { useReducedMotion } from "framer-motion";

/** Retorna false si el user prefiere reduced motion. Base para todos los motion components. */
export function useShouldAnimate(): boolean {
  const shouldReduce = useReducedMotion();
  return !shouldReduce;
}
```

### Criterios
- [ ] framer-motion instalado + lockfile actualizado
- [ ] MotionConfig wrappea marketing group
- [ ] Hook useShouldAnimate disponible
- [ ] typecheck + lint verdes
- [ ] Commit: `chore(motion): install framer-motion + MotionConfig marketing group`

---

## TASK motion-02 · Componente `<MotionSection/>` con `whileInView` · `[x]`

Wrapper para secciones que anima on-scroll.

Archivo: `src/components/motion/MotionSection.tsx`

```tsx
"use client";

import { motion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

import { useShouldAnimate } from "@/lib/motion/useShouldAnimate";

const defaultVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1],
      staggerChildren: 0.08,
    },
  },
};

interface MotionSectionProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: keyof HTMLElementTagNameMap;
  id?: string;
  variants?: Variants;
}

export function MotionSection({
  children,
  className,
  delay = 0,
  as = "section",
  id,
  variants = defaultVariants,
}: MotionSectionProps) {
  const shouldAnimate = useShouldAnimate();

  if (!shouldAnimate) {
    const Tag = as as any;
    return <Tag className={className} id={id}>{children}</Tag>;
  }

  const MotionTag = motion[as as keyof typeof motion] as any;

  return (
    <MotionTag
      id={id}
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "0px 0px -20% 0px" }}
      variants={variants}
      transition={{ delay }}
    >
      {children}
    </MotionTag>
  );
}
```

### Criterios
- [ ] Componente reusable con signature simple
- [ ] Respeta useShouldAnimate
- [ ] `once: true` (no re-anima al scroll up)
- [ ] Commit: `feat(motion): MotionSection component with whileInView`

---

## TASK motion-03 · `<BrandCircle/>` component decorativo con parallax · `[ ]`

Círculo decorativo con parallax leve.

Archivo: `src/components/motion/BrandCircle.tsx`

```tsx
"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

import { useShouldAnimate } from "@/lib/motion/useShouldAnimate";

interface BrandCircleProps {
  size: number;                        // px del diámetro
  top?: string;                        // css value (ej: "10%")
  left?: string;
  right?: string;
  bottom?: string;
  color?: string;                      // default var(--hg-green-100)
  opacity?: number;                    // default 0.5
  speed?: number;                      // parallax factor · 0.1-0.2 sutil · 0.5 medio
  zIndex?: number;                     // default -1 (fondo)
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
  zIndex = -1,
}: BrandCircleProps) {
  const shouldAnimate = useShouldAnimate();
  const ref = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  // parallax: mueve desde -speed*100 hasta +speed*100 según scroll
  const y = useTransform(scrollYProgress, [0, 1], [`${-speed * 100}px`, `${speed * 100}px`]);

  const style: React.CSSProperties = {
    position: "absolute",
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: "50%",
    background: color,
    opacity,
    top,
    left,
    right,
    bottom,
    zIndex,
    pointerEvents: "none",
  };

  if (!shouldAnimate) {
    return <div aria-hidden style={style} ref={ref} />;
  }

  return <motion.div aria-hidden style={{ ...style, y }} ref={ref} />;
}
```

### Criterios
- [ ] Componente parametrizable por size/color/position/speed/opacity
- [ ] Parallax funciona (visible al scrollear)
- [ ] `aria-hidden` + `pointer-events: none` para no interferir con UX
- [ ] Respeta reduced motion (queda estático)
- [ ] Commit: `feat(motion): BrandCircle component with parallax`

---

## TASK motion-04 · `<BrandLine/>` component decorativo con parallax · `[ ]`

Línea recta decorativa con parallax.

Archivo: `src/components/motion/BrandLine.tsx`

```tsx
"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

import { useShouldAnimate } from "@/lib/motion/useShouldAnimate";

interface BrandLineProps {
  length: number;                      // px
  thickness?: number;                  // default 2
  rotation?: number;                   // deg, default 0
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
  color?: string;                      // default var(--hg-gold)
  opacity?: number;                    // default 0.3
  speed?: number;                      // default 0.1
  zIndex?: number;                     // default -1
}

export function BrandLine({
  length,
  thickness = 2,
  rotation = 0,
  top,
  left,
  right,
  bottom,
  color = "var(--hg-gold)",
  opacity = 0.3,
  speed = 0.1,
  zIndex = -1,
}: BrandLineProps) {
  const shouldAnimate = useShouldAnimate();
  const ref = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], [`${-speed * 80}px`, `${speed * 80}px`]);

  const style: React.CSSProperties = {
    position: "absolute",
    width: `${length}px`,
    height: `${thickness}px`,
    background: color,
    transform: `rotate(${rotation}deg)`,
    transformOrigin: "center",
    opacity,
    top,
    left,
    right,
    bottom,
    zIndex,
    pointerEvents: "none",
  };

  if (!shouldAnimate) {
    return <div aria-hidden style={style} ref={ref} />;
  }

  return <motion.div aria-hidden style={{ ...style, y }} ref={ref} />;
}
```

### Criterios
- [ ] Parametrizable length/thickness/rotation/color/speed
- [ ] Parallax OK
- [ ] Commit: `feat(motion): BrandLine component with parallax`

---

## TASK motion-05 · Hover motion sutil en Button + Card · `[ ]`

**Cero animación agresiva.** Escala y shadow apenas perceptibles.

### 5.1 · Button

Editar `src/components/ui/button.tsx`. Wrappear con `motion.button` cuando shouldAnimate:

```tsx
"use client";

import { motion } from "framer-motion";
import { useShouldAnimate } from "@/lib/motion/useShouldAnimate";

// dentro del componente Button:
const shouldAnimate = useShouldAnimate();

if (!shouldAnimate) {
  return <button className={cn(...)} {...props}>{children}</button>;
}

return (
  <motion.button
    className={cn(...)}
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    transition={{ duration: 0.15, ease: "easeOut" }}
    {...props}
  >
    {children}
  </motion.button>
);
```

⚠️ Verificar que `whileTap` no interfiera con onClick handlers existentes.

### 5.2 · Card

Editar `src/components/ui/card.tsx`. Solo para variants con hover: aplicar `whileHover={{ y: -2, transition: { duration: 0.2 } }}`.

Cuidado: si `<Card/>` se usa dentro de un `<Link/>` grande, el hover puede duplicarse. Verificar visualmente.

### Criterios
- [ ] Button hover scale 1.02 · tap scale 0.98 (sutil)
- [ ] Card hover translateY -2px
- [ ] Sin regresión en clicks / focus / accessibility
- [ ] Respeta reduced motion
- [ ] Commit: `feat(motion): subtle hover motion on Button + Card`

---

## TASK motion-06 · Wire `<MotionSection/>` en secciones del home · `[ ]`

Editar `src/app/(marketing)/page.tsx` y wrappear cada sección con `<MotionSection>`.

### 6.1 · Orden esperado post PR #17

```tsx
<>
  <Hero />                            {/* SIN MotionSection · visible on-load */}
  <MotionSection><SixPillars /></MotionSection>
  <MotionSection><MarketingRadar /></MotionSection>
  <MotionSection><WhatIsHg /></MotionSection>
  <MotionSection><ProductStack /></MotionSection>
  <MotionSection><HowItWorksTimeline /></MotionSection>
  <MotionSection><Quote /></MotionSection>
  <MotionSection><HomeCTAFinal /></MotionSection>
</>
```

⚠️ **Verificar el JSX actual del home** — puede que el orden sea distinto tras el merge de #17. Adaptar según lo que exista.

### 6.2 · Verificación

- Cada sección aparece con fade + slide leve al scrollear a ella
- Sección arriba del fold no debe re-animarse (queda visible)
- Hero NO se anima
- Trigger point: cuando la sección está a ~80% del viewport (config `margin: "0px 0px -20% 0px"`)

### Criterios
- [ ] 7 secciones wrappeadas con MotionSection
- [ ] Hero sin motion
- [ ] Animación fade+slide sutil visible al scrollear
- [ ] Sin regresión visual sin motion
- [ ] Commit: `feat(motion): wire MotionSection on home sections`

---

## TASK motion-07 · Elementos decorativos en 6 pages marketing · `[ ]`

Usar `<BrandCircle/>` y `<BrandLine/>` en las secciones para dar profundidad de marca.

**Reglas de aplicación:**
- Circles de gran tamaño (300-600px) con opacity 0.3-0.5 como fondo entre secciones
- Lines finas (200-400px) rotadas como acentos
- Speed sutil 0.1-0.2 (elegante)
- Colores del brand: green-100, gold, sage, cream para no competir con contenido
- Máximo 2-3 elementos por sección
- `zIndex: -1` para quedar detrás del contenido

### 7.1 · Distribución sugerida por página

**Home** (7 secciones):
- Entre Hero y SixPillars: 1 BrandCircle green-100 top-right
- Entre WhatIsHg y ProductStack: 1 BrandLine gold rotada 15deg + 1 BrandCircle sage bottom-left
- HomeCTAFinal: BrandCircle grande green-100 detrás del CTA

**`/metodo`**: 1 BrandCircle green-100 en hero + 1 BrandLine acento entre pilares y radar

**`/pricing`**: 1 BrandCircle sage en hero

**`/contacto`**: 1 BrandLine gold pequeña + 1 BrandCircle green-100

**`/perspectivas`**: 1 BrandCircle en hero + 1 BrandLine entre filter y grid

**`/plataforma`**: 1 BrandCircle en hero + 1 BrandLine debajo del grid de features

### 7.2 · Wrapper opcional `<DecoLayer/>`

Para no ensuciar los componentes de sección, crear:

```tsx
// src/components/motion/DecoLayer.tsx
"use client";
import type { ReactNode } from "react";

export function DecoLayer({ children }: { children: ReactNode }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden -z-10">
      {children}
    </div>
  );
}
```

Y usar en las pages:

```tsx
<section className="relative ...">
  <DecoLayer>
    <BrandCircle size={480} top="10%" right="-8%" color="var(--hg-green-100)" opacity={0.4} speed={0.15} />
    <BrandLine length={280} rotation={15} bottom="20%" left="5%" color="var(--hg-gold)" opacity={0.3} speed={0.1} />
  </DecoLayer>
  {/* ... contenido normal */}
</section>
```

### 7.3 · Verificación cross-browser

- Chrome + Safari desktop + Safari iOS + Firefox
- Mobile: los elementos decorativos pueden requerir `hidden md:block` si estorban en pantalla chica

### Criterios
- [ ] Cada page marketing tiene 1-3 elementos decorativos
- [ ] Total en el sitio: 10-15 elementos (sin saturar)
- [ ] `DecoLayer` en su lugar con `-z-10` + `pointer-events-none`
- [ ] Verificado en Safari iOS (viewport sin overflow horizontal)
- [ ] Commit: `feat(motion): decorative BrandCircle + BrandLine on 6 marketing pages`

---

## TASK motion-08 · Tests + performance + screenshots · `[ ]`

### 8.1 · Tests

- Tests existentes deben seguir verdes
- Nuevo test unitario: `useShouldAnimate` retorna `false` cuando `prefers-reduced-motion: reduce`
- Nuevo test: `<MotionSection/>` renderiza children sin motion cuando reduced
- Verificar accessibility: `axe-core` no debe reportar warnings nuevos

### 8.2 · Performance check

Correr Lighthouse local en Home antes y después:

```bash
pnpm build && pnpm start &
npx lighthouse http://localhost:3000 --only-categories=performance --output=json --output-path=./lighthouse-motion.json --quiet --chrome-flags="--headless"
```

**Aceptable:** Score performance no baja >5 puntos vs baseline. Si baja más:
- Reducir número de elementos decorativos
- Verificar que solo animamos `transform/opacity`
- Considerar `will-change: transform` en elementos con parallax activo

Documentar el score en el PR.

### 8.3 · Screenshots

```
docs/screenshots/motion-layer/
├── 01-home-hero-static.png            (baseline sin animación de scroll)
├── 02-home-scroll-mid.png             (en medio del scroll, con parallax visible)
├── 03-home-decolayer-visible.png      (círculos y líneas visibles)
├── 04-button-hover.png                (hover state sutil)
├── 05-card-hover.png                  (card hover state)
├── 06-metodo-full.png
├── 07-perspectivas-full.png
└── 08-reduced-motion-flag.png         (con prefers-reduced-motion activado · todo estático)
```

Para el último screenshot, usar Chrome DevTools > Rendering > Emulate CSS media feature `prefers-reduced-motion: reduce`.

### Criterios
- [ ] 84+ tests verdes
- [ ] Lighthouse performance no baja >5 puntos
- [ ] 8 screenshots
- [ ] Verificado prefers-reduced-motion desactiva todo
- [ ] Cross-browser check (Chrome + Safari + Firefox)
- [ ] Commit: `test(motion): tests + performance + 8 screenshots`

---

# 🎯 Criterios globales

- [ ] framer-motion instalado (única dep nueva)
- [ ] MotionConfig en marketing group
- [ ] Hook useShouldAnimate en `lib/motion/`
- [ ] `<MotionSection/>` wrappea 7 secciones del home
- [ ] `<BrandCircle/>` y `<BrandLine/>` reusables con props documentadas
- [ ] 10-15 elementos decorativos distribuidos en 6 pages
- [ ] Hover motion sutil en Button + Card
- [ ] prefers-reduced-motion respetado 100%
- [ ] Sin regresión visual
- [ ] Performance no baja >5 puntos Lighthouse
- [ ] Cross-browser OK
- [ ] Tests + 8 screenshots
- [ ] PR contra `main`

# 📤 Entrega

- SHA + PR
- 8 screenshots
- Lighthouse score before/after documentado
- Nota de cross-browser (Chrome + Safari + Firefox + Safari iOS)

---

# 🔴 Fuera de scope

- Motion en app autenticada (defer post-MVP)
- Page transitions (`AnimatePresence` entre rutas · defer)
- Complex hero animations (typewriter, orbit, etc · defer)
- Motion en widgets Recharts (Recharts tiene su propio sistema de animación)
- Notificaciones sonoras / haptic (irrelevante)

---

# Status por TASK

| ID | Subject | Status |
|---|---|---|
| motion-01 | Install + MotionConfig + useShouldAnimate | `[x]` |
| motion-02 | `<MotionSection/>` | `[x]` |
| motion-03 | `<BrandCircle/>` | `[ ]` |
| motion-04 | `<BrandLine/>` | `[ ]` |
| motion-05 | Hover motion Button + Card | `[ ]` |
| motion-06 | Wire MotionSection en home | `[ ]` |
| motion-07 | Decorativos en 6 pages | `[ ]` |
| motion-08 | Tests + performance + screenshots | `[ ]` |
