# Prompt Claude Code · Web polish Jorge — v3 addendum (Jul 3 2026)

> **Modo recomendado:** `/effort high` con **Claude Opus 4.8**.
> Feedback post-merge PR #16 (`feat/web-polish-jorge-v2`). **15 TASKs**, ~10-14h secuencial.
> Alcance: pages marketing (`/`, `/metodo`, `/pricing`, `/contacto`, `/plataforma`, `/perspectivas`) + Radar (compartido con app). No incluye CMS backend de Perspectivas (ese va en prompt separado).
> Base: `main` con PR #16 mergeado (15 TASKs · Hero copy · Timeline · WhatIsHg · Quote Deloitte · MarketingRadar · SixPillars watermark · Nav 5 tabs + drawer mobile · Footer 3 filas · /perspectivas migración).

---

## ⚙️ Resume protocol

1. Releé este prompt.
2. Releé el feedback fuente al final del prompt v2 (`docs/prompts/claude-code_web_polish_jorge_v2.md`) + este.
3. `git status && git log --oneline -10 && cd apps/frontend && pnpm typecheck`
4. Reanudá desde el primer `[ ]`.

## 🧱 Reglas duras

- Un commit por TASK con prefijo `feat(web-v3): ...` / `fix(web-v3): ...` / `chore(web-v3): ...`
- Editá ESTE archivo al avanzar (status + `[x]`)
- **NO tocar app autenticada** (`(app)`, `(admin)`, `(auth)`, `(onboarding)`) — **excepción TASK 06 y TASK 12** (bug pillar cross-cutting + radar app)
- **NO modificar tokens DS v2**
- **NO instalar dependencias** salvo confirmación
- **Copy en `src/lib/locales/es.ts`** + espejo en `en.ts`

## 📌 Estado post PR #16

Ya mergeado (NO duplicar):

- Nav 5 tabs actual: Plataforma / Ciencia / Perspectivas / Precios / Blog + language toggle + drawer mobile
- Hero home con copy Jorge v2 (H1 2 líneas, 2 párrafos, "Ver dimensiones" scroll)
- Footer 3 filas simplificado
- MarketingRadar en Home + /metodo (mock actual con 1 malla)
- SixPillars con watermark hex icons
- WhatIsHg (Copy A)
- Quote Deloitte firma Jorge Araya
- HowItWorksTimeline 4 pasos
- `/plataforma`, `/blog` placeholders ("Próximamente")
- `/perspectivas` con `<FeaturedPaths/>` migrado

## 🧠 Decisiones firmadas Andrés (Jul 3 · post PR #16)

| # | Decisión | Ref TASK |
|---|---|---|
| A | **Blog OUT del nav.** Perspectivas absorbe blog + artículos + business cases + whitepapers via CMS content types (backend en prompt separado) | TASK 07 |
| B | Tab **"Ciencia" → "Método"** (mismo `/metodo`) | TASK 07 |
| C | Watermark "Hï" en **todos los heros** de marketing pages | TASK 01 |
| D | Logo "Hï" al pie del formulario `/contacto` y de `/pricing` | TASK 02 |
| E | Títulos hero cortos: Home "Habilidades Humanas · Desempeño, Permanencia, Crecimiento" · Método "La ciencia nos respalda" | TASK 03 |
| F | `/plataforma` con contenido real basado en features de la app | TASK 09 |
| G | Sección producto en home ligada a `/plataforma` con **stack de screens de la app** + texto | TASK 10 |
| H | CTA final del home apuntando a `/pricing` o `/contacto` | TASK 05 |
| I | **Bug fix cross-cutting**: badges P5 (Paz interior) ↔ P6 (Estabilidad) están swapped en toda la plataforma | TASK 06 |
| J | **Radar nuevo esquema:** 2 mallas (crecimiento verde + estado actual) + badges pilar reemplazan "P#" | TASK 12 |
| K | `/metodo`: quitar sección de referencias, contenido pilares user-friendly (menos jerga), radar back-to-back con pilares | TASK 08 |
| L | Timeline paso 3: "Acompañamiento" — "Mentorías y recursos que reafirman el aprendizaje" | TASK 04 |
| M | Timeline paso 4: "Eventos" (título mismo) — "Conexiones reales que fortalecen el desarrollo humano." | TASK 04 |

---

# TASKS

## TASK web-v3-01 · Watermark "Hï" en heros de todas las pages marketing · `[x]`

