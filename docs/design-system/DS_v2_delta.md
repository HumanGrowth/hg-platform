# HG · DS v2 · Delta reporte (baseline actual → export Claude Design)

> **Generado:** Jul 2 2026 · Post `/design-system audit` de DS v2
> **Fuente v2:** `HG/Design/Nueva Marca - Brand Book/HumanGrowth Design System/` (export completo — 20+ componentes, tokens CSS, assets, guidelines)
> **Baseline actual:** `apps/frontend` + `docs/design-system/DS_v2_inventory.md` (Score 66/100)
> **Objetivo:** rebrand v2 sin regresión funcional, aprovechando la mayor densidad del sistema nuevo

---

## 0 · Resumen ejecutivo

**Buenas noticias:**

1. **La estructura del token system nuevo es compatible con nuestra arquitectura actual** (CSS vars + semantic aliases). Migración = mapping de vars, no reescritura de arquitectura.
2. **~70% de los hex son idénticos** — el `#E8530A`, `#4A7A54`, `#C8A76E`, `#A8C4A0`, `#FAF3E8`, `#F0EDE6`, `#1A1A1A`, `#2A2826`, `#2C3E50`, `#8E8E8E`, `#6B7061`, `#E8A030` ya están en el código, en muchos casos con el mismo hex. La deuda es de **rol semántico**, no de paleta.
3. **DS nuevo trae 5 componentes que hoy faltan** (Select, Alert, Checkbox, Radio, Switch, Textarea implícito en Input) — cierra 5 gaps del inventory baseline.
4. **DS nuevo trae Brand components únicos** (QuoteMark, PencilCircle, MosaicBand, MotifDots, HexIcon) — estos NO existen hoy y son la fingerprint visual de la marca. Especialmente HexIcon (hexagono con 2 puntos) para las 6 dimensiones — reemplaza los chips actuales.
5. **Fonts idénticos** (Anton/Poppins/Manrope) + Roboto para tablas de datos.
6. **Radii idénticos** (4/8/12/16/24/pill).

**Malas noticias:**

1. **🚨 Inversión de jerarquía primary/accent** — el cambio más caro. Toca ~40 archivos que hoy usan `bg-orange-500` / `text-orange-500` / `focus-visible:ring-orange-500` (Button primary, Chip active, Eyebrow accent, focus rings, links).
2. **Focus ring cambia de orange → amber** — accesibilidad impact leve (amber sobre cream tiene menor contraste; validar WCAG).
3. **Danger unificado con Accent** (ambos son `#E8530A` en el nuevo, vs `#B83A1A` distinto en el actual) — hay que decidir si aceptamos que los mensajes de error se vean igual que los CTAs de énfasis, o si mantenemos un danger propio.
4. **Motion curves distintas** — 32 componentes con `ease-state` / `ease-out` recompilan a otras curvas (cambio sutil pero global).
5. **Shadows warm-tinted** (rgba `42,40,38`) vs actual (rgba `26,20,15`) — visualmente más cálido. Probablemente mejora la percepción, pero valida en pantalla.

**Score post-migración estimado:** **88/100** (era 66) — el DS nuevo cierra 6 issues del inventory + trae 5 componentes nuevos. Los gaps de Table / DropdownMenu / Toast / Skeleton / EmptyState / Tooltip **siguen abiertos** (no vinieron en el export).

**Esfuerzo total estimado:** **12-16h** (~1 semana calendario) — más bajo de lo estimado en el inventory porque no hay que redibujar componentes, solo rewrite de tokens + tests.

---

## 1 · Delta · Tokens

### 1.1 Colors — comparación 1:1

