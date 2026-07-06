# Prompt Claude Code · Web polish Jorge — v2.1 (Jul 3 2026)

> **Modo recomendado:** `/effort high` con **Claude Opus 4.8**.
> Feedback de Jorge Araya sobre app.humangrowth.io. **15 TASKs**, ~10-13h secuencial.
> Alcance: solo pages marketing (`/`, `/metodo`, `/pricing`, `/perspectivas` nueva, Nav, Footer). No toca app autenticada, motor de assessment, ni DS foundation.
> Base branch: `main` con DS-02/04/06/07 mergeados (tokens v2, StatCard, brand components, cleanup aliases legacy).

---

## ⚙️ Resume protocol

Si la sesión se compacta o reinicia:

1. Releé este prompt (`docs/prompts/claude-code_web_polish_jorge_v2.md`).
2. Releé el **feedback fuente** en `HG/Docs/HG_Feedback_Jorge_Web_v2.md`.
3. Verificá estado:
   ```bash
   git status && git log --oneline -10
   cd apps/frontend && pnpm typecheck 2>&1 | tail -10
   ```
4. Buscá TASKs `🟧 IN PROGRESS` y reanudá desde el último criterio sin tildar.

## 🧱 Reglas duras

- **Un commit por TASK** con prefijo `feat(web-v2): ...` / `fix(web-v2): ...` / `chore(web-v2): ...`.
- **Editá ESTE archivo al avanzar** (status + `[x]`).
- **No avances** si la TASK actual no está `✅ DONE`.
- **NO tocar la app autenticada** (`(app)`, `(admin)`, `(auth)`, `(onboarding)`).
- **NO modificar tokens** en `globals.css` ni `tailwind.config.ts` (DS v2 ya mergeado).
- **NO instalar dependencias nuevas** salvo confirmación.
- **Todo copy vive en `src/lib/locales/es.ts`** (i18n stub). NO hardcodear en JSX cuando exista key equivalente.
- **Todos los tabs del Nav deben ser visibles en mobile** (drawer hamburger). Cross-cutting a TASK 08.

---

## 📌 Estado actual del código (verificado Jul 3)

**Ya hecho (NO duplicar):**

| Item | Estado | Detalle |
|---|---|---|
| **DS v2 tokens** | ✅ mergeado | primary=green, accent=orange, focus=amber, `hg-*` tokens, aliases legacy eliminados |
| **DS-04 StatCard, DS-06 brand components** | ✅ mergeado | `<StatCard/>`, brand components disponibles |
| **DS-07 aliases legacy purge** | ✅ mergeado | Cero `--orange`, `--cream-100`, etc. — solo v2 |
| **Página `/metodo` (item 7 base)** | ✅ existe | Rewrite de `/ciencia`. `/ciencia` redirect 308 → `/metodo` en `next.config.mjs` |
| **Item #25 · Logo hi-res** | ✅ resuelto | `/logo/nav/logo-nav-negro@1x/@2x/@3x.png` con `srcSet`. Isotypes SVG en `/isotype/`. Favicon + PWA manifest listos |
| **Hero watermark "Hï"** | ✅ existe | Isotype `-oscuro.svg` como background en `<Hero/>` |
| **i18n stub `t()` + `getCopy()`** | ✅ funcional | `src/lib/locales/es.ts` y `en.ts` con estructura idéntica |
| **"Nuevo este trimestre" con dynamic pillar filter** | ✅ mergeado | Base para migrar a `/perspectivas` (TASK 14) |

**Pendiente en base a Jorge feedback:**

- Copy Hero home (items 3, 4, 4b, 5)
- Timeline 4 pasos (items 12, 13)
- Sección nueva "¿Cómo funciona HG?" (item 26)
- Quote Deloitte (item 6)
- Remover Mentorías + Tarifas del home (items 15, 16)
- MarketingRadar (items 23, 24)
- 6 dimensiones watermark cards (items 9, 10, 11)
- Nav rewrite completo · 4 tabs + mobile + sin "Solicitar unirse" (items 17, 20, 30)
- `/pricing` copy (item 19)
- `/metodo` consistency (items 7, 22)
- Purge "cursos" (item 21)
- Footer simplificado (item 27)
- Language toggle stub ES/EN (item 2)
- `/perspectivas` como tab + página (item 14)

## 🧠 Decisiones firmadas por Jorge + Andrés (no re-debatir)

Todos los **DECIDIDO** del feedback fuente. Además, las respuestas de Andrés a los 5 bloqueos previos:

1. **Item #1 · B2B/B2C:** mismo landing y URL por ahora. Sin toggle, sin split.
2. **Item #14 · Tab nuevo:** nombre **"Perspectivas"** confirmado.
3. **Item #26 · Sección "¿Cómo funciona HG?":** **Copy A** (vender las 4 etapas full, sin marcar 3 y 4 como fase 2).
4. **Item #30 · Nav 4 tabs:** **Plataforma · Ciencia · Precios · Blog** (Blog placeholder).
5. **Cross-cutting mobile:** **Todos los tabs deben ser visibles en mobile** (drawer con hamburger).

**Item #28 (Seguridad):** sin respuesta explícita → placeholder en footer (link `#` disabled) hasta que Andrés confirme si tiene contenido.

---

# TASKS

## TASK web-v2-01 · Copy Hero home (items 3, 4, 4b, 5) · `[x]`

**Copy vive en `src/lib/locales/es.ts`** (y espejo en `en.ts` con misma estructura para no romper types).

### 1.1 · Editar keys hero en `es.ts`

Localizar el objeto `hero: { ... }` en `src/lib/locales/es.ts` y actualizar:

```ts
hero: {
  eyebrow: "SISTEMA DE CRECIMIENTO · LATAM",
  titleLine1: "Habilidades humanas para decisiones",
  titleLine2: "de talento: desempeño, permanencia y crecimiento.",
  // Cuerpo — 2 párrafos en vez de 1 con em italic
  bodyP1: "Human Growth es un sistema de crecimiento en 6 dimensiones que mide y desarrolla las habilidades humanas de tu equipo — carrera, propósito, relaciones, salud, paz interior y estabilidad — con base científica.",
  bodyP2: "Pasás de capacitar \"por si acaso\" a saber exactamente qué dimensión frena a cada persona: a quién acompañar, a quién retener y dónde invertir.",
  ctaPrimary: "Conversemos →",
  ctaSecondary: "Ver dimensiones",  // era "Ver rutas"
  socialProof: "Diseñado para profesionales y equipos de LatAm",
},
```

**Eliminar keys legacy** que ya no se usen (`bodyBefore`, `bodyEm`, `bodyAfter`, `titleLine1/2` viejos). Espejar en `en.ts` con la misma shape.

### 1.2 · Editar `src/components/marketing/Hero.tsx`

- El H1 ahora tiene 2 líneas de copy más largo — bajar `fontSize` del `clamp` a algo tipo `clamp(48px, 6vw, 80px)` para que no rompa la grid.
- Reemplazar el bloque `<p>` con `<em serif-italic>` por **dos `<p>` consecutivos**:

```tsx
<p className="text-lg md:text-xl leading-relaxed max-w-[560px] mt-6 text-hg-charcoal">
  {t("hero.bodyP1", LANG)}
</p>
<p className="text-lg md:text-xl leading-relaxed max-w-[560px] mt-4 text-hg-charcoal">
  {t("hero.bodyP2", LANG)}
</p>
```

- Cambiar el `<Link href="/paths">Ver rutas</Link>` por un botón que hace scroll al ancla `#dimensiones`:

```tsx
<button
  onClick={() => document.getElementById("dimensiones")?.scrollIntoView({ behavior: "smooth", block: "start" })}
  className="bg-transparent text-fg border border-[color:var(--border-strong)] px-7 py-[15px] rounded-md font-semibold text-base cursor-pointer whitespace-nowrap hover:bg-bg-sunken transition-colors"
>
  {t("hero.ctaSecondary", LANG)}
</button>
```

- Asegurar que la sección de 6 dimensiones renderiza con `id="dimensiones"` (ver TASK 07).

### 1.3 · Criterios

- [ ] Eyebrow, H1 (2 líneas), 2 párrafos y CTA scroll actualizados
- [ ] `es.ts` y `en.ts` con shape idéntico (types no rompen)
- [ ] Scroll al `#dimensiones` funciona
- [ ] Commit: `feat(web-v2): hero copy + scroll to dimensiones (items 3-5)`

---

## TASK web-v2-02 · Timeline horizontal "Cómo funciona" (items 12, 13) · `[x]`

Reemplaza `<WhatWeOffer/>` (grid de 4 cards) por `<HowItWorksTimeline/>` (línea de tiempo horizontal 1→4).

### 2.1 · Copy en `es.ts`

Añadir al locale bajo `howItWorks`:

```ts
howItWorks: {
  eyebrow: "CÓMO FUNCIONA",
  title: "El camino en 4 pasos.",
  steps: [
    { n: 1, title: "Diagnóstico", body: "Explicamos el porqué, el cómo y lo que revela." },
    { n: 2, title: "Rutas", body: "El mapa de las oportunidades: trayectos de crecimiento con sistema de micro-aprendizaje." },
    { n: 3, title: "Mentorías disponibles", body: "Acompañamiento de quien ya pasó por ahí." },
    { n: 4, title: "Eventos", body: "La culminación del desarrollo humano." },
  ],
},
```