Hoy solo `<Hero/>` (home) tiene el watermark del isotype (`/isotype/isotype-oscuro.svg`). Extender a las 4 pages restantes con hero.

Componente reusable en `src/components/marketing/HeroWatermark.tsx`:

```tsx
export function HeroWatermark({ variant = "dark" }: { variant?: "dark" | "light" }) {
  const src = variant === "dark" ? "/isotype/isotype-oscuro.svg" : "/isotype/isotype-claro.svg";
  return (
    <div className="absolute -right-16 top-10 opacity-[0.08] pointer-events-none hidden md:block">
      <img src={src} alt="" aria-hidden className="w-[clamp(360px,40vw,760px)] h-auto" />
    </div>
  );
}
```

Insertar en:
- `/metodo` — hero de la página
- `/pricing` — hero de la página
- `/contacto` — hero de la página
- `/perspectivas` — hero de la página
- `/plataforma` — hero (una vez creado en TASK 09)

Refactor: `<Hero/>` del home usa el mismo componente en vez de tener su propio bloque `<img>`.

### Criterios
- [ ] Watermark visible md:up en las 5 páginas
- [ ] Componente `<HeroWatermark/>` reusable
- [ ] Sin regresión visual en home
- [ ] Commit: `feat(web-v3): HeroWatermark component + wire on 5 marketing pages`

---

## TASK web-v3-02 · Logo "Hï" al pie del formulario contacto y de pricing · `[x]`

Componente `src/components/marketing/PageBottomIsotype.tsx`:

```tsx
export function PageBottomIsotype() {
  return (
    <div className="flex justify-center pb-16 pt-8">
      <img
        src="/isotype/isotype-oscuro.svg"
        alt=""
        aria-hidden
        className="h-24 w-auto opacity-[0.4]"
      />
    </div>
  );
}
```

Colocar **antes** del `<Footer/>`:
- `/contacto` — debajo del formulario
- `/pricing` — debajo del CTA "Conversemos"

### Criterios
- [ ] Isotype visible al pie de contacto + pricing
- [ ] Opacity/tamaño consistente
- [ ] Commit: `feat(web-v3): PageBottomIsotype on contacto + pricing`

---

## TASK web-v3-03 · Títulos hero cortos (home + método) · `[x]`

Editar `src/lib/locales/es.ts`:

```ts
hero: {
  // era H1 largo de 2 líneas
  titleLine1: "Habilidades Humanas ·",
  titleLine2: "Desempeño, Permanencia, Crecimiento.",
  eyebrow: "SISTEMA DE CRECIMIENTO · LATAM",
  bodyP1: "...",   // mantener como está
  bodyP2: "...",   // mantener como está
  ctaPrimary: "Conversemos →",
  ctaSecondary: "Ver dimensiones",
  socialProof: "Diseñado para profesionales y equipos de LatAm",
},

metodo: {
  hero: {
    eyebrow: "MÉTODO",
    title: "La ciencia nos respalda.",
    // subtítulo y resto mantener si existen
  },
  // ...
}
```

Actualizar `en.ts` con el mismo shape. Ajustar `Hero.tsx` fontSize del clamp si es necesario (títulos ahora más cortos, puede subir a `clamp(56px, 8vw, 96px)`).

### Criterios
- [ ] Home H1: "Habilidades Humanas · Desempeño, Permanencia, Crecimiento."
- [ ] Método H1: "La ciencia nos respalda."
- [ ] Font-size ajustado (títulos cortos permiten mayor tamaño)
- [ ] Commit: `feat(web-v3): shorter hero titles home + metodo`

---

## TASK web-v3-04 · Timeline camino en 4 pasos updates (paso 3 y 4) · `[x]`

En `es.ts`, dentro de `howItWorks.steps`:

```ts
steps: [
  { n: 1, title: "Diagnóstico", body: "Explicamos el porqué, el cómo y lo que revela." },
  { n: 2, title: "Rutas", body: "El mapa de las oportunidades: trayectos de crecimiento con sistema de micro-aprendizaje." },
  // CAMBIADO paso 3
  { n: 3, title: "Acompañamiento", body: "Mentorías y recursos que reafirman el aprendizaje." },
  // CAMBIADO paso 4 (título igual, desc cambia)
  { n: 4, title: "Eventos", body: "Conexiones reales que fortalecen el desarrollo humano." },
],
```