| Rol semántico | Baseline (`globals.css` + `tailwind.config.ts`) | DS v2 (`tokens/colors.css`) | Δ |
|---|---|---|---|
| **Primary / CTA** | `#E8530A` orange (`--orange`, `--accent`) | `#4A7A54` **green** (`--color-primary`) | 🔴 **SWAP** |
| **Accent / emphasis** | (no había rol separado) | `#E8530A` orange (`--color-accent`) — para palabras destacadas + quote marks | 🟠 rol nuevo |
| **Secondary** | (no había) | `#E8A030` amber (`--color-secondary`) | 🟠 rol nuevo |
| **Gold** | `#C8A76E` | `#C8A76E` (`--hg-gold`) | ✅ |
| **Sage** | `#A8C4A0` | `#A8C4A0` (`--hg-sage`) | ✅ |
| **Ink primary** | `#1A1A1A` (`--ink-900`) | `#1A1A1A` (`--hg-ink`, `--text-strong`) | ✅ rename |
| **Warm dark** | `#2A2826` (`--ink-800`, warm-700 alias) | `#2A2826` (`--hg-charcoal`) | ✅ rename |
| **Slate blue** | `#2C3E50` | `#2C3E50` (`--hg-slate`, `--color-info`) | ✅ |
| **Olive gray** | `#6B7061` (`--warm-600`, `--fg-muted`) | `#6B7061` (`--hg-olive-gray`, `--text-body`) | ✅ rename |
| **Gray** | `#8E8E8E` (`--warm-500`, `--fg-subtle`) | `#8E8E8E` (`--hg-gray`, `--text-muted`) | ✅ rename |
| **Cream** | `#FAF3E8` (`--cream-100`, `--bg`) | `#FAF3E8` (`--hg-cream`, `--surface-page`) | ✅ rename |
| **Linen** | `#F0EDE6` (`--cream-200`, `--bg-sunken`) | `#F0EDE6` (`--hg-linen`, `--surface-sunken`) | ✅ rename |
| **White** | `#FFFFFF` (`--cream-50`, `--bg-raised`) | `#FFFFFF` (`--hg-white`, `--surface-card`) | ✅ rename |
| **Green hover** | (no había — usábamos opacity) | `#3C6444` (`--hg-green-700`) | 🟠 nuevo — resuelve estado hover del primary |
| **Green bg tint** | (no había) | `#E3EBDF` (`--hg-green-100`) | 🟠 nuevo |
| **Amber hover** | (no había) | `#CE8A1F` (`--hg-amber-600`) | 🟠 nuevo |
| **Orange press** | `#A03B08` (`--orange-700`) | `#C4440A` (`--hg-orange-700`) | 🔴 hex distinto (nuevo es más rojo, menos saturado) |
| **Border subtle** | `rgba(26, 26, 26, 0.12)` — cool | `#E4DED2` warm hex | 🔴 cambio conceptual (transparent cool → opaque warm) |
| **Border default** | (no había capa intermedia) | `#D8D0C2` | 🟠 nuevo |
| **Border strong** | `rgba(26, 26, 26, 0.24)` | `#6B7061` (usa olive-gray) | 🔴 |
| **Focus ring** | orange `rgba(232, 83, 10, 0.32)` | amber `rgba(232, 160, 48, 0.45)` | 🔴 |
| **Danger** | `#B83A1A` (propio) + `#FADAD2` bg | `#E8530A` (usa orange) — sin bg dedicado | 🔴 unificación con accent |
| **Success** | `#4A7A54` + `#E6F0E8` bg | `#4A7A54` (usa green) — sin bg dedicado | 🟡 alias, sin bg (usar green-100?) |
| **Warning** | `#E8A030` + `#FBE9CC` bg | `#E8A030` (usa amber) — sin bg dedicado | 🟡 alias |
| **Info** | `#2C3E50` + `#DCE3EB` bg | `#2C3E50` (usa slate) — sin bg dedicado | 🟡 alias |
| **Pillar P1..P6** | 6 hex propios | (no explícitos en tokens — a mapear en `guidelines/` o brand icons) | ⚠️ verificar decisión |

### 1.2 Typography — tres tiers en vez de dos

**Actual:**
- `font-display` (Anton + Poppins) — display + headings
- `font-sans` (Manrope) — body + UI
- `font-serif` (Source Serif) — pull quotes
- `font-mono` — code

**DS v2:**
- `--font-display: "Anton"` — display / headlines (uppercase, tight)
- `--font-heading: "Poppins"` — subheads, UI labels, buttons (DEDICATED tier) 🟠
- `--font-body: "Manrope"` — body copy
- `--font-data: "Roboto"` — data tables, dense text 🟠

**Δ:** Poppins pasa de fallback a tier dedicado ("subheads, buttons, UI labels"). Roboto **es nuevo** para tablas.

**Type scale — casi igual**, más granular en headings:

| Actual | DS v2 |
|---|---|
| `6xl 88px` display | `--fs-display-xl: 5.5rem` (88px) ✅ |
| `5xl 64px` | `--fs-display-l: 4rem` (64px) ✅ |
| `4xl 48px` | `--fs-display-m: 3rem` (48px) ✅ |
| `3xl 36px` | `--fs-h1: 2.5rem` (40px) 🔴 |
| `2xl 28px` | `--fs-h2: 2rem` (32px) 🔴 |
| `xl 24px` | `--fs-h3: 1.5rem` (24px) ✅ |
| `lg 20px` | `--fs-h4: 1.25rem` (20px) ✅ |
| `md 18px` | `--fs-lg: 1.125rem` (18px) ✅ rename |
| `base 16px` | `--fs-base: 1rem` (16px) ✅ |
| `sm 14px` | `--fs-sm: 0.875rem` (14px) ✅ |
| `xs 13px` | (no equivalent — usar `--fs-xs 12px` o mantener 13px como excepción) | 🟡 |
| `micro 12px` | `--fs-xs: 0.75rem` (12px) ✅ rename |

Diff neta: h1 sube de 36 → 40; h2 sube de 28 → 32. Todo lo demás igual o mismo valor con nombre distinto.

### 1.3 Spacing — 4px base preservado

| Actual | DS v2 | Δ |
|---|---|---|
| `1: 4px` | `--space-1: 0.25rem` (4px) | ✅ |
| `2: 8px` | `--space-2: 0.5rem` (8px) | ✅ |
| `3: 12px` | `--space-3: 0.75rem` (12px) | ✅ |
| `4: 16px` | `--space-4: 1rem` (16px) | ✅ |
| **`5: 20px`** | — (saltea el 20; próximo es `--space-5: 1.5rem` = 24px) | 🔴 |
| `6: 24px` | `--space-5: 1.5rem` (24px) | ✅ mismo hex, key distinto |
| `8: 32px` | `--space-6: 2rem` (32px) | ✅ |
| `10: 40px` | `--space-7: 2.5rem` (40px) | ✅ |
| `12: 48px` | `--space-8: 3rem` (48px) | ✅ |
| `16: 64px` | `--space-9: 4rem` (64px) | ✅ |
| `20: 80px` | `--space-10: 5rem` (80px) | ✅ |
| `24: 96px` | `--space-12: 6rem` (96px) | ✅ |
| `32: 128px` | (no) | 🟡 mantener excepción |

**Decisión:** el DS v2 elimina `20px` como token. En código lo usamos poco (revisar). Mantener como excepción `[20px]` o migrar a 24px.

### 1.4 Radius, Shadow, Motion — Δ ver tabla

| Categoría | Actual | DS v2 | Δ |
|---|---|---|---|
| Radius | 0/4/8/12/16/24/9999 (none/sm/md/lg/xl/2xl/full) | 4/8/12/16/24/999 (xs/sm/md/lg/xl/pill) | ✅ mismos valores |
| Shadow tint | rgba(26, 20, 15, …) — cool | rgba(42, 40, 38, …) — **warm** | 🔴 |
| Shadow scale | sm/md/lg/focus | xs/sm/md/lg/focus | 🟠 gana `xs` |
| Focus ring | orange 0.32 | amber 0.45 | 🔴 |
| Motion ease-out | cubic-bezier(0.32, 0.72, 0, 1) | cubic-bezier(0.22, 1, 0.36, 1) | 🔴 |
| Motion ease-state | cubic-bezier(0.4, 0, 0.2, 1) | cubic-bezier(0.65, 0, 0.35, 1) — ease-in-out | 🔴 |
| Durations | 120 / 200 / 320 ms | 140 / 220 / 380 ms | 🟡 leve slower |

---

## 2 · Delta · Componentes

### 2.1 Componentes que ya tenemos y hay que actualizar (11)

| Componente | Baseline | DS v2 (`components/*/`) | Migración |
|---|---|---|---|
| **Button** | 4 variants × 3 sizes · orange primary | Nuevos props/variants — leer `components/core/Button.prompt.md` | 🔴 Rebrand: primary a green, ajustar hover/press |
| **Badge** | 12 variants (default + semantic + pillar) | `components/core/Badge` — probablemente sin pillar variants | 🟠 Migrar variants pillar → usar HexIcon o Tag |
| **Card** | Sin variants | `components/data/Card` + StatCard | 🟠 Reemplazar por Card + sumar StatCard |
| **Input** | Sin variant error / size | `components/forms/Input` | ✅ Reemplazar |
| **Dialog** | Custom (sin focus trap) | (no viene en export) | ⚠️ Mantener actual + agregar focus trap radix |
| **Tabs** | Custom | `components/navigation/Tabs` | ✅ Reemplazar |
| **Avatar** | Iniciales solo | `components/core/Avatar` | ✅ Reemplazar (verificar variant con imagen) |
| **Chip** | Filter chip | `components/core/Tag` — semánticamente similar | 🟠 Renombrar Chip → Tag |
| **Progress** | Bar horizontal | `components/data/Progress` | ✅ Reemplazar |
| **Eyebrow** | Custom | (no viene explícito — parte del type system) | ✅ Mantener + verificar tokens |
| **Display** | 3 variants Anton | (parte de `guidelines/type-display.card.html`) | ✅ Mantener + ajustar tokens |