### 2.2 · Componente `HowItWorksTimeline.tsx`

Crear `src/components/marketing/HowItWorksTimeline.tsx` con:

- **Desktop (`md:grid grid-cols-4`):** número circular `bg-primary` + título Poppins + body Manrope. Línea conectora sutil (`bg-border`) detrás de los 4 círculos.
- **Mobile (`flex flex-col`):** vertical stack con número a la izquierda.

Usar `<Eyebrow accent>` + `<Display variant="display-3">` para el header. Copy vía `getCopy("es").howItWorks`.

### 2.3 · Reemplazar en `src/app/(marketing)/page.tsx`

Cambiar `<WhatWeOffer />` por `<HowItWorksTimeline />`. Dejar `WhatWeOffer.tsx` marcado con JSDoc `@deprecated use HowItWorksTimeline`.

### 2.4 · Criterios

- [ ] Timeline desktop 4 columnas + mobile stack vertical
- [ ] Copy exacto de los 4 pasos (SSOT en `es.ts`)
- [ ] Cero uso de la palabra "cursos" (ver TASK 11)
- [ ] Commit: `feat(web-v2): HowItWorksTimeline replaces WhatWeOffer (items 12-13)`

---

## TASK web-v2-03 · Nueva sección "¿Cómo funciona HG?" (item 26 · Copy A) · `[x]`

**Andrés confirmó Copy A** — vender las 4 etapas como visión completa del producto, SIN matiz de "fase 2".

### 3.1 · Copy en `es.ts`

```ts
whatIsHg: {
  eyebrow: "PRODUCTO",
  title: "¿Cómo funciona HG?",
  cards: [
    {
      title: "¿Qué es HG?",
      body: "Una plataforma que desarrolla a cada colaborador de forma holística: las habilidades para ser más humano y las competencias de negocio que su rol exige.",
    },
    {
      title: "¿Qué hace HG?",
      body: "Diagnostica las brechas del colaborador y de la organización, y las cierra recorriendo el mismo proceso en cuatro etapas.",
    },
    {
      title: "¿Cómo funciona HG?",
      body: "1. Diagnóstico → 2. Unidades de aprendizaje personalizadas → 3. Acompañamiento organizacional → 4. Evento.",
    },
  ],
},
```

### 3.2 · Componente `WhatIsHg.tsx`

Crear `src/components/marketing/WhatIsHg.tsx`. Layout: 3 cards horizontales (`md:grid-cols-3`) o 3 bloques verticales apilados según densidad visual. Estilo consistente con el resto de sections (`<Eyebrow>` + `<Display variant="display-3">` header, cards con `bg-surface-card` + `border border-border-subtle` + `rounded-lg`).

### 3.3 · Wire en Home

En `page.tsx`, insertar `<WhatIsHg />` **debajo del `<MarketingRadar />` (TASK 06)** y **arriba de `<HowItWorksTimeline />` (TASK 02)**.

### 3.4 · Criterios

- [ ] 3 cards con Qué es / Qué hace / Cómo funciona
- [ ] Copy A sin matiz "fase 2"
- [ ] Placement: entre radar y timeline
- [ ] Commit: `feat(web-v2): WhatIsHg section (item 26 Copy A)`

---

## TASK web-v2-04 · Quote Deloitte Jorge Araya (item 6) · `[x]`

### 4.1 · Copy en `es.ts`

```ts
quote: {
  p1: "Deloitte confirma que 9 de cada 10 profesionales saben que las habilidades humanas definen su carrera. Aun así, la mitad dice que su empresa no las desarrolla. No es falta de voluntad: no existía cómo hacerlo.",
  ending: "Hasta ahora.",
  author: "Jorge Araya",
  authorTitle: "Fundador · HumanGrowth",
  source: "Fuente: Deloitte, Workplace Skills Survey, octubre 2024.",
},
```

### 4.2 · Editar `Quote.tsx`

- Párrafo 1 con size grande (`text-xl md:text-2xl`), `font-heading`.
- `Hasta ahora.` en línea aparte, con más peso (`text-2xl md:text-3xl font-heading font-bold text-color-accent`).
- Firma: `Jorge Araya` + separador `·` + `Fundador · HumanGrowth`.
- Fuente en `body-xs text-fg-subtle italic mt-2`.

### 4.3 · Criterios

- [ ] Copy Deloitte exacto (2 párrafos + remate + firma + fuente)
- [ ] Firma español consistente con resto del sitio
- [ ] Commit: `feat(web-v2): Quote Deloitte 2024 short version (item 6)`

---

## TASK web-v2-05 · Remover Mentorías + Tarifas del home (items 15, 16) · `[x]`

En `src/app/(marketing)/page.tsx`:

- Eliminar `<MentorStrip />` del JSX (item #15).
- Eliminar `<PricingTable />` del JSX (item #16). La página `/pricing` sigue intacta (TASK 09).

Dejar los componentes exportados (por si se reutilizan luego en track Individual). Marcar con JSDoc `@deprecated on home · reused elsewhere`.

### 5.1 · Criterios

- [ ] Home ya no renderiza mentores ni tarifas
- [ ] `MentorStrip.tsx` y `PricingTable.tsx` siguen en el árbol
- [ ] Commit: `chore(web-v2): remove mentors + pricing sections from home (items 15-16)`

---

## TASK web-v2-06 · MarketingRadar en home + /metodo (items 23, 24) · `[x]`

### 6.1 · Componente `MarketingRadar.tsx`

Crear `src/components/marketing/MarketingRadar.tsx` que wrapea `<Radar/>` de `src/components/radar/Radar.tsx` con:

- Datos ilustrativos hardcoded (NO llama al backend):
  ```ts
  const SAMPLE = [
    { pillar: "P1", label: "Carrera", value: 62 },
    { pillar: "P2", label: "Propósito", value: 78 },
    { pillar: "P3", label: "Relaciones", value: 55 },
    { pillar: "P4", label: "Salud", value: 70 },
    { pillar: "P5", label: "Paz interior", value: 48 },
    { pillar: "P6", label: "Estabilidad", value: 65 },
  ];
  ```
- Caption debajo: `Ejemplo ilustrativo — cada usuario ve su propio radar en la plataforma.`

⚠️ **Verificar la API de `<Radar/>`** — puede que necesite otro shape. Si difiere, adaptar el mock.

### 6.2 · Wire en Home

Insertar entre `<SixPillars/>` (TASK 07) y `<WhatIsHg/>` (TASK 03).

### 6.3 · Wire en `/metodo`

En `src/app/(marketing)/metodo/page.tsx`, insertar debajo de la sección de dimensiones/competencias, coherente con el flujo narrativo.

### 6.4 · Criterios

- [ ] Renderiza sin llamadas backend
- [ ] Visible en Home + `/metodo`
- [ ] Colores pillar respetan `pillar-p1..p6` de DS v2
- [ ] Commit: `feat(web-v2): MarketingRadar for home + metodo (items 23-24)`

---

## TASK web-v2-07 · 6 dimensiones · eyebrow + cards watermark (items 9, 10, 11) · `[x]`

### 7.1 · Copy en `es.ts`

Localizar `sixPillars` y actualizar:

```ts
sixPillars: {
  eyebrow: "LA CIENCIA QUE NOS RESPALDA",       // era "LAS 6 DIMENSIONES"
  title: "6 dimensiones del profesional completo.", // sin "Las"
  items: [
    { code: "p1", slug: "p1-carrera", title: "Carrera e impacto", body: "..." },
    { code: "p2", slug: "p2-proposito", title: "Propósito y significado", body: "..." },
    { code: "p3", slug: "p3-relaciones", title: "Relaciones y conexión", body: "..." },
    { code: "p4", slug: "p4-salud", title: "Salud y bienestar", body: "..." },
    { code: "p5", slug: "p5-paz-interior", title: "Paz interior y claridad", body: "..." },
    { code: "p6", slug: "p6-estabilidad", title: "Estabilidad emocional y material", body: "..." },
  ],
},
```

Mantener `body` actual de cada pilar (no lo modificamos).

### 7.2 · Cards con watermark

En `SixPillars.tsx`, cada card debe mostrar el hex icon del pilar como **watermark visible pero sutil, pegado al costado derecho, mostrando ~3/4 del ícono** (tratamiento similar al "Hï" del hero).

⚠️ **Verificar dónde viven los hex icons del DS v2 oficial** — hoy hay assets en `/logo/`, `/isotype/`, pero los hex-pillar icons pueden estar en `/public/brand/pillars/` (drop del DS-06 zip) o en otra carpeta. Adaptar `src` según lo que exista. Si NO existen, escalar a Andrés antes de proceder — no fabricar iconos.

Estructura JSX:

```tsx
<article className="relative overflow-hidden rounded-lg border border-border bg-surface-card p-8 min-h-[240px]">
  <img
    src={`/brand/pillars/${item.slug}.png`}   // ajustar si el path oficial es otro
    alt=""
    aria-hidden
    className="absolute -right-8 -top-4 h-48 w-48 md:h-56 md:w-56 opacity-[0.10] pointer-events-none select-none"
  />
  <div className="relative z-10">
    <div className="h-2 w-12 rounded-full" style={{ background: `var(--pillar-${item.code})` }} />
    <h3 className="mt-4 font-heading text-h3 font-semibold">{item.title}</h3>
    <p className="body-sm mt-2 max-w-[24rem]">{item.body}</p>
  </div>
</article>
```

### 7.3 · Marcar sección con `id="dimensiones"`

```tsx
<section id="dimensiones" className="max-w-marketing mx-auto px-8 py-20">
```

Para que el CTA del hero (TASK 01) haga scroll acá.

### 7.4 · Criterios

- [ ] Eyebrow + título actualizados vía `es.ts`
- [ ] 6 cards con hex watermark visible (opacity 0.08-0.12, calibrar)
- [ ] `id="dimensiones"` presente
- [ ] Cero refs a "P1..P6" como texto visible (solo colores/iconos)
- [ ] Commit: `feat(web-v2): SixPillars watermark cards + eyebrow ciencia (items 9-11)`

---

## TASK web-v2-08 · Nav rewrite · 4 tabs + mobile drawer (items 17, 20, 30) · `[x]`

**Este es el cambio más grande del prompt.** Reescribe `Nav.tsx` con 4 tabs nuevos + mobile drawer visible.

### 8.1 · Copy en `es.ts`

Reemplazar el bloque `nav` del locale con los 4 tabs nuevos:

```ts
nav: {
  platform: "Plataforma",
  science: "Ciencia",
  pricing: "Precios",
  blog: "Blog",
  login: "Iniciar sesión",
  cta: "Conversemos",
},
```

**Nota:** cualquier key legacy (`nav.paths`, `nav.forTeams`, `nav.method`) que ya no se use, se elimina también del `en.ts` para consistencia.

### 8.2 · Rutas de los 4 tabs

| Tab | href | Notas |
|---|---|---|
| Plataforma | `/plataforma` | Nueva ruta placeholder — crear `src/app/(marketing)/plataforma/page.tsx` con un `<div>` centrado "Próximamente." + `<Link href="/">Volver al inicio</Link>`. La página real vive en el addendum futuro |
| Ciencia | `/ciencia` | Ya existe · redirect 308 a `/metodo`. Mantener el redirect · Jorge quiere que el label del tab sea "Ciencia" |
| Precios | `/pricing` | Existente |
| Blog | `/blog` | Placeholder — crear `src/app/(marketing)/blog/page.tsx` con "Próximamente." mismo tratamiento que Plataforma |

### 8.3 · Eliminar "Solicitar unirse" (item #20)

Borrar completo el `<Link href="/contacto">Solicitar unirse</Link>` de la esquina derecha. Dejar solo:

- CTA verde `Conversemos` → `/contacto`
- Link `Iniciar sesión` → `/login`

### 8.4 · Mobile drawer (cross-cutting)

**Hoy Nav.tsx tiene `hidden md:flex` para los 4 tabs — no aparecen en mobile.**

Implementar drawer hamburger visible en mobile:

- Botón hamburger (`Menu` de lucide-react) visible solo en `md:hidden`, alineado a la derecha.
- Al clickear, abre drawer lateral derecho con:
  - 4 tabs Plataforma / Ciencia / Precios / Blog
  - Divider
  - `Iniciar sesión` + `Conversemos` (como CTA green)
  - Language toggle stub (TASK 13)
- Botón close (`X` de lucide-react) en el header del drawer.
- Cierra al clickear un link o Esc.
- Usar `<Dialog/>` o `<Sheet/>` del design system si existe · si no, patrón simple con state + backdrop scrim + `position: fixed`.

### 8.5 · Language toggle en desktop nav

Insertar `<LanguageToggle/>` (TASK 13) en la esquina superior derecha del nav desktop, antes del `Iniciar sesión`.

### 8.6 · Criterios

- [ ] 4 tabs Plataforma/Ciencia/Precios/Blog visible en desktop
- [ ] Todos los tabs visibles en mobile vía drawer hamburger
- [ ] Cero refs a "Solicitar unirse"
- [ ] Cero refs a labels legacy (Rutas de Crecimiento, Para Equipos, El Método) en Nav
- [ ] `/plataforma` y `/blog` páginas placeholder existen
- [ ] Language toggle presente (mobile + desktop)
- [ ] Commit: `feat(web-v2): Nav rewrite 4 tabs + mobile drawer + remove Solicitar unirse (items 17, 20, 30)`

---

## TASK web-v2-09 · /pricing copy (items 17, 19) · `[x]`

### 9.1 · Copy en `es.ts`

Localizar `pricing` y actualizar:

```ts
pricing: {
  eyebrow: "PRECIOS",                           // era "TARIFAS"
  title: "Cada empresa es distinta.",           // sin "Vamos a armar tu paquete."
  subtitle: "Conversamos contigo para entender tu equipo, definir el alcance y armarte una propuesta a la medida.",  // sin "Sin tarifas fijas todavía."
  cta: "Conversemos",
  ctaNote: "Precios individuales o grupales próximamente.",  // era "Tarifas individuales y por licencia"
},
```

### 9.2 · Editar `src/app/(marketing)/pricing/page.tsx`

Consumir las nuevas keys. Verificar que ninguna string legacy quede en el JSX.

### 9.3 · Criterios

- [ ] 4 strings editados exactamente
- [ ] Sin refs a "Tarifas" en la página ni en el eyebrow
- [ ] Commit: `feat(web-v2): /pricing copy simplification (items 17, 19)`

---

## TASK web-v2-10 · /metodo consistency + PMM label + journey 4 pasos (items 7, 22) · `[x]`

### 10.1 · Quitar "PMM" (item #7)

Ubicar el string `"6 niveles · PMM"` (o similar) en `MethodPillars.tsx` o dentro de `es.ts`. Reemplazar por `"6 niveles"`. Grep para verificar cero refs a "PMM" en la página.

### 10.2 · Journey 4 pasos consistente con Home (item #22)

En `src/app/(marketing)/metodo/page.tsx`, reutilizar `<HowItWorksTimeline/>` (TASK 02) para explicar el proceso — mismo copy exacto. Si `MethodSteps.tsx` renderiza un journey distinto, reemplazarlo o eliminarlo.

### 10.3 · Cero "cursos" en `/metodo`

Grep + fix (regla global de TASK 11).

### 10.4 · Criterios

- [ ] Sin "PMM" visible
- [ ] Journey 4 pasos idéntico al home
- [ ] Cero "cursos"
- [ ] Commit: `feat(web-v2): /metodo remove PMM + consistent journey (items 7, 22)`

---

## TASK web-v2-11 · Purge "cursos" del sitio (item 21) · `[x]`

### 11.1 · Grep + mapeo

```bash
grep -rn "cursos\|Cursos" apps/frontend/src/components/marketing/ apps/frontend/src/app/\(marketing\)/ apps/frontend/src/lib/locales/ | grep -v "\.test\."
```

### 11.2 · Reemplazos válidos según contexto

Usar: `trayectos`, `lecciones`, `micro-aprendizaje`, `contenido curado`, `unidades de aprendizaje`.
**No** usar `cursos`, `curso`.

Casos ya conocidos:
- `WhatWeOffer.tsx` — resuelto por TASK 02 (componente retirado del home)
- `PricingTable.tsx` L8 — `"Catálogo de cursos completos"` → `"Catálogo de trayectos completos"`
- `es.ts` — cualquier ocurrencia de `cursos` en locale → reemplazar según contexto

### 11.3 · Criterios

- [ ] `grep -rn cursos` en marketing + locales retorna 0 matches fuera de tests
- [ ] Commit: `chore(web-v2): purge "cursos" from marketing copy (item 21)`

---

## TASK web-v2-12 · Footer nuevo simplificado (item 27) · `[ ]`

Reescribir `Footer.tsx` con 3 filas + 4 títulos sin sublistas.

### 12.1 · Copy en `es.ts`

```ts
footer: {
  sections: [
    { title: "Plataforma", href: "/plataforma" },
    { title: "Ciencia", href: "/ciencia" },
    { title: "Recursos", href: "#" },   // placeholder · el nav item "Blog" ya cubre esto
    { title: "Contacto", href: "/contacto" },
  ],
  tagline: "Un sistema de crecimiento en 6 dimensiones para profesionales de LatAm.",
  rights: "© 2026 HumanGrowth. Hecho desde LatAm, para LatAm.",
  legal: [
    { label: "Privacidad", href: "#" },
    { label: "Términos", href: "#" },
    { label: "Seguridad", href: "#" },
  ],
  email: "admin@humangrowth.io",
  linkedin: "https://www.linkedin.com/company/humangrowthlatam",
},
```

### 12.2 · Rewrite `Footer.tsx`

3 filas separadas por divisor:

```
┌───────────────────────────────────────────────────────────┐
│ Plataforma   Ciencia   Recursos   Contacto                │  ← fila 1: 4 títulos
├───────────────────────────────────────────────────────────┤
│ [Logo]                              [LinkedIn]  [email]   │  ← fila 2: logo + tagline · socials
│ tagline                                                    │
├───────────────────────────────────────────────────────────┤
│ © 2026 HumanGrowth...          Privacidad · Términos · Seguridad │  ← fila 3
└───────────────────────────────────────────────────────────┘
```

- Logo: `/logo/nav/logo-nav-negro@2x.png` con srcSet responsive.
- Mobile: colapsar en single column con orden lógico.
- Links a `#` con `aria-disabled="true"` + `cursor-not-allowed opacity-60` para que se vean pero no naveguen.

### 12.3 · Criterios

- [ ] 3 filas con divisor `border-t border-border`
- [ ] Sin sublistas debajo de los 4 títulos
- [ ] Mobile responsive
- [ ] Commit: `feat(web-v2): simplified footer 3 rows + 4 titles (item 27)`

---

## TASK web-v2-13 · Language toggle stub ES/EN (item 2) · `[x]`

**UI only.** Contenido EN queda placeholder + label "coming soon".

### 13.1 · Componente `LanguageToggle.tsx`

Crear `src/components/marketing/LanguageToggle.tsx`:

```tsx
"use client";
import { useState } from "react";

export function LanguageToggle() {
  const [lang, setLang] = useState<"es" | "en">("es");
  return (
    <div className="flex items-center gap-1 text-xs font-heading font-semibold uppercase tracking-meta">
      <button
        onClick={() => setLang("es")}
        aria-pressed={lang === "es"}
        className={`px-2 py-1 rounded transition-colors ${lang === "es" ? "text-fg" : "text-fg-subtle hover:text-fg"}`}
      >
        ES
      </button>
      <span className="text-fg-subtle" aria-hidden>·</span>
      <button
        aria-pressed={lang === "en"}
        disabled
        title="Próximamente"
        className="px-2 py-1 rounded text-fg-subtle opacity-40 cursor-not-allowed"
      >
        EN
      </button>
    </div>
  );
}
```

### 13.2 · Wire

Consumido por TASK 08 en el nav (desktop + mobile drawer). Sin lógica i18n real — solo UI.

### 13.3 · Criterios

- [ ] Toggle ES/EN visible en desktop + mobile drawer
- [ ] EN disabled con tooltip
- [ ] Commit: `feat(web-v2): language toggle stub ES/EN (item 2 phase 1)`

---

## TASK web-v2-14 · Página `/perspectivas` + tab (item 14) · `[ ]`

**Andrés confirmó nombre "Perspectivas".**

### 14.1 · Crear `/perspectivas` page

Nueva ruta `src/app/(marketing)/perspectivas/page.tsx`.

Contenido inicial: **migrar la sección "Nuevo este trimestre" del home** (con el dynamic pillar filter que ya existe en `main` — commit `34e355f`) a esta página. Buscar el componente que renderiza esa sección (probablemente `FeaturedPaths.tsx` o un sub-componente) y moverlo/reutilizarlo acá.

Estructura:
- Hero corto: eyebrow "PERSPECTIVAS" + título "Lo nuevo de este trimestre." + subtítulo corto
- Filter chips por pilar (ya existe la lógica)
- Grid de path cards (ya existe)

### 14.2 · Remover la sección del home

En `page.tsx`, eliminar `<FeaturedPaths />` (o el componente equivalente). La página `/perspectivas` es ahora el destino.

### 14.3 · Wire en Nav

Actualizar TASK 08 · Nav para tener un tab adicional **Perspectivas** entre Ciencia y Precios:

```ts
nav: {
  platform: "Plataforma",
  science: "Ciencia",
  perspectives: "Perspectivas",   // NUEVO
  pricing: "Precios",
  blog: "Blog",
  ...
}
```

⚠️ **Con esto son 5 tabs, no 4.** Confirmar con Andrés si Perspectivas es el 5° tab o si reemplaza a alguno. Dado que Jorge dijo "tab nuevo, separado del home", asumir **5 tabs** por ahora.

### 14.4 · Criterios

- [ ] `/perspectivas` renderiza con el filtro de pilares
- [ ] Home ya no tiene "Nuevo este trimestre"
- [ ] Nav muestra Perspectivas en desktop + mobile drawer
- [ ] Commit: `feat(web-v2): /perspectivas page + nav tab (item 14)`

---

## TASK web-v2-15 · Tests + smoke + screenshots · `[ ]`

### 15.1 · Actualizar tests

- Tests que buscaban H1 legacy → buscar `"Habilidades humanas para decisiones..."`
- Tests que buscaban `"Tarifas"` → buscar `"Precios"`
- Tests que buscaban labels legacy en Nav → buscar `Plataforma/Ciencia/Precios/Blog/Perspectivas`
- Tests que buscaban `<MentorStrip>` o `<PricingTable>` en Home → eliminar
- Tests del CTA `Ver rutas` → buscar `Ver dimensiones` (button, no link)

### 15.2 · Smoke manual

Sin login (todo marketing):

- **`/`** (Home): hero nuevo · CTA scroll a #dimensiones · SixPillars watermark · MarketingRadar · WhatIsHg · HowItWorksTimeline · Quote Deloitte · Footer nuevo · **cero** MentorStrip / PricingTable / FeaturedPaths
- **`/metodo`**: sin PMM · radar visible · journey consistente con home
- **`/pricing`**: copy simplificado · eyebrow "PRECIOS"
- **`/perspectivas`**: hero + filter por pilar + grid de paths
- **`/plataforma`, `/blog`**: placeholder "Próximamente."
- **Nav desktop**: 5 tabs (Plataforma, Ciencia, Perspectivas, Precios, Blog) · sin "Solicitar unirse" · toggle ES/EN visible
- **Nav mobile**: hamburger → drawer con los 5 tabs + Iniciar sesión + Conversemos + toggle ES/EN
- **Footer**: 3 filas · 4 títulos · logo + LinkedIn + email · copyright + legal
- **Grep global**: cero "cursos" fuera de tests

### 15.3 · Screenshots `docs/screenshots/web-v2-jorge/`

- `01-home-hero-nuevo.png`
- `02-home-sixpillars-watermark.png`
- `03-home-radar-marketing.png`
- `04-home-whatishg.png`
- `05-home-timeline-4pasos.png`
- `06-home-quote-deloitte.png`
- `07-footer-nuevo.png`
- `08-metodo-sin-pmm-radar.png`
- `09-pricing-copy-simplificado.png`
- `10-perspectivas-page.png`
- `11-nav-desktop-5-tabs.png`
- `12-nav-mobile-drawer-open.png`
- `13-nav-mobile-hamburger-closed.png`

### 15.4 · Criterios

- [ ] Tests verdes (`pnpm test` limpio)
- [ ] Typecheck + lint verdes
- [ ] 13 screenshots
- [ ] Smoke manual OK en desktop + mobile
- [ ] Commit: `test(web-v2): adjust tests + 13 screenshots`

---

# 🎯 Criterios globales "hecho"

- [ ] 15 TASKs commiteadas individualmente
- [ ] Hero copy nuevo + CTA scroll a `#dimensiones`
- [ ] Timeline horizontal 4 pasos "Cómo funciona"
- [ ] Nueva sección "¿Cómo funciona HG?" (Copy A)
- [ ] Quote Deloitte con firma Jorge Araya en español
- [ ] Sin Mentorías ni Tarifas en home
- [ ] MarketingRadar en Home + `/metodo`
- [ ] 6 dimensiones con hex watermark cards
- [ ] Nav 5 tabs (Plataforma/Ciencia/Perspectivas/Precios/Blog) + mobile drawer visible + sin "Solicitar unirse"
- [ ] `/pricing` copy simplificado
- [ ] `/metodo` sin PMM + journey consistente
- [ ] Cero "cursos" en marketing + locales
- [ ] Footer 3 filas + 4 títulos
- [ ] Language toggle ES/EN stub
- [ ] `/perspectivas` + tab + migración de "Nuevo este trimestre"
- [ ] `/plataforma`, `/blog` placeholder
- [ ] Tests verdes · 13 screenshots
- [ ] PR contra `main`

# 📤 Entrega

- SHA último commit
- 13 screenshots
- URL del PR
- Lista de desviaciones
- Nota: qué ítems del feedback Jorge quedaron pendientes (ver §bloqueados)

---

# 🔴 Aún pendiente decisión (no ejecutar)

| # | Ítem | Bloqueo |
|---|---|---|
| 28 | Seguridad · contenido legal | ¿Existe en Drive o solo Priv+Términos? · Andrés confirma después |
| 30 · contenido | Copy/contenido real de Plataforma + Blog | Solo se crean placeholders. Contenido real en addendum futuro |

Todo lo demás está desbloqueado con las 5 respuestas de Andrés (Jul 3 2026).

---

# Status por TASK (editar al avanzar)

| ID | Subject | Status |
|---|---|---|
| web-v2-01 | Hero copy + scroll dimensiones | `[x]` |
| web-v2-02 | Timeline 4 pasos | `[x]` |
| web-v2-03 | WhatIsHg (Copy A) | `[x]` |
| web-v2-04 | Quote Deloitte | `[x]` |
| web-v2-05 | Remove mentors + pricing del home | `[x]` |
| web-v2-06 | MarketingRadar | `[x]` |
| web-v2-07 | SixPillars watermark | `[x]` |
| web-v2-08 | Nav 5 tabs + mobile drawer | `[x]` |
| web-v2-09 | /pricing copy | `[x]` |
| web-v2-10 | /metodo · sin PMM + journey | `[x]` |
| web-v2-11 | Purge "cursos" | `[x]` |
| web-v2-12 | Footer simplificado | `[ ]` |
| web-v2-13 | Language toggle | `[x]` |
| web-v2-14 | /perspectivas page + tab | `[ ]` |
| web-v2-15 | Tests + 13 screenshots | `[ ]` |