Espejar en `en.ts`.

**Si `HowItWorksTimeline` aparece también en `/metodo` (por TASK web-v2-10), la actualización afecta ambos lugares (SSOT en el locale).**

### Criterios
- [ ] Paso 3 título "Acompañamiento" + body "Mentorías y recursos..."
- [ ] Paso 4 body "Conexiones reales..."
- [ ] Home + /metodo muestran los mismos textos
- [ ] Commit: `chore(web-v3): update timeline steps 3-4 copy (items L+M)`

---

## TASK web-v3-05 · CTA final del home · `[x]`

Nueva sección al final del home, antes del Quote (o después del Quote, según el orden actual del render — el criterio es "última sección antes del Footer").

Componente `src/components/marketing/HomeCTAFinal.tsx`:

```tsx
export function HomeCTAFinal() {
  return (
    <section className="max-w-marketing mx-auto px-8 py-24 text-center">
      <div className="eyebrow eyebrow-accent mb-6">EMPEZÁ HOY</div>
      <h2 className="font-display text-fg text-h1 md:text-display-m uppercase tracking-tight leading-tight mb-6">
        ¿Listos para transformar cómo crece tu equipo?
      </h2>
      <p className="body-lg max-w-[620px] mx-auto text-fg-muted mb-8">
        Conversamos contigo para diseñar tu propuesta a medida.
      </p>
      <div className="flex flex-wrap justify-center gap-4">
        <Link
          href="/contacto"
          className="bg-primary text-white px-8 py-4 rounded-md font-semibold text-base hover:bg-primary-hover transition-colors"
        >
          Conversemos →
        </Link>
        <Link
          href="/pricing"
          className="bg-transparent text-fg border border-[color:var(--border-strong)] px-8 py-4 rounded-md font-semibold text-base hover:bg-bg-sunken transition-colors"
        >
          Ver precios
        </Link>
      </div>
    </section>
  );
}
```

Copy vive en `es.ts` bajo `homeCta`. Wire en `page.tsx` como última sección antes del Footer.

### Criterios
- [ ] CTA final render con 2 botones (Conversemos primary + Ver precios secondary)
- [ ] Copy en locale
- [ ] Última sección antes del Footer
- [ ] Commit: `feat(web-v3): HomeCTAFinal section`

---

## TASK web-v3-06 · Bug fix cross-cutting · badges P5 ↔ P6 swap · `[ ]`

**Andrés reporta que el badge del pilar "Paz interior" (P5) hace switch con "Estabilidad emocional" (P6) en toda la plataforma.**

Diagnóstico inicial en `src/lib/pillars.ts`:

```ts
export const PILLARS: Pillar[] = [
  { id: "P1", name: "Carrera e impacto", dot: "bg-pillar-p1", badge: "pillar-p1" },
  { id: "P2", name: "Propósito y significado", dot: "bg-pillar-p2", badge: "pillar-p2" },
  { id: "P3", name: "Relaciones y conexión", dot: "bg-pillar-p3", badge: "pillar-p3" },
  { id: "P4", name: "Salud y bienestar", dot: "bg-pillar-p4", badge: "pillar-p4" },
  { id: "P5", name: "Paz interior y claridad", dot: "bg-pillar-p5", badge: "pillar-p5" },
  { id: "P6", name: "Estabilidad emocional y material", dot: "bg-pillar-p6", badge: "pillar-p6" },
];
```

Colores en `tailwind.config.ts`:
```
pillar.p5: "#2c3e50" // Paz interior — slate
pillar.p6: "#e8a030" // Estabilidad — amber
```

**Investigación necesaria (parte de la TASK):**

1. Grep `pillar-p5`, `pillar-p6` en components para ver qué badge se está pintando dónde
2. Verificar visualmente en `/home`, `/perfil`, `/library`, `/team`, `/admin/org` que el badge del pilar 5 muestre "Paz interior" con color slate y el 6 muestre "Estabilidad" con color amber
3. Encontrar el punto exacto donde se produce el swap:
   - ¿El backend devuelve pillar_code invertido? (grep `pillar_code` en backend/schemas)
   - ¿El scorer devuelve el orden invertido? (grep en `apps/backend/src/hg/modules/assessment`)
   - ¿La UI muestra `PILLARS[4]` y `PILLARS[5]` intercambiados?
4. Fix en el punto exacto (no cambiar el `PILLARS[]` array si el bug está río abajo).