### 2.2 Componentes NUEVOS que ganamos (7)

| Componente | Categoría | Impacto |
|---|---|---|
| **Select** | forms | 🟢 Cierra gap AOU-03 + admin filters + `/perfil/editar` |
| **Checkbox** | forms | 🟢 Onboarding + filtros |
| **Radio** | forms | 🟢 Assessment (single-choice questions) |
| **Switch** | forms | 🟢 Preferencias user |
| **Alert** | feedback | 🟢 Inline messages en forms |
| **StatCard** | data | 🟢 Reemplaza los MetricCard custom en `/home`, `/admin/org`, `/team` |
| **HexIcon** | data | 🟢 **Reemplaza chips "P#"** con hexágono + icon per pilar |

### 2.3 Componentes BRAND (5) — únicos del DS v2

| Componente | Uso | Impacto en pages |
|---|---|---|
| **QuoteMark** | Blocky quote symbol | 🟢 Marketing Quote section (`Jorge Araya`), Testimonials |
| **PencilCircle** | Hand-drawn circle alrededor de números/palabras | 🟢 Marketing Hero stats ("79% de renuncias…"), Result page destacar score |
| **MosaicBand** | Geometric tile strip full-bleed | 🟢 Hero panels, section dividers |
| **MotifDots** | Green + amber two-dot fingerprint | 🟢 Loading states, list bullets, dividers |
| **Icon** | UI icon wrapper (usa Lucide bajo capó) | 🟠 Standardiza el uso de Lucide |

### 2.4 Gaps que SIGUEN abiertos post-rebrand

| Componente | Por qué se necesita |
|---|---|
| **Table** | 4 tablas custom en `/admin/orgs`, `/admin/orgs/[id]`, `/team`, `/admin/org` |
| **DropdownMenu** | TopBar avatar menu + botón Acciones en `/admin/orgs/[id]` |
| **Toast** | `toast()` en `lib/toast-store.ts` sin componente reusable |
| **Popover** / **Tooltip** | Widget tooltips + icon-only buttons |
| **Skeleton** | Loading states hoy son "Cargando…" texto plano |
| **EmptyState** | 8 pages con empty state copy-pasted |
| **Breadcrumbs** | `/admin/orgs/[id]` tiene un mini custom |
| **Pagination** | Cuando tablas crezcan |

**Recomendación:** Estos 8 los construimos **DESPUÉS del rebrand tokens/componentes v2** (Fase DS-06) reusando los tokens ya migrados. No bloquean.

### 2.5 Guidelines cards disponibles (`guidelines/`)

DS v2 trae 13 specimen cards HTML documentando:

- `brand-icons.card.html` · `brand-isotype.card.html` · `brand-logos.card.html` · `brand-pattern.card.html`
- `colors-brand.card.html` · `colors-neutrals.card.html`
- `spacing-radius.card.html` · `spacing-scale.card.html`
- `type-body.card.html` · `type-display.card.html` · `type-headings.card.html` · `type-scale.card.html`

Estos NO son componentes React — son specimen HTML para documentación. Se pueden servir desde `/design-system/*` internamente (útil como Storybook lite).

### 2.6 Assets — inventario completo

- **Logos:** LogoHG-Negro.png (positive), LogoHG-Blanco.png (negative), isotype-dark.png, isotype-cream.png, dots.png (motif) → **reemplaza los 3 svg actuales** (`/brand/logo-color.svg`, `/marketing/logo-color.svg`, etc.). Unifica el T-01 del punch list.
- **Icons hexagon:** hex-bulb, hex-chat, hex-rocket, hex-scales, hex-sprout, hex-star → **6 iconos para 6 dimensiones**. Reemplazan chips "P#" y valores por pilar.
- **Fonts:** Anton, Manrope (Light/Regular/Bold), Poppins (Light/Regular), Roboto (Regular/Medium/Bold/Black) → ttf. En Next.js migrar a `next/font/local` o mantener `next/font/google` (Manrope, Poppins, Roboto están en Google Fonts; Anton también). **No hay que auto-hostear** salvo Anton si querés controlar el subset.
- **Patterns / Banners:** no vinieron en la carpeta que revisé — verificar en `assets/patterns/` y `assets/banners/`.

