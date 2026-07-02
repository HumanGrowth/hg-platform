# HG · Design System Audit · v1 → v2 baseline

> **Generado:** Jul 2 2026 · `/design-system audit` skill · baseline pre-v2 rebrand
> **Scope:** `apps/frontend` · 106 files .tsx · 11 componentes UI · tokens en `tailwind.config.ts` + `globals.css`
> **Contexto:** Sirve de baseline para comparar contra el DS nuevo en Claude Design (`d4717488-...`) una vez autorizado el connector. Cuando esté, se genera `DS_v2_delta.md` (delta) + plan de migración.

---

## 0 · Summary

**Componentes revisados:** 11 · **Issues encontrados:** 24 · **Score:** 66 / 100

**Interpretación:**
Base sólida (tokens semánticos wired a CSS vars ✅, cva en los 3 componentes que más varían ✅, dark mode escafoldado ✅, prefers-reduced-motion ✅) con deuda concreta en 2 ejes: **componentes base faltantes** (Select/Textarea/Table/Toast/DropdownMenu son inline en cada page) y **hardcoded values dispersos** (46 hex + 78 arbitrary + 32 inline styles fuera de `components/ui/`).

Para el rebrand v2: los tokens son un swap trivial (editar `globals.css` + `tailwind.config.ts` afectan a toda la app). El costo real está en (a) los ~150 hardcoded values fuera del token system y (b) el desprolijo de widgets Recharts que usan hex directo en vez de leer CSS vars.

---

## 1 · Naming Consistency

| Issue | Componentes / Ejemplos | Recomendación |
|---|---|---|
| **Aliases legacy en la paleta** — `warm-700`, `warm-900`, `cream-300`, `orange-500`, `orange-800` son duplicados de `ink-800`, `ink-900`, cream derivado, `orange.DEFAULT`, `orange-700` | tailwind.config.ts L23-49 | En v2: eliminar aliases. Migrar las ~25 clases legacy (`bg-orange-500` × 25, `bg-cream-300`, `text-warm-900`) a los tokens semánticos primarios (`bg-accent`, `bg-bg-sunken`, `text-fg`) |
| **Pillar codes P1-P6 vs P1-P5+P6A+P6B** — tailwind define 6 tokens (`pillar.p1..p6`) pero el motor de assessment devuelve 7 estados | `tailwind.config.ts` L77-84 vs `lib/pillars.ts` | Ya cubierto en polish_app TASK 06 con `PILLAR_FULL_LABEL`. Sumar `pillar.p6a` + `pillar.p6b` a tokens si el DS nuevo los tiene separados |
| **`Badge` variants con "pillar-p1..p6"** — mezcla naming semántico con dominio de negocio | `components/ui/badge.tsx` L14-21 | Separar en 2 componentes: `Badge` (semantic: default/success/warning/danger/info) + `PillarBadge` (domain: p1..p6a..p6b) |
| **`display-1 / display-2 / display-3`** — buen naming, pero fontFamily mezcla `display` + `sans` sin claridad | `display.tsx` + tailwind fontFamily | En v2, si el DS nuevo separa headings serif/sans, agregar variant `display-serif` |
| **`Card` no tiene variants** — 16 usages, todos usan el mismo look | `card.tsx` | Sumar variants: `default`, `elevated` (shadow-lg), `outlined` (border-strong, no bg), `sunken` (bg-bg-sunken) |
| **`Chip` vs `Badge`** — Chip = filter interactivo, Badge = label estático. OK conceptualmente, pero visualmente casi idénticos | `chip.tsx`, `badge.tsx` | Documentar en un `components.md` la diferencia (Chip lleva `role="button"`, `aria-pressed`) |

---

## 2 · Token Coverage