**Test:** buscar un usuario seed con datos y verificar que el badge de "Paz interior" en su dashboard sea slate (no amber) y el de "Estabilidad" sea amber (no slate).

### Criterios
- [ ] Bug identificado y documentado en el commit message con el archivo/línea
- [ ] Fix aplicado en el punto correcto (no en `pillars.ts` si el bug está río abajo)
- [ ] Verificación visual en 3 pages diferentes que consumen badge de pilar
- [ ] Test unitario si el bug está en código testeable
- [ ] Commit: `fix(web-v3): swap P5/P6 badge labels (bug I)`

---

## TASK web-v3-07 · Nav rewrite v2 · 4 tabs + rename + drawer mobile · `[ ]`

Cambios:

- **Blog OUT del nav** (queda como content type dentro de Perspectivas · CMS en prompt separado)
- Tab "Ciencia" → **"Método"** (label solo · el href sigue siendo `/metodo`)
- 4 tabs finales: **Plataforma · Método · Perspectivas · Precios**
- Mantener language toggle + drawer mobile con los 4 tabs

Editar `src/lib/locales/es.ts`:

```ts
nav: {
  platform: "Plataforma",
  science: "Método",            // ← rename (era "Ciencia")
  perspectives: "Perspectivas",
  pricing: "Precios",
  // blog: REMOVIDO
  login: "Iniciar sesión",
  cta: "Conversemos",
},
```

Editar `src/components/marketing/Nav.tsx`:

```ts
const TABS: { label: string; href: Route }[] = [
  { label: t("nav.platform", LANG), href: "/plataforma" },
  { label: t("nav.science", LANG), href: "/metodo" },
  { label: t("nav.perspectives", LANG), href: "/perspectivas" },
  { label: t("nav.pricing", LANG), href: "/pricing" },
  // blog fuera
];
```

Eliminar `src/app/(marketing)/blog/page.tsx` (o dejar redirect 308 a `/perspectivas` con nota "Blog vive dentro de Perspectivas ahora"). Preferido: **redirect** para no romper links viejos.

### Criterios
- [ ] Nav muestra 4 tabs (no 5)
- [ ] Tab "Método" (no "Ciencia")
- [ ] `/blog` responde 308 → `/perspectivas`
- [ ] Drawer mobile muestra los mismos 4 tabs
- [ ] Cero refs a `nav.blog` en el código (grep limpio)
- [ ] Commit: `feat(web-v3): nav 4 tabs · rename Ciencia→Método · Blog absorbed into Perspectivas`

---

## TASK web-v3-08 · /metodo cleanup · referencias out + pilares user-friendly · `[ ]`

Cambios pedidos por Jorge/Andrés:

1. **Eliminar sección de referencias** (si existe en `/metodo`)
2. **Contenido pilares user-friendly:** explicar a grandes rasgos la ruta de crecimiento por pilar + análisis realizado, **sin términos científicos técnicos ni referencias profundas** (esas van en investigación interna, no en marketing)
3. **MarketingRadar back-to-back con la sección de pilares** en `/metodo` (usar nuevo esquema TASK 12)

### 8.1 · Copy de pilares user-friendly

Editar `es.ts` bajo `metodo.pilares` (o donde corresponda):

Para cada pilar, cambiar el texto para que responda:
- ¿Qué mide en concreto?
- ¿Cómo es la ruta de crecimiento típica?
- Cero jerga: "eficacia general" ✓ vs "self-determination theory" ✗
- Cero DOIs ni citaciones

Ejemplo P1:
```
p1: {
  title: "Carrera e impacto",
  desc: "Medimos cómo estás construyendo tu trayectoria y el impacto que generás en tu rol. La ruta te lleva desde entender tu propuesta de valor a maximizar tu contribución al negocio.",
}
```

**Nota:** este copy lo escribe Andrés/coach. La TASK ejecuta con `[copy pendiente]` inline y crea el TODO para que Andrés lo edite después de merge. NO inventar contenido de pilar sin fuente.

### 8.2 · Eliminar referencias

Grep en `src/app/(marketing)/metodo/page.tsx` + `MethodPillars.tsx` + `MethodSteps.tsx` cualquier bloque con:
- "Referencias", "Bibliografía", "Fuentes"
- Links a DOI, PubMed, arXiv, journals
- Citations formateadas (Author Year)

Remover esos bloques del render (no eliminar los archivos si tienen otro contenido).