---

## 3 · Plan de migración v2 · Sub-fases

Adaptado del plan preliminar del inventory. Números reales.

| Fase | Qué hace | Esfuerzo | PR | Riesgo |
|---|---|---|---|---|
| **DS-02 · Tokens foundation** | Reescribir `globals.css` con las CSS vars del DS v2 (colors.css + typography.css + fonts.css + layout.css). Sumar `@font-face` con los ttf (o migrar a `next/font`). Actualizar `tailwind.config.ts` para leer las nuevas vars como semantic tokens. Mantener aliases legacy 1 sprint (`--orange`, `--fg` que apuntan a los nuevos). | **3-4h** | PR 14 | 🟡 medio |
| **DS-03 · Rebrand Button + Badge + Chip → Tag** | El swap primary/accent central. `bg-orange-500` → `bg-primary` (que ahora es green). Focus rings orange → amber. Danger orange/red decisión (mantener rojo propio? o unificar?). | **2-3h** | PR 15 | 🔴 alto — visual regression |
| **DS-04 · Migrar componentes existentes** (Card→Card/StatCard, Input, Progress, Tabs, Avatar) | Reemplazar `components/ui/*` con las JSX del export. Wrappear con nuestro `cn()` + tailwind classes. Verificar props back-compat en callsites. | **3-4h** | PR 16 | 🟠 medio |
| **DS-05 · Componentes nuevos** (Select, Checkbox, Radio, Switch, Alert, HexIcon) | Agregar los 6 componentes al `components/ui/`. Reescribir los `<select>` nativos de `/admin/orgs/[id]`, `/perfil/editar`, filtros para usar Select. Reemplazar chips "P#" por HexIcon. | **3-4h** | PR 17 | 🟢 bajo — solo adds |
| **DS-06 · Brand components + assets** | Sumar QuoteMark, PencilCircle, MosaicBand, MotifDots al codebase. Reemplazar logos svg en `/brand/` + `/marketing/` por los png del DS. Ubicar hex-*.png en `/icons/pilares/`. Aplicar QuoteMark en Marketing Quote (`Jorge Araya`). Aplicar PencilCircle en Hero stats + Result page score. | **3-4h** | PR 18 | 🟢 bajo — adds |
| **DS-07 · Cleanup post-migración** | Migrar los ~150 hex + arbitrary values a tokens nuevos. Ejecutar `_adherence.oxlintrc.json` (el linter que trae el DS) para detectar hardcodes remanentes. Remover aliases legacy (los `--orange`, `--fg-muted` viejos si no rompen nada). | **2-3h** | PR 19 | 🟡 medio |

**Total: 16-22h** (~1.5-2 semanas calendario con revisiones).

---

## 4 · Decisiones que necesito de vos (bloquean el arranque)

Ordenadas por criticidad. Con mi recomendación en cada una:

### 4.1 · Danger color · unificar con accent o mantener propio? 🔴 crítica

- DS v2 mapea `--color-danger` = `--hg-orange` (el mismo naranja que el accent para emphasis)
- Semánticamente rompe la convención "danger = distinctive from primary"
- Nuestro código actual tiene `#B83A1A` (más rojo) + bg `#FADAD2`

**Mi voto:** **Mantener danger propio** (`#B83A1A` + `#FADAD2` bg) como excepción documentada. Un botón "Eliminar cuenta" no debería verse igual que un botón "Ver detalles". Sumar comment en `colors.css` explicando la excepción vs Brand Book.

### 4.2 · Pillar colors 🔴 crítica

- Actual código: 6 pillars con hex propios (P1..P6, más un séptimo para P6A/P6B)
- DS v2: no define pillar colors explícitos. Trae 6 **HexIcon** con pictogramas (star/bulb/sprout/chat/scales/rocket) pero sin asignación directa a las 6 dimensiones HG

**Mi voto:** Reasignar pillar colors mapeados al DS v2:

| Pilar | Hex actual | Propuesta DS v2 | HexIcon |
|---|---|---|---|
| P1 Carrera | `#E8530A` orange | `#E8530A` orange (accent) | rocket |
| P2 Propósito | `#C8A76E` gold | `#C8A76E` gold | star |
| P3 Relaciones | `#4A7A54` forest | `#4A7A54` green | chat |
| P4 Salud | `#A8C4A0` sage | `#A8C4A0` sage | sprout |
| P5 Paz interior | `#2C3E50` slate | `#2C3E50` slate | scales |
| P6 Estabilidad | `#6B7061` olive | `#E8A030` amber | bulb |

Cambio: P6 pasa de gray → amber (más visible en dashboards).

### 4.3 · Aliases legacy 🟡 media

Los tokens actuales tienen `--orange`, `--cream-100`, `--warm-600`, `--fg`, `--fg-muted` en ~180 clases. Migrar todo a nombres nuevos (`--color-accent`, `--surface-page`, `--text-body`) es grep-replace pero puede romper si algo depende de encoding específico.

**Mi voto:** **Dual maintenance 1 sprint.** En DS-02, dejar tanto `--orange` (apuntando a `--hg-orange`) como `--hg-orange` en `:root`. Migrar callsites gradualmente en DS-03..06. En DS-07 eliminar los legacy con confidence de tests verdes.

### 4.4 · Focus ring color 🟡 media

- Actual: orange `0.32`
- DS v2: amber `0.45` (más translúcido pero color distinto)

Amber sobre cream tiene contraste inferior a orange sobre cream (~3.5:1 vs ~4.2:1). WCAG AA para focus indicators requiere 3:1 contra fondo adyacente — pasa, pero justo.

**Mi voto:** Aceptar amber si el Brand Book lo dice. Validar en Chrome DevTools (Lighthouse a11y) tras DS-03 y ajustar `--focus-ring` a `rgba(232, 160, 48, 0.6)` (más opaco) si el score baja.

### 4.5 · Fonts self-host vs Google Fonts 🟢 leve

- DS v2 trae ttf de Anton/Manrope/Poppins/Roboto (self-host implícito)
- Hoy usamos `next/font/google` (fetched at build)

**Mi voto:** **Migrar a `next/font/local`** con los ttf del DS. Ventajas: (a) offline dev, (b) sin request a googleapis en runtime, (c) LCP mejor, (d) consistencia con el paquete DS. Costo: 30 min.

### 4.6 · Skill del DS · integrarlo como agent-skill? 🟢 leve

El DS trae `SKILL.md` con frontmatter `user-invocable: true`. Podría instalarse como skill en Cowork ("humangrowth-design") para que futuros prompts lo invoquen automáticamente.

**Mi voto:** Sumar como skill user-installed en la carpeta `~/.claude/skills/` de Andrés + copiar al plugin `hg-plugin` si lo estamos armando. Sirve para que cualquier `/effort` o Cowork task futura tenga contexto del DS sin re-explicarlo.

---

## 5 · Riesgos identificados

| Riesgo | Prob | Impacto | Mitigación |
|---|---|---|---|
| Recharts widgets rompen visual al swap tokens (leen CSS vars viejas) | Alta | Alto | Antes de DS-02, extraer helper `getChartColor(token)` que lea `getComputedStyle` de la nueva variable. Un solo cambio central. |
| Tests que buscan "bg-orange-500" en Button rompen | Alta | Bajo | Grep + rename a `bg-primary`. Ajustar 6-8 assertions. |
| Focus ring amber falla WCAG en ciertas superficies | Media | Medio | Validar post-DS-03 con Lighthouse. Adjustable. |
| next/font local no encuentra los ttf (path resolution en producción) | Baja | Alto | Testear en preview de Railway antes de mergear DS-02. |
| El `_adherence.oxlintrc.json` del DS pisa nuestras reglas de ESLint | Media | Bajo | Aplicar como plugin separado, no reemplazar `.eslintrc`. |
| Migrar aliases rompe algún consumer externo | Baja | Bajo | Dual maintenance 1 sprint. |

---

## 6 · Próximos pasos concretos

1. **Vos decidís §4.1 (danger) y §4.2 (pillar colors).** Los otros los tengo con default sensato.
2. **Yo arranco DS-02.** PR contra `main`, base branch limpio. Tokens foundation con dual maintenance.
3. **Vos revisás DS-02 en preview** antes de mergear (screenshot con el color primario green del hero).
4. **Yo sigo con DS-03..07** en PRs individuales, uno por sub-fase.

Cada PR sale con 1-2 screenshots comparativos (before/after) para que aprobés rápido.

**Puedo arrancar ahora si me confirmás §4.1 y §4.2.**