| Categoría | Definidos en config/vars | Instancias fuera del token system | Nivel |
|---|---|---|---|
| **Colors (hex)** | 15 tokens brand + 4 semantic pairs + 6 pillar + 8 CSS vars | **46 instances** de `#xxxxxx` en `components/`, `lib/` (excl. `ui/`) | ⚠️ Alto |
| **Colors (arbitrary Tailwind)** | Toda la paleta | **23 instances** de `bg-[#..]`, `text-[#..]`, `border-[#..]` | ⚠️ Medio |
| **Spacing** | 4/8/12/16/20/24/32/40/48/64/80/96/128 explícitos | **78 instances** de `[Npx]` o `[Nrem]` arbitrary | ⚠️ Medio |
| **Typography** | 12 sizes (micro..6xl) + 4 fontFamily vars | 0 hardcoded font-size fuera del sistema (bien) | ✅ |
| **Radius** | none/sm/md/lg/xl/2xl/full | 0 arbitrary | ✅ |
| **Shadow** | sm/md/lg/focus | 0 arbitrary | ✅ |
| **Motion** | ease-out/ease-state + 4 durations | 0 arbitrary | ✅ |
| **Inline styles (`style={{...}}`)** | — | **32 instances** — todas en Recharts widgets + 1 en Dialog scrim | ⚠️ Widgets Recharts necesitan API distinto de className |

### Top offenders (hardcoded hex)