### 8.3 · MarketingRadar back-to-back

En `/metodo/page.tsx`, colocar `<MarketingRadar/>` **inmediatamente después** de la sección de pilares, sin espacio entre ellos (o con un separador visual sutil). Se ve como un pareo pilares → radar.

### Criterios
- [ ] Cero refs a "referencias", DOI, citations académicas en `/metodo`
- [ ] Copy de pilares con TODO `[copy pendiente]` inline (para que Andrés edite post-merge)
- [ ] Radar back-to-back con pilares
- [ ] Commit: `feat(web-v3): /metodo cleanup · pilares user-friendly + radar back-to-back`

---

## TASK web-v3-09 · Página /plataforma con contenido real · `[ ]`

Hoy es placeholder ("Próximamente"). Nuevo contenido basado en features de la app.

### 9.1 · Copy en `es.ts` bajo `plataforma`

```ts
plataforma: {
  hero: {
    eyebrow: "PLATAFORMA",
    title: "Todo lo que necesitás para acompañar el crecimiento humano.",
    subtitle: "Diagnóstico, rutas personalizadas, mentorías y eventos — en un solo lugar.",
  },
  features: [
    {
      icon: "chart",
      title: "Diagnóstico integral",
      desc: "6 dimensiones evaluadas con base científica. Tu equipo obtiene un mapa preciso de dónde está y a dónde puede llegar.",
    },
    {
      icon: "route",
      title: "Rutas personalizadas",
      desc: "Contenido curado por dimensión, adaptado al nivel y competencia de cada persona.",
    },
    {
      icon: "users",
      title: "Panel para RRHH",
      desc: "Métricas agregadas de tu equipo con privacidad garantizada. Detectá patrones y actúa a tiempo.",
    },
    {
      icon: "gauge",
      title: "Métricas de crecimiento",
      desc: "No solo tiempo consumido — indicadores reales de aprendizaje y transferencia al trabajo.",
    },
    {
      icon: "message",
      title: "Mentorías disponibles",
      desc: "Sesiones con mentores especializados por dimensión, activables cuando el equipo las necesita.",
    },
    {
      icon: "calendar",
      title: "Eventos y masterclasses",
      desc: "Encuentros en vivo y grabaciones que conectan aprendizaje con experiencia real.",
    },
  ],
}
```

### 9.2 · Componente

`src/app/(marketing)/plataforma/page.tsx` (reemplaza placeholder):

```tsx
import { HeroWatermark } from "@/components/marketing/HeroWatermark";
import { getCopy } from "@/lib/i18n";

export const metadata = { title: "Plataforma · Human Growth" };

export default function PlataformaPage() {
  const c = getCopy("es").plataforma;
  return (
    <>
      <section className="relative max-w-marketing mx-auto px-8 pt-36 pb-20 overflow-hidden">
        <HeroWatermark />
        <div className="relative max-w-[920px]">
          <div className="eyebrow eyebrow-accent mb-6">{c.hero.eyebrow}</div>
          <h1 className="display text-fg text-5xl sm:text-6xl">{c.hero.title}</h1>
          <p className="mt-6 max-w-[620px] text-lg text-hg-charcoal">{c.hero.subtitle}</p>
        </div>
      </section>

      <section className="max-w-marketing mx-auto px-8 pb-24 grid md:grid-cols-3 gap-6">
        {c.features.map((f) => (
          <article key={f.title} className="rounded-lg border border-border-subtle bg-surface-card p-8">
            {/* icon opcional — mostrar solo si el asset existe */}
            <h3 className="font-heading text-h3 font-semibold mt-2">{f.title}</h3>
            <p className="body-sm mt-3">{f.desc}</p>
          </article>
        ))}
      </section>
    </>
  );
}
```

### Criterios
- [ ] Placeholder eliminado
- [ ] Página con hero + 6 feature cards
- [ ] Copy en `es.ts` (Andrés puede editar post-merge)
- [ ] `HeroWatermark` presente
- [ ] Commit: `feat(web-v3): /plataforma real content · 6 features from app`

---

## TASK web-v3-10 · Sección producto en home · stack de screens app · `[ ]`

Nueva sección en el home que muestra la app en acción con **stack de screens reales**, con link a `/plataforma`.

### 10.1 · Assets necesarios

Andrés debe proveer 3-4 screenshots de la app en:
- `apps/frontend/public/marketing/screens/screen-home.png` (1200×750)
- `apps/frontend/public/marketing/screens/screen-perfil.png`
- `apps/frontend/public/marketing/screens/screen-team.png`
- `apps/frontend/public/marketing/screens/screen-modulos.png`

**Si Andrés no las provee al momento del run, usar placeholders con `<div className="bg-hg-linen aspect-video rounded-lg" />` y sumar TODO al PR: "Assets faltantes: pasar screenshots reales a public/marketing/screens/".**

### 10.2 · Componente

`src/components/marketing/ProductStack.tsx`:

```tsx
import Link from "next/link";

const SCREENS = [
  { src: "/marketing/screens/screen-home.png", alt: "Home de la app" },
  { src: "/marketing/screens/screen-perfil.png", alt: "Perfil del colaborador" },
  { src: "/marketing/screens/screen-modulos.png", alt: "Módulos de aprendizaje" },
  { src: "/marketing/screens/screen-team.png", alt: "Dashboard del equipo" },
];

export function ProductStack() {
  return (
    <section className="max-w-marketing mx-auto px-8 py-24 grid md:grid-cols-2 gap-12 items-center">
      <div>
        <div className="eyebrow eyebrow-accent mb-6">EN VIVO</div>
        <h2 className="font-display text-fg text-h1 md:text-display-m uppercase tracking-tight leading-tight mb-6">
          Así se ve el crecimiento en acción.
        </h2>
        <p className="body-lg text-fg-muted mb-6">
          Diagnóstico, rutas, mentorías y métricas — todo conectado en una sola plataforma.
        </p>
        <Link href="/plataforma" className="text-primary font-semibold hover:text-primary-hover">
          Ver la plataforma completa →
        </Link>
      </div>
      <div className="relative">
        {SCREENS.map((s, i) => (
          <div
            key={s.src}
            className="absolute rounded-lg border border-border-subtle shadow-md overflow-hidden"
            style={{
              top: `${i * 32}px`,
              left: `${i * 24}px`,
              width: "80%",
              zIndex: SCREENS.length - i,
            }}
          >
            <img src={s.src} alt={s.alt} className="w-full h-auto" />
          </div>
        ))}
      </div>
    </section>
  );
}
```

Wire en `page.tsx` — colocar entre `WhatIsHg` y `HowItWorksTimeline` (o donde el orden narrativo funcione mejor).

### Criterios
- [ ] Sección con 4 screens stacked + texto + link a /plataforma
- [ ] Fallback a placeholders si assets faltan (con TODO)
- [ ] Responsive mobile
- [ ] Commit: `feat(web-v3): ProductStack section in home`

---

## TASK web-v3-11 · Perspectivas frontend prep · content types genéricos · `[ ]`

**Sin backend CMS todavía** (eso va en prompt separado). Este task solo prepara el frontend para consumir content types (Blog, Artículos, Business Cases, Whitepapers).

### 11.1 · Copy en `es.ts` bajo `perspectivas`

```ts
perspectives: {
  metaTitle: "Perspectivas · Human Growth",
  eyebrow: "PERSPECTIVAS",
  title: "Ideas que crecen con vos.",
  subtitle: "Blog, artículos, casos y whitepapers sobre desarrollo humano y crecimiento profesional.",
  contentTypes: [
    { id: "blog", label: "Blog" },
    { id: "articulo", label: "Artículos" },
    { id: "caso", label: "Business cases" },
    { id: "whitepaper", label: "Whitepapers" },
  ],
  emptyState: "Contenido próximamente. Estamos preparando material que te va a interesar.",
}
```

### 11.2 · Componente `PerspectivasFilter.tsx`

Chips filtrables por content type. Por ahora sin data — placeholder.

### 11.3 · Reemplazar `<FeaturedPaths/>` (que era "Nuevo este trimestre" de paths)

Migrar a una lista/grid vacía con empty state.

```tsx
<div className="text-center py-16">
  <p className="body-lg text-fg-muted">{c.emptyState}</p>
</div>
```

Cuando el CMS backend esté disponible, la lista se puebla vía fetch.

### Criterios
- [ ] `/perspectivas` con hero + chips filter + empty state
- [ ] Sin data hardcodeada
- [ ] Cero refs a `<FeaturedPaths/>`
- [ ] Commit: `feat(web-v3): /perspectivas prep for CMS content types`

---