| Archivo | Contexto | Fix probable |
|---|---|---|
| `components/widgets/AdoptionCurve.tsx`, `InactivityFunnel.tsx`, `MonthlyWatchBar.tsx`, `WeeklyMinutesBar.tsx`, `ProgressRingsByPath.tsx`, `OnboardingFunnelChart.tsx` | Recharts `fill="#..."`, `stroke="#..."` | Extraer helper `getChartColor(token: 'accent' \| 'success' \| ...)` que lea `getComputedStyle(document.documentElement).getPropertyValue('--orange')`. Ver [Recharts + CSS vars](https://recharts.org/en-US/api) |
| `components/marketing/Hero.tsx`, `Quote.tsx`, `PathCard.tsx`, `PathsCatalog.tsx`, `MentorStrip.tsx` | Gradientes CSS + accents inline | Migrar a Tailwind `bg-gradient-to-b from-accent to-orange-700` |
| `components/radar/Radar.tsx` | Recharts polar radar con 6 hex de pillar | Wrappear en `usePillarColors()` hook |
| `lib/widget-utils.ts` | Palette local para widgets | Consolidar con `pillar` tokens de tailwind — single source of truth |

---

## 3 · Component Completeness

### Existentes (11)

| Component | States | Variants | A11y | Docs | Score | Notas |
|---|---|---|---|---|---|---|
| **Button** | hover/active/focus/disabled ✅ | 4 variants × 3 sizes ✅ | focus-visible ring ✅ | ⚠️ | **9/10** | Excelente. Falta `loading` state (spinner) para forms async |
| **Badge** | — (estático) | 12 variants ✅ (default + 4 semantic + 6 pillar + earned) | — | ⚠️ | **7/10** | Ver separación en `Badge` + `PillarBadge` |
| **Display** | — | 3 variants ✅ | `as` prop para h1-h3 ✅ | ⚠️ | **8/10** | Bien pero sin variant serif — DS v2 lo va a necesitar |
| **Card** | hover shadow ✅ | 0 variants ❌ | — | ⚠️ | **6/10** | Sumar `elevated/outlined/sunken` variants; sub-componentes CardHeader/Title/Description/Content/Footer OK |
| **Input** | focus/disabled ✅ | 0 variants ❌ | — | ❌ | **5/10** | Sin variant `error` (bordered danger + aria-invalid), sin size `sm/lg`, sin `<Input.Group/>` con icon left/right |
| **Dialog** | open/close + esc + scrim ✅ | 0 variants ❌ | `role=dialog` + `aria-modal` + focus trap ⚠️ (no trap real) | ⚠️ | **6/10** | Falta focus trap real (radix `Dialog.Portal`), sizes (`sm/md/lg`), scroll interno para content largo, animación de exit |
| **Tabs** | activo/hover ✅ | 0 variants ❌ | keyboard nav parcial ⚠️ | ⚠️ | **6/10** | Falta soporte `roving tabindex` completo, orientación vertical, tabs con badge count |
| **Avatar** | — | 3 sizes ✅ | `aria-label` ✅ | ✅ | **8/10** | Falta variant con imagen (hoy solo iniciales) + fallback |
| **Chip** | active/hover/focus ✅ | 1 variant (active/inactive) | `aria-pressed` ✅ | ⚠️ | **7/10** | Falta size `sm/lg`, variant `removable` (con X) |
| **Progress** | — | 0 variants | — | ⚠️ | **5/10** | Solo bar horizontal. Sin `ring` variant (donut), sin label, sin indeterminate |
| **Eyebrow** | — | 1 variant (accent/default) | — | ⚠️ | **7/10** | Simple pero cumple. Falta variant `serif-italic` para pull quotes |

### Missing (16 componentes comunes que hoy se re-implementan inline en pages)

| Component | Impacto | Cuántas veces se re-implementa |
|---|---|---|
| **Select** | 🔴 Alto | Al menos 5 `<select>` nativos en `/admin/orgs/[id]`, `/perfil/editar`, filtros de `/team`, `/library` |
| **Textarea** | 🟠 Medio | `/contacto` form, `/perfil/editar` bio |
| **Table** | 🔴 Alto | `/admin/orgs`, `/admin/orgs/[id]`, `/team`, `/admin/org` — cada uno tiene su propio markup `<table>` con clases duplicadas |
| **Toast** | 🟠 Medio | Existe `toast()` en `lib/toast-store.ts` pero sin componente reusable (probablemente usa Sonner) |
| **DropdownMenu** | 🔴 Alto | TopBar avatar (menu con "Editar / Modo admin / Logout"), botón Acciones en `/admin/orgs/[id]` (`Desactivar / Cambiar rol / Reasignar manager`) |
| **Popover** | 🟠 Medio | Info tooltips en widgets del dashboard |
| **Tooltip** | 🟠 Medio | Chips de pilar, botones con icon-only |
| **Skeleton** | 🟠 Medio | Loading states hoy son "Cargando…" en texto plano — se ven pobres |
| **Alert** | 🟡 Bajo | Notificaciones inline en forms |
| **Checkbox / Radio / Switch** | 🟠 Medio | Onboarding, filtros multi-select |
| **EmptyState** | 🟠 Medio | Aparece copy-pegado en 8 pages (`/team` vacío, `/library` sin cursos, `/perfil` sin evaluación, etc.) |
| **Breadcrumbs** | 🟡 Bajo | `/admin/orgs/[id]` tiene un mini-breadcrumb custom |
| **Pagination** | 🟢 Post-v2 | No urge — tablas cortas por ahora |
| **Accordion** | 🟢 Post-v2 | Marketing FAQ (que quitamos), roadmap |

### Usage heatmap

```
eyebrow    ████████████████████ 20 files
card       ████████████████     16 files
display    █████████████        13 files
button     ████████████         12 files
badge      ███████████          11 files
input      ████████              8 files
dialog     ███████               7 files
avatar     ██████                6 files
chip       ███                   3 files
progress   ███                   3 files
tabs       ██                    2 files
```

`Eyebrow`, `Card`, `Display`, `Button`, `Badge` son la spine del DS actual. Si el DS nuevo los rediseña, el impacto se propaga a **~70% de las pages** con un solo cambio.

---

## 4 · Patterns comunes (fuera del `components/ui/*`)

Patrones que se repiten y deberían ser componentes:

- **Widget container** (Recharts wrapper con title + note + empty state) — 8 duplicaciones en `components/widgets/`
- **Sticky top banner** (Beta banner + toast + acting-as banner) — 3 implementaciones distintas
- **Sidebar item** (NavItem con icon + label + active state + tooltip) — 2 componentes: `SideNav` y `BottomNav "Más" drawer`
- **Filter bar** (Chips arriba de listas) — 4 duplicaciones (`/library`, `/team`, `/admin/orgs/[id]`, `/perfil` retake cards)
- **Metric card** (número grande + eyebrow + delta) — 6 duplicaciones en `/home`, `/admin/org`, `/team`

---

## 5 · Priority Actions (baseline actual, PRE-DS v2)

En orden de ROI (impacto ÷ esfuerzo):

1. **🟢 Crear `Select` + `Table` + `DropdownMenu`** (S-M) — desbloquea consistencia inmediata en 4 pages admin. Estimación: 2-3h con radix como base.
2. **🟢 Extraer helper `usePillarColors()` + `getChartColor(token)`** para Recharts (S) — mata 30+ hex hardcoded en widgets. Estimación: 1h.
3. **🟡 Sumar variants a `Card` + `Input` + `Progress`** (M) — hoy son mínimos, DS v2 va a pedirlas. Estimación: 2h.
4. **🟡 Extraer `<WidgetShell/>` + `<MetricCard/>` + `<EmptyState/>` + `<FilterBar/>`** (M) — mata copy-paste en 20+ archivos. Estimación: 3h.
5. **🟡 Migrar aliases legacy** (`orange-500` × 25, `cream-300`, `warm-900`) a tokens semánticos (S-M) — grep-replace + smoke test. Estimación: 2h.
6. **🟠 Focus trap real en Dialog** (con `@radix-ui/react-dialog` o `focus-trap-react`) (S) — a11y issue silencioso. Estimación: 30 min.

**Total baseline cleanup si se hace HOY (sin DS v2): ~10-12h.**

---

## 6 · Plan v2 · Fases sugeridas

Cuando autorices el MCP de Claude Design y me pases el file, revisamos este plan contra el delta real. Placeholder:

| Fase | Depende de | Esfuerzo estimado |
|---|---|---|
| **DS-01** · Discovery del DS v2 en Claude Design (`whoami` → `search_design_system` → `get_variable_defs` → `get_libraries`) | connector autorizado + URL | 1-2h |
| **DS-02** · Tokens foundation: mapear tokens v2 → CSS vars + tailwind config. Si soporta light/dark, wire ambos. **No toca componentes.** | DS-01 | 3-5h |
| **DS-03** · Code Connect setup: crear `.figma.ts` para los 11 componentes existentes + los 5 nuevos (Select/Table/DropdownMenu/Toast/EmptyState) | DS-02 | 2-3h |
| **DS-04** · Rewrite `components/ui/*` a v2 (markup + estados + a11y usando radix como base). Todos los usages absorben el cambio. | DS-03 | 5-8h |
| **DS-05** · Assets: logos, ilustraciones, iconografía. Unifica `T-01` del punch list (marketing/ vs brand/). | DS-04 | 2-3h |
| **DS-06** · Cleanup: migrar los 46 hex + 78 arbitrary + 23 arbitrary colors al nuevo token system. Grep-replace guiado. | DS-05 | 2-3h |

**Total v2 rebrand: 15-24h** (~1-1.5 semanas calendario).

---

## 7 · Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| DS v2 en Claude Design está incompleto (falta variants/states/tokens) | DS-01 lo detecta antes de arrancar. Ajustamos scope de DS-04 a lo que hay. |
| Recharts widgets rompen con el token swap (leen CSS vars antiguos) | Hacer TASK 5.2 (`getChartColor` helper) ANTES del token swap. Si el nombre de la var cambia, un solo lugar edita. |
| Componentes nuevos (Select/Table) requieren `@radix-ui/*` — deps nuevas | Confirmar con Andrés antes de instalar. Alternativa: portar de shadcn/ui manual. |
| Aliases legacy `orange-500 × 25` se rompen si eliminamos | Fase de deprecation: mantener aliases 1 sprint más, marcar con `/** @deprecated use bg-accent */` en JSDoc y grep para migrar gradual. |
| DS v2 usa fonts distintas (ya no Anton/Poppins/Manrope) | next/font se re-configura en `layout.tsx`. FOUT si no se preloadea. Testear en producción. |

---

## 8 · Próximos pasos

- [ ] Andrés autoriza el connector `plugin:design:figma` (o el equivalente de Claude Design) en Claude Desktop → Settings → Connectors
- [ ] Pasás la URL o file ID de Claude Design (`d4717488-d06f-45aa-b713-a1bc6bc559f1` no es fetcheable sin auth)
- [ ] Corremos DS-01 Discovery → genero `DS_v2_delta.md` con la comparación real
- [ ] Aprobás plan de fases (mantener DS-02..06 o ajustar)
- [ ] Arrancamos DS-02 (tokens foundation) como primer PR de v2