## TASK web-v3-12 · Radar nuevo esquema · 2 mallas + badges pilar · `[ ]`

**Este cambio es cross-cutting** — afecta `<Radar/>` que usan `/home`, `/perfil`, `/team`, `/admin/org` **y** `<MarketingRadar/>` que usa `/` + `/metodo`.

### 12.1 · Nuevo esquema del Radar

```ts
type RadarSeries = "growth" | "current";
type PillarPoint = { pillar: AssessmentPillarCode; value: number };  // value 0-100

interface RadarProps {
  data: {
    growth: PillarPoint[];    // línea/malla verde · objetivo o proyección de crecimiento
    current: PillarPoint[];   // línea/malla color pillar · estado actual · última evaluación
  };
  size?: number;
  showLabels?: boolean;       // default true · muestra badges pilar en cada eje
}
```

Reglas visuales:
- Malla `growth`: stroke `var(--hg-green)`, fill `var(--hg-green-100)` con opacity `0.3`
- Malla `current`: stroke per-pillar (`--pillar-p1..p6`), fill `transparent`. O trace único blanco/gris + puntos por pillar.
- Ejes: **reemplazar el texto "P#" por el `<PillarBadge code="P1"/>`** (mini-badge con color + label corto)
- Legend abajo: "🟢 Crecimiento" · "⚪ Estado actual"

### 12.2 · Editar `src/components/radar/Radar.tsx`

Refactor de la API. El componente actual acepta array simple — extender a acepta `{growth, current}` con backwards compat (si solo se pasa `current`, ignora `growth`).

### 12.3 · MarketingRadar con mock ilustrativo de 2 mallas

En `<MarketingRadar/>`:

```ts
const SAMPLE = {
  growth: [
    { pillar: "P1", value: 90 },
    { pillar: "P2", value: 90 },
    // ... 90 en todos, target aspiracional
  ],
  current: [
    { pillar: "P1", value: 62 },
    { pillar: "P2", value: 78 },
    { pillar: "P3", value: 55 },
    { pillar: "P4", value: 70 },
    { pillar: "P5", value: 48 },
    { pillar: "P6", value: 65 },
  ],
};
```

### 12.4 · Badges reemplazan "P#" en TODAS las visualizaciones

Grep en el frontend:
- `axis label` en Recharts (o donde el radar renderiza ejes)
- Chips con `P1/P2/...` como texto

Reemplazar por componente `<PillarBadge code="P1" />` que renderiza el hex icon del pillar + label corto (usando `PILLAR_SHORT_LABEL` que ya existe).

### Criterios
- [ ] Radar acepta `{growth, current}` con backwards compat
- [ ] MarketingRadar muestra 2 mallas (verde + current)
- [ ] Ejes usan `<PillarBadge/>` en vez de "P#"
- [ ] Sin regresión en `/home`, `/perfil`, `/team` (backwards compat)
- [ ] Commit: `feat(web-v3): Radar new schema · 2 series growth+current · pillar badges on axes`

---

## TASK web-v3-13 · Language toggle: mantener stub · verificar drawer mobile · `[ ]`

Verificar que `<LanguageToggle/>` aparece en:
- Nav desktop (esquina derecha antes de Iniciar sesión) — ya está
- Drawer mobile (dentro del panel abierto) — verificar

Si el drawer no lo tiene, agregarlo.

### Criterios
- [ ] Toggle visible en drawer mobile abierto
- [ ] Commit: `fix(web-v3): language toggle visible in mobile drawer`

---

## TASK web-v3-14 · Placeholders limpios · items #28, #30 · `[ ]`

Andrés confirma que:
- `/blog` → redirect a `/perspectivas` (TASK 07)
- Legal (Privacidad/Términos/Seguridad) → placeholders `#` hasta contenido
- Nada más pendiente en placeholders

Verificar:
- Footer con links legal `#` con `aria-disabled="true"` + `cursor-not-allowed opacity-60`
- Ninguna page marketing tiene "Próximamente" salvo si TODO explícito

### Criterios
- [ ] Grep "Próximamente" solo en TODOs documentados
- [ ] Legal links con aria-disabled
- [ ] Commit: `chore(web-v3): cleanup placeholders + confirm scope closure`

---

## TASK web-v3-15 · Tests + smoke + screenshots · `[ ]`

### 15.1 · Tests

- Ajustar tests que buscaban Hero H1 largo → nuevo H1 corto
- Tests del nav 5 tabs → 4 tabs (sin Blog)
- Tests del timeline pasos 3-4 → nuevos textos

### 15.2 · Smoke manual

Sin login:
- `/` Home: hero corto · watermark · SixPillars · MarketingRadar (2 mallas) · WhatIsHg · **ProductStack** · Timeline (paso 3 "Acompañamiento" + paso 4 nueva desc) · Quote Deloitte · **HomeCTAFinal**
- `/metodo`: hero "La ciencia nos respalda" · watermark · pilares user-friendly · **radar back-to-back** · sin referencias · timeline (mismo copy)
- `/plataforma`: 6 features cards + hero + watermark
- `/pricing`: copy actual + **PageBottomIsotype**
- `/contacto`: form + **PageBottomIsotype**
- `/perspectivas`: hero + chips filter + empty state
- `/blog`: 308 → `/perspectivas`
- Nav: 4 tabs (sin Blog) · toggle ES/EN · drawer mobile con 4 tabs + toggle
- Badges P5 (Paz interior · slate) y P6 (Estabilidad · amber) correctos en app

### 15.3 · Screenshots

- `01-home-hero-corto-watermark.png`
- `02-home-productstack.png`
- `03-home-cta-final.png`
- `04-metodo-hero-corto.png`
- `05-metodo-radar-back-to-back.png`
- `06-plataforma-features.png`
- `07-nav-4-tabs.png`
- `08-perspectivas-filter-empty.png`
- `09-radar-2-mallas.png`
- `10-pillar-badges-fixed.png` (P5 slate, P6 amber)

### Criterios
- [ ] Tests verdes
- [ ] 10 screenshots
- [ ] Smoke manual OK desktop + mobile
- [ ] Commit: `test(web-v3): adjust tests + 10 screenshots after v3 polish`

---

# 🎯 Criterios globales "hecho"

- [ ] 15 TASKs commiteadas
- [ ] Watermark Hï en 5 heros
- [ ] Isotype pie de contacto + pricing
- [ ] H1 cortos home + método
- [ ] Timeline pasos 3-4 actualizados
- [ ] CTA final en home
- [ ] Bug P5↔P6 fixeado
- [ ] Nav 4 tabs · Blog fuera · Método (era Ciencia)
- [ ] /metodo sin referencias · pilares user-friendly · radar back-to-back
- [ ] /plataforma con features reales
- [ ] ProductStack en home
- [ ] Perspectivas frontend listo para CMS
- [ ] Radar nuevo esquema (2 mallas + badges pillar)
- [ ] Legal placeholders limpios
- [ ] Tests + 10 screenshots

# 📤 Entrega

- SHA + PR
- 10 screenshots
- 3 archivos con TODO documentados: copy pilares `/metodo`, screenshots app en `/marketing/screens/`, contenido real de Perspectivas (post CMS)
- Nota: prompt separado `claude-code_perspectivas_cms.md` cubre el backend CMS

---

# 🔴 Fuera de scope de este prompt

Se resuelven en prompt separado `claude-code_perspectivas_cms.md`:

- Backend content types Perspectivas (Blog · Artículo · Business case · Whitepaper)
- Endpoints admin CRUD
- Rich text editor superuser
- Wire `/perspectivas` fetch data

---

# Status por TASK

| ID | Subject | Status |
|---|---|---|
| web-v3-01 | HeroWatermark en 5 pages | `[x]` |
| web-v3-02 | PageBottomIsotype contacto + pricing | `[x]` |
| web-v3-03 | Títulos hero cortos | `[x]` |
| web-v3-04 | Timeline pasos 3-4 | `[x]` |
| web-v3-05 | HomeCTAFinal | `[x]` |
| web-v3-06 | Bug P5↔P6 swap | `[ ]` |
| web-v3-07 | Nav 4 tabs · Blog out · Método | `[ ]` |
| web-v3-08 | /metodo cleanup + radar back-to-back | `[ ]` |
| web-v3-09 | /plataforma real | `[ ]` |
| web-v3-10 | ProductStack en home | `[ ]` |
| web-v3-11 | Perspectivas frontend prep | `[ ]` |
| web-v3-12 | Radar nuevo esquema | `[ ]` |
| web-v3-13 | Language toggle drawer | `[ ]` |
| web-v3-14 | Placeholders cleanup | `[ ]` |
| web-v3-15 | Tests + screenshots | `[ ]` |
