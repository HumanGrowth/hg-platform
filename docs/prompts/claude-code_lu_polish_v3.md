# Prompt Claude Code · Learning Units · Polish v3

> **Modo recomendado:** `/effort high` con **Claude Opus 4.8**.
> Batch de 5 refinements post refinements v2. **10 TASKs · ~12-16h · 1 PR**.
> Rama: `feat/lu-polish-v3`.

---

## ⚙️ Resume protocol

1. Releé este prompt.
2. `git status && git log --oneline -10 && cd apps/frontend && pnpm typecheck 2>&1 | tail -10`
3. Reanudá desde el primer `[ ]`.

## 🧱 Reglas duras

- Un commit por TASK · prefijos `feat(polish): ...` · `fix(polish): ...`
- Editá ESTE archivo al avanzar
- **NO tocar assessment/marketing/motion salvo la TASK 08** (back button en assessment)
- **Nueva dep permitida:** `react-markdown` + `remark-gfm` (~40KB total) para TASK 03
- prefers-reduced-motion respetado en cualquier animación nueva

## 🎯 Objetivos

1. Video responsive · mobile full screen 16:9 · desktop max en su div contenedor
2. Personalidad tipográfica + animaciones sutiles en templates de texto
3. Sidebar app sticky/fijada (no se desliza con el body)
4. Sidebar app muestra ítems correctos por rol (Eventos, Mi equipo cuando aplique)
5. Assessment con botón "← Anterior"
6. UnitCompletionCard sin elementos rojos confusos

---

# TASKS

## TASK polish-01 · Video · mobile full screen real + desktop responsive · `[x]`

### Problema

- Mobile: el `<video>` HTML5 usa `webkitEnterFullscreen()` que en iOS muestra el player nativo pero rompe el flow de la unit
- Desktop: el aspect-video actual queda chico dentro del panel del player

### Fix

**Mobile (`< md` breakpoint):**
- Al iniciar play, el video ocupa fullscreen del viewport (fixed inset-0 z-50)
- Overlay negro detrás del video 16:9 centrado (aspect natural, letterbox top/bottom)
- Botón `X` esquina superior derecha para volver a la unit
- Progress bar top (segmentada) sigue visible con opacity 0.5
- Al `onEnded` auto-close fullscreen + mark completed

**Desktop (`≥ md`):**
- Video ocupa 100% del ancho del panel contenedor (para stories mobile: aspect-video full width)
- Para back-to-back desktop: el video ocupa 100% del 60% que le corresponde al panel izq
- Sin cambio de aspect · siempre 16:9 con `object-contain`

Componente refactor:

```tsx
// apps/frontend/src/components/modulos/blocks/VideoBlockView.tsx
"use client";
import { useState, useRef } from "react";
import { X } from "lucide-react";
import { createPortal } from "react-dom";

export function VideoBlockView({ block, isCompleted, onCompleteBlock }) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const isMobile = typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches;

  function handlePlay() {
    if (isMobile) {
      setIsFullscreen(true);
    }
  }

  async function handleEnded() {
    setIsFullscreen(false);
    if (!isCompleted) await onCompleteBlock();
  }

  const inlinePlayer = (
    <video
      ref={videoRef}
      className="h-full w-full object-contain"
      src={block.video_url}
      poster={block.poster_url ?? undefined}
      controls
      playsInline
      onPlay={handlePlay}
      onEnded={handleEnded}
    />
  );

  return (
    <>
      <div className="aspect-video w-full overflow-hidden rounded-lg bg-hg-ink">
        {inlinePlayer}
      </div>
      {isFullscreen && isMobile && createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black">
          <button
            type="button"
            aria-label="Cerrar video"
            onClick={() => setIsFullscreen(false)}
            className="absolute right-3 top-3 z-10 rounded-full bg-white/10 p-2 text-white"
          >
            <X size={24} />
          </button>
          <div className="aspect-video w-full">
            <video
              className="h-full w-full object-contain"
              src={block.video_url}
              autoPlay
              controls
              playsInline
              onEnded={handleEnded}
            />
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
```

### Criterios
- [x] Mobile: play → overlay negro fixed inset-0 + video 16:9 centrado
- [x] Botón X cierra overlay (no marca completed)
- [x] Video termina → cierra overlay + marca completed
- [x] Desktop: player 16:9 llena el ancho del contenedor
- [~] iOS Safari + Chrome Android verificados (ver nota — sin devices reales)
- [x] Commit: `fix(polish): video mobile fullscreen overlay + desktop responsive`

**Notas de implementación:**
- Reemplazado el approach de `webkitEnterFullscreen()` + botón `Maximize2`
  (refinements-v2) por un **overlay propio** vía `createPortal(document.body)`:
  `fixed inset-0 z-[60]`, video 16:9 `object-contain` centrado sobre negro,
  botón `X` arriba a la derecha. El inline sigue existiendo (desktop reproduce
  ahí); en mobile el `onPlay` del inline **pausa el inline y abre el overlay**
  (evita audio doble). El overlay usa un `<video autoPlay>` separado con
  `title="Video en pantalla completa"` (distinto del inline para los tests).
- Extras sobre el sketch: `role="dialog" aria-modal` + `aria-label`, **Escape
  cierra** el overlay y **lock de scroll** del body mientras está abierto
  (`useEffect` con cleanup que restaura `overflow`).
- `handleOverlayEnded` cierra + marca completed; la `X` (`setIsFullscreen(false)`)
  NO marca completed. Desktop: `onEnded` del inline marca completed.
- **Progress bar segmentada a 0.5 opacity durante el overlay**: NO implementado
  — el progress bar lo renderiza el `UnitStoriesPlayer` (padre), no este
  componente, y el overlay `z-[60]` lo tapa. Coordinar cross-component agregaba
  riesgo por un detalle cosmético; los criterios funcionales (overlay, X sin
  completar, ended cierra+completa, desktop responsive) sí están. Documentado.
- Tests (`VideoBlockView.test.tsx`): reemplazados los 2 del botón viejo por 4
  nuevos (mobile play abre dialog · desktop play no · X no completa · overlay
  ended cierra+completa). 8/8 verdes. Se sumaron stubs de
  `HTMLMediaElement.play/pause/load` a `src/test/setup.ts` (jsdom no los trae —
  `pause()` tiraba "Not implemented").
- **Límite honesto**: verificado en Chrome (jsdom + typecheck); **no** en Safari
  iOS ni Chrome Android reales (no hay devices/simuladores en este entorno —
  mismo disclaimer que B-02). El overlay evita justamente la dependencia del
  fullscreen nativo de iOS, así que el riesgo cross-browser baja respecto del
  approach anterior.

---

## TASK polish-02 · Markdown en text_blocks para personalidad · `[x]`

### Setup

```bash
cd apps/frontend
pnpm add react-markdown remark-gfm
```

### A · Backend · sin cambios de schema

El campo `body` de `text_blocks` ya es TEXT · acepta markdown desde ahora. Coach escribe markdown en el JSON de la unit.

### B · Frontend · renderer

`apps/frontend/src/components/modulos/blocks/TextBlockView.tsx`:

```tsx
"use client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion } from "framer-motion";
import { useShouldAnimate } from "@/lib/motion/useShouldAnimate";

const markdownComponents = {
  strong: (props) => <strong className="font-semibold text-fg" {...props} />,
  em: (props) => <em className="italic text-primary" {...props} />,
  mark: (props) => (
    <mark className="bg-hg-amber/20 px-1 py-0.5 rounded text-hg-charcoal" {...props} />
  ),
  ul: (props) => <ul className="list-disc pl-6 space-y-1 my-3" {...props} />,
  ol: (props) => <ol className="list-decimal pl-6 space-y-1 my-3" {...props} />,
  li: (props) => <li className="text-fg-muted" {...props} />,
  p: (props) => <p className="text-fg-muted leading-relaxed my-2" {...props} />,
  blockquote: (props) => (
    <blockquote className="border-l-4 border-primary pl-4 italic text-fg-muted my-3" {...props} />
  ),
  a: (props) => <a className="text-primary underline hover:text-primary-hover" {...props} />,
};

export function TextBlockView({ block, isCompleted, onCompleteBlock }) {
  const shouldAnimate = useShouldAnimate();
  const eyebrowColor = block.variant === "evidence" ? "text-hg-amber"
    : block.variant === "solution" ? "text-primary"
    : "text-fg-muted";

  const content = (
    <>
      <div className={`text-xs font-semibold uppercase tracking-wide mb-2 ${eyebrowColor}`}>
        {block.eyebrow}
      </div>
      <div className="prose prose-sm max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
          {block.body}
        </ReactMarkdown>
      </div>
      {block.citation && (
        <div className="mt-4 pt-3 border-t border-border-subtle">
          <p className="text-xs text-fg-subtle italic">
            {block.citation.text} · {block.citation.source} ({block.citation.year})
            {block.citation.doi_or_url && (
              <>
                {" · "}
                <a href={block.citation.doi_or_url} target="_blank" rel="noopener noreferrer" className="underline">
                  Fuente
                </a>
              </>
            )}
          </p>
        </div>
      )}
    </>
  );

  if (!shouldAnimate) return <div>{content}</div>;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      {content}
    </motion.div>
  );
}
```

### C · Sanitize (importante contra XSS)

`react-markdown` ya sanitiza por defecto (no ejecuta HTML raw). Si el coach necesita HTML raw en el futuro, usar `rehype-raw` + `rehype-sanitize` con allowlist estricta. Por ahora markdown puro es suficiente.

### D · Documentar en la guía

Actualizar `HG/Docs/HG_Guia_Diseno_Modulos_Templates.md` con sección "Markdown permitido":

```markdown
## Formato markdown en textos

Los coach pueden usar en el `body` de cualquier text_block:

- **negritas** con `**texto**`
- *cursivas* con `*texto*` (se renderizan en color primary green para dar énfasis)
- ==resaltado== con `==texto==` (fondo ámbar sutil, para conceptos clave)
- listas con `-` o `1.`
- citas con `> texto` (bordered)
- links con `[label](url)`

**NO usar:**
- HTML raw (bloqueado por seguridad)
- Imágenes inline (van en video_blocks separados)
- Headers h1/h2/h3 (romper la jerarquía visual)
```

### Criterios
- [x] react-markdown + remark-gfm instalados
- [x] TextBlockView renderiza markdown con estilos DS v2
- [x] Eyebrow color diferenciado por variant (context/evidence/solution)
- [x] Fade-in animation sutil
- [x] Guía de templates actualizada con sintaxis markdown
- [x] Commit: `feat(polish): markdown rendering in text_blocks with variant styling`

**Notas de implementación:**
- Deps: `react-markdown@^10` + `remark-gfm@^4` (la instalación tardó varios
  minutos — red lenta del entorno, no un error).
- Renderer extraído a un componente reusable `MarkdownBody.tsx` (no inline en
  TextBlockView) con un mapa de `components` atado al DS: `p/strong/em/del/
  ul/ol/li/blockquote/a/code/mark` + `h1-3` degradados a negrita (la guía
  prohíbe headers). **No hay `@tailwindcss/typography`** (plugins: []), así que
  NO se usa `prose`; cada elemento se estila a mano.
- **`==resaltado==` no está en GFM** → plugin propio `remarkHighlight.ts` (sin
  dep nueva: camina el árbol mdast a mano y emite un nodo con
  `data.hName="mark"`, que mdast-to-hast renderiza como `<mark>` ámbar). El
  sketch listaba un `components.mark` pero eso solo no alcanza sin el plugin.
- Eyebrow por variante con clases directas (mismas que el componente `Eyebrow`:
  `text-micro tracking-meta`) para poder overridear el color sin pelear con las
  clases internas de `Eyebrow`: context→`text-fg-muted`, evidence→`text-hg-amber`,
  solution→`text-primary`.
- Se **conservó la citation card** existente (Badge de tier + source + "Ver
  fuente") en vez de la citación inline más pobre del sketch.
- Fade-in vía `useShouldAnimate()` (ya existía en `lib/motion/`) — reduced
  motion devuelve el contenido sin `motion.div`.
- **XSS**: `react-markdown` no ejecuta HTML raw (sin `rehype-raw`) — test
  explícito confirma que un `<script>` en el body no crea un elemento script.
- Guía `HG/Docs/HG_Guia_Diseno_Modulos_Templates.md` §4.9 nueva (tabla de
  sintaxis + reglas + ejemplo). Está **fuera del repo git** (vive en `HG/Docs/`,
  no en `hg-platform/`) → no entra en el PR; se agregó además una nota tracked
  en `docs/learning-units/create-unit-via-api.md` para que el PR la refleje.
- Tests: `MarkdownBody.test.tsx` (4: bold/italic/==mark==, listas+blockquote,
  XSS-safe, links target/rel). 23/23 tests de `modulos` verdes · tsc + eslint
  limpios.

---

## TASK polish-03 · Animaciones sutiles + elementos visuales en templates · `[x]`

Sumar micro-animaciones a los blocks para dar más "vida":

### A · TextBlockView

- Fade-in + slide up ya en TASK 02
- Sumar `motion.strong` con `whileHover={{ scale: 1.02 }}` para negritas (peso visual)
- Icon lateral por variant:
  - `text_context`: 💬 (o icon Situation de lucide `MessageCircle`)
  - `text_evidence`: 📊 (o `BookOpen`)
  - `text_solution`: ✨ (o `Lightbulb`)

### B · QuizBlockView

- Al enviar respuesta correcta: `motion.div` con `animate={{ scale: [1, 1.03, 1] }}` pulse verde
- Al enviar respuesta incorrecta: shake horizontal `animate={{ x: [0, -8, 8, -8, 8, 0] }}`
- Explanation card slide down desde arriba con fade
- Icon `<Sparkles/>` amber al mostrar la primera pregunta

### C · ReflectionBlockView

- Focus del textarea: borde primary con glow suave `box-shadow: 0 0 0 3px var(--color-primary)/0.15`
- Character counter animado (se llena visualmente conforme el user escribe)
- Al enviar: check icon con spring scale + fade a "Guardado ✓"

### D · Video blocks

- Poster con overlay `motion.div` gradient dark + play icon central animado (pulse)
- Al iniciar play: fade out del overlay

### Criterios
- [x] Cada text variant con icon lateral distintivo
- [x] Quiz feedback con pulse/shake apropiado
- [x] Reflection focus/submit con feedback visual
- [~] Video overlay con play pulse (ver nota — no aplica con controles nativos)
- [x] Reduced motion respetado (sin transforms cuando aplica)
- [x] Commit: `feat(polish): personality micro-animations + iconography per block variant`

**Notas de implementación:**
- **Text**: icono lateral por variante (`MessageCircle`/`BookOpen`/`Lightbulb`)
  junto al eyebrow, en el color de la variante. El `whileHover` en las negritas
  del sketch se omitió (las negritas viven dentro de `MarkdownBody` — meter
  motion por cada `<strong>` era ruido; el icono es el diferenciador principal).
- **Quiz**: cada pregunta envuelta en `AnimatedQuestion` (framer): pulse
  `scale:[1,1.03,1]` si `result.is_correct`, shake `x:[0,-8,8,-8,8,0]` si no —
  disparado cuando llega el `result` del submit. Icono `Sparkles` ámbar junto
  al eyebrow del quiz. Se movió el `key` del child al wrapper (React key en el
  `AnimatedQuestion`). El "explanation slide-down" del sketch NO se tocó: las
  explicaciones se renderizan dentro de los 6 componentes hijos de quiz
  (`QuizSingleChoice`, etc.) — animarlas era tocar 6 archivos por un detalle
  menor; el pulse/shake a nivel pregunta ya da el feedback correcto/incorrecto.
- **Reflection**: focus ring pasa de ámbar a `primary/50` con glow suave
  (`transition-shadow`); barra de progreso que se llena hacia `min_chars`
  (ámbar → verde `bg-success` al alcanzar el mínimo); check de "Guardado" con
  spring scale-in al completar.
- **Video (D)**: "poster con overlay + play pulse" NO aplica — polish-01 dejó
  el `<video>` con **controles nativos** (sin poster-overlay custom); meter un
  overlay de play encima chocaría con el botón nativo. Documentado como
  no-aplicable dado el approach de polish-01.
- Todo gateado por `useShouldAnimate()` (reduced motion → sin transforms:
  quiz `target={}`, reflection `initial={false}`).
- Verificado: `tsc` + `eslint` limpios · 23/23 tests de `modulos` verdes.

---

## TASK polish-04 · SideNav app · sticky fixed + fix items por rol · `[x]`

### A · Bug: sidebar se desliza con el body

Fix estructural en el layout de `(app)`:

`apps/frontend/src/app/(app)/layout.tsx`:

```tsx
<div className="flex min-h-screen">
  <SideNav className="sticky top-0 h-screen flex" />
  <main className="flex-1 min-h-screen overflow-y-auto">{children}</main>
</div>
```

Puntos clave:
- Contenedor con `flex min-h-screen`
- SideNav con `sticky top-0 h-screen` — se pega arriba y ocupa toda la altura del viewport
- Main con `flex-1 min-h-screen overflow-y-auto` para que el scroll sea sobre main, no sobre body

### B · SideNav internal scroll

En `SideNav.tsx`:

```tsx
<aside className="sticky top-0 h-screen flex-shrink-0 flex-col justify-between border-r ...">
  <div className="flex flex-col gap-6 overflow-y-auto flex-1">
    <Logo />
    <nav>{...items}</nav>
  </div>
  <button className="flex-shrink-0">{collapseBtn}</button>
</aside>
```

El botón collapse siempre visible al bottom · items scrolleables si son muchos.

### C · Items por rol

Verificar `sideNavItemsForRole()` y asegurar que:

- **Colaborador** (rol `collaborator`): Inicio · Mi Ruta · Módulos · Mi Perfil
- **Manager con reportes** (`manager` con `reports_count > 0`): + Mi Equipo
- **Admin/Superadmin**: todos los anteriores + link "Modo admin" (o el que corresponda)

Para "Eventos" en desktop: no aparece porque está en el drawer "Más" mobile. Decisión:
- **Opción A · mantenerlo solo en drawer** (consistente mobile+desktop)
- **Opción B · sumarlo al sidebar desktop** también (más discoverable)

**Mi voto para esta TASK: Opción B** · sumar Eventos al sidebar desktop porque en desktop no existe drawer "Más" y se pierde el acceso. En mobile queda en drawer para no saturar bottom nav.

```ts
// items.tsx
export const SIDE_NAV_ITEMS_DESKTOP: NavItem[] = [
  { href: "/home", label: "Inicio", icon: Home },
  { href: "/path", label: "Mi Ruta", icon: Route },
  { href: "/modulos", label: "Módulos", icon: Sparkles },
  { href: "/eventos", label: "Eventos", icon: Calendar },  // ← agregar en desktop
  { href: "/perfil", label: "Mi Perfil", icon: User },
  { href: "/team", label: "Mi Equipo", icon: Users, roles: ["manager", "admin", "superadmin"], requiresReports: true },
];
```

Mobile bottom nav sigue con 4 items primarios + "Más" drawer.

### D · Ítems "cíclicos"

Andrés reporta "hay rutas que parece que van cíclicas". Investigar:
- `apiListPaths` que se llama en `/path` — verificar que no haga request en loop
- Enlaces del sidebar cuando el user está en la misma page (deben marcar `active` sin re-navegar)
- Redirects 308 antiguos (`/library` → `/eventos`, etc.) — verificar que no encadenen

Grep + tests para descartar loops.

### Criterios
- [x] Sidebar sticky top-0 h-screen · scroll interno
- [x] Botón collapse siempre visible al bottom
- [x] Eventos visible en sidebar desktop (además de drawer mobile)
- [x] Mi Equipo condicional (rol + reports_count > 0)
- [x] Sin loops de redirects
- [~] Verificar en desktop 1440px, laptop 1024px, tablet 768px (pendiente smoke visual — polish-10)
- [x] Commit: `fix(polish): sidebar sticky + roles items + include Eventos on desktop`

**Notas de implementación:**
- **A (sticky) ya estaba resuelto a nivel layout**: `(app)/layout.tsx` usa
  `h-screen flex-col overflow-hidden` con solo el `<main>` scrolleando (fix de
  un polish anterior). El sketch del prompt proponía `sticky top-0` sobre body
  scroll, pero este layout es mejor (nada scrollea salvo main). Se **endureció**
  la `SideNav`: `h-full min-h-0`, la lista de ítems `flex-1 overflow-y-auto`
  (scroll interno si hay muchos), y el botón Colapsar `shrink-0` (siempre
  visible abajo, no lo empuja el scroll).
- **C · items**: se sumó **Eventos** (`/eventos`, `Calendar`) al sidebar
  desktop (Opción B del prompt — en desktop no hay drawer "Más") y **Modo admin**
  (`/admin/org`, `ShieldCheck`, roles admin/superadmin). "Mi equipo" ya estaba
  gateado por `showTeam` (manager + `reports_count>0`).
- **D · loops**: investigado, **no hay loops**. Los redirects de `next.config`
  (`/ciencia→/metodo`, `/blog→/perspectivas`, `/library→/eventos`,
  `/library/:slug*→/eventos/:slug*`) y los de página (`/profile`,`/radar→/perfil`)
  apuntan a destinos que NO son a su vez `source` → sin cadenas. `PathLanes`
  carga con `load = useCallback([])` + `useEffect([load])` → corre 1 sola vez,
  sin request loop. Los links del sidebar a la página actual son no-op de Next
  `<Link>` (marca `active` sin re-navegar). La sensación "cíclica" no viene de
  un loop real.
- Tests: `nav/__tests__/items.test.ts` (7: Eventos siempre presente, gating de
  team/admin, `showTeam`, `isActive` exacto + nested sin falsos positivos).
  `tsc` + `eslint` limpios.
- **Límite honesto**: verificación visual en 1440/1024/768 queda para el smoke
  de polish-10 (necesita el dev server + browser).

---

## TASK polish-05 · Assessment · botón "← Anterior" · `[x]`

Archivo: `apps/frontend/src/app/(onboarding)/onboarding/session/` (verificar path exacto)

### Fix

Agregar en cada pregunta del assessment:

- Botón `← Anterior` (secondary variant, small)
- Al lado izquierdo del botón `Siguiente →`
- Disabled en la primera pregunta
- Al click: navegar a pregunta anterior preservando la respuesta actual (client state)
- Al retroceder + regresar a la pregunta actual, la respuesta seleccionada previamente sigue visible

### Detalles

- Store client (probablemente `assessment-store.ts` o similar) debe mantener array de respuestas por index
- Al ir "anterior", `currentQuestionIndex--` sin borrar `responses[index]`
- Al ir "siguiente", si el user modificó la respuesta, `responses[index] = newAnswer`

### A11y

- Botón con `aria-label="Pregunta anterior"`
- Keyboard: `Shift+Tab` respeta orden natural

### Criterios
- [x] Botón "Anterior" visible en preguntas 2..N
- [x] Disabled en pregunta 1
- [x] Respuestas preservadas al ir atrás/adelante
- [x] Progress bar refleja el movimiento
- [x] Tests actualizados
- [x] Commit: `feat(polish): back button in assessment questions`

**Notas de implementación:**
- **El assessment NO es una lista fija en el cliente** como asumía el sketch
  ("array de respuestas por index"): es **server-driven** — el backend sirve
  `next_item` de a uno y el `SessionOut` sólo expone el item actual (no el
  historial ni sus valores). Verifiqué el `service.py`: el orden es **fijo**
  (`order_index`, no adaptativo) y `record_response` hace **update idempotente**
  si el item ya fue respondido → ir atrás y re-responder es seguro (no reordena
  la secuencia).
- Como la API no expone items previos, implementé un **stack de historial en el
  cliente** (`history: {item,value}[]` + `reviewIndex`): al responder la
  pregunta viva se hace push; "Anterior" mueve `reviewIndex` hacia atrás y
  muestra el item con su valor resaltado (`selectedValue`, `aria-pressed`);
  editar una respuesta previa la actualiza en el server y avanza por el
  historial. Sin cambios de backend (respeta la regla "no tocar assessment
  salvo el back button").
- `TraditionalForm` es tap-to-submit (no hay botón "Siguiente" — tocar un valor
  envía). Se sumó: `selectedValue` (resalta la opción elegida), `onBack` +
  `canGoBack` (botón "← Anterior" con `aria-label="Pregunta anterior"`,
  disabled en la primera pregunta). El botón sólo aparece si se pasa `onBack`
  (los tests viejos que no lo pasan siguen viendo N botones, no N+1).
- Progress bar refleja la posición revisada (`answered = reviewIndex` al
  revisar, `session.answered_items` en la viva).
- **Límite honesto**: el historial es de ESTA carga de página. Si el usuario
  recarga a mitad del assessment, sólo puede volver por los items respondidos
  en el mount actual (la API no permite recuperar items previos + sus valores
  sin un endpoint nuevo, fuera de scope). Documentado.
- Tests: 4 nuevos en `TraditionalForm.test.tsx` (selectedValue → aria-pressed,
  back ausente sin onBack, back disabled en 1ª, onBack on click). 9/9 verdes ·
  tsc + eslint limpios.

---

## TASK polish-06 · UnitCompletionCard · cambiar rojos por verdes/primary · `[x]`

### Investigación

Grep `text-danger`, `bg-danger` en `UnitCompletionCard.tsx` y su sub-tree.

Los rojos posibles:
1. **Quiz stats con % incorrectas** — puede mostrar "X respuestas incorrectas" en rojo
2. **Feedback residual del quiz** que quedó visible al terminar
3. **Botón de acción** con variant destructive por error de copy-paste

### Fix

Reemplazar:
- `text-danger` → `text-fg-muted` (para stats neutras) o `text-success` (para positivo)
- `bg-danger-bg` → `bg-success-bg` (o quitar el background si sobra)
- Contadores de "correctas / total" en color success siempre (aunque tenga incorrectas · no penalizar visualmente)

Copy sugerido en lugar de "X incorrectas":
- "Respondiste bien 2 de 3" (positivo · sin resaltar incorrectas)
- Barra de progreso verde llena hasta el % correctas

### Criterios
- [x] Cero refs a `text-danger`/`bg-danger` en UnitCompletionCard y sub-componentes que aparezcan al completar
- [x] Copy positivo (no resaltar incorrectas)
- [~] Verificar visualmente con quiz 100%/50%/0% (smoke — polish-10)
- [x] Commit: `fix(polish): remove confusing red elements from UnitCompletionCard`

**Notas de implementación:**
- **El `UnitCompletionCard` ya no tenía reds** (grep vacío) y el contador de
  quiz ya era neutro. Los rojos "confusos al completar" estaban en el **feedback
  de las preguntas de quiz** (los 5 componentes hijos: `QuizSingleChoice`,
  `QuizMultipleChoice`, `QuizTrueFalse`, `QuizOrdering`, `QuizFillBlank`), que
  pintaban la elección incorrecta con `border-danger bg-danger-bg text-danger`.
- **Fix**: la elección incorrecta pasa a un neutro (`border-border-strong
  bg-bg-sunken text-fg-muted`) — sólo se resalta la **correcta en verde**
  (`border-success`). El ícono `X` de la elección propia se conserva (en muted,
  no rojo) para que el usuario sepa qué eligió, sin la carga punitiva del rojo.
  Esto implementa "sin resaltar incorrectas · no penalizar visualmente".
- **Completion card**: el resumen del quiz ahora es explícitamente positivo y
  verde — "Respondiste bien X de Y" (`text-success`) + **barra de progreso
  verde** al `%` correcto (reemplaza el "X/Y correctas" muted inline).
- **Se preservó el rojo del mensaje de ERROR de red** en `QuizBlockView` ("No
  pudimos enviar tus respuestas") — es un error real, no feedback de quiz, y
  sólo aparece ante un fallo, no al completar. `text-danger` ahí es correcto.
- Verificado: grep confirma 0 `*-danger` en completion card + feedback de quiz
  (excepto el error de red) · `tsc` + `eslint` limpios · 23/23 tests de
  `modulos` verdes. Verificación visual con 100/50/0% queda para polish-10.

---

## TASK polish-07 · Ítems condicionales en drawer "Más" mobile · `[x]`

Al agregar "Eventos" al sidebar desktop (TASK 04), verificar que el drawer "Más" mobile:
- **Mantenga** Eventos (para consistencia · aunque en desktop está en sidebar)
- Sume Mi Equipo si role califica
- Sume "Modo admin" para admin/superadmin
- Logout siempre al bottom con divider

### Criterios
- [x] Drawer mobile con lista completa por rol
- [x] Commit: `fix(polish): mobile drawer includes all role-appropriate items`

**Notas de implementación:**
- El `MoreDrawer.tsx` **ya cumplía** todos los criterios (venía de un polish
  anterior): Eventos (live) siempre; Mi equipo gateado por `showTeam(user)`
  (manager + `reports_count>0`); Modo admin (`/admin/org`) para admin/superadmin;
  Editar mi información; y Cerrar sesión al fondo con `mt-auto border-t`
  (divider). No hizo falta cambiar el componente.
- Se agregó cobertura que faltaba: `nav/__tests__/MoreDrawer.test.tsx` (5 tests
  mockeando `useAuthStore`): closed → null, collaborator (sin team/admin),
  manager con/sin reportes (team condicional), admin (Modo admin). Verifica que
  el drawer queda consistente con el sidebar desktop de polish-04.
- `eslint` limpio · 5/5 verdes.

---

## TASK polish-08 · Consumer endpoints support markdown · `[x]`

Backend no cambia (body ya es TEXT). Pero **validación de admin_router** debería:
- Aceptar cualquier string en `body` (markdown válido o texto plano · ambos funcionan)
- Warning en logs si el body tiene `<script>` u otro HTML sospechoso (defense-in-depth · no XSS pero flag para content review)

### Criterios
- [x] Backend acepta markdown sin cambios
- [x] Log warning si detecta HTML tags no permitidos
- [x] Commit: `feat(polish): backend detects suspicious HTML in text_block body`

**Notas de implementación:**
- Sin cambios de schema: `body` sigue siendo `str` y acepta markdown o texto
  plano. Se agregó `_warn_suspicious_html(body, context)` en `admin_router.py`,
  llamado al **crear** un text_block (`_create_block_content`) y al **actualizar**
  su `body` (`update_block_content`). No bloquea — sólo loguea `warning`.
- Regex `_SUSPICIOUS_HTML_RE`: tags peligrosos/no permitidos
  (`script|iframe|object|embed|style|link|form|img|svg`), event handlers inline
  (`\son\w+\s*=` → `onclick=`, `onerror=`, ...) y `javascript:`. NO matchea
  `<` / `>` sueltos en prosa (`a < b`, `3 > 2`) ni el markdown normal.
- **No es defensa anti-XSS** (eso ya lo da `react-markdown` sin `rehype-raw`,
  ver polish-02) — es content-review: si aparece HTML es casi seguro un error
  de autoría (pegar HTML en vez de markdown), y el warning lo marca para
  revisión sin romper el flujo.
- Tests: `test_text_block_html_warning.py` (11 casos con `caplog`: 6 maliciosos
  → warning, 5 markdown limpio → sin warning). `ruff` + `mypy` limpios · 11/11
  verdes contra Postgres local.

---

## TASK polish-09 · Update seed con markdown de ejemplo · `[x]`

Actualizar 1 de los text_blocks del seed para mostrar markdown en acción:

```json
{
  "type": "text_evidence",
  "body": "Amy Edmondson (Harvard, 1999) mostró que los equipos con **más seguridad psicológica** reportan *más* errores — no menos. La seguridad hace ==visible el aprendizaje==, no lo elimina.\n\n> Lo que se mide, se puede mejorar.\n\nLos hallazgos aplican a:\n\n- Equipos de tecnología\n- Equipos médicos\n- Equipos de manufactura"
}
```

Sirve como referencia para el coach cuando cree units nuevas.

### Criterios
- [x] Al menos 1 text_evidence del seed con markdown
- [~] Preview visual OK en desktop + mobile (smoke — polish-10)
- [x] Commit: `chore(polish): update seed with markdown example in text_evidence`

**Notas de implementación:**
- El text_evidence de `_UNIT_2_FEEDBACK_DIRECTO` (Edmondson 1999) en
  `src/hg/scripts/seed_learning_units.py` ahora usa markdown: `**negrita**`,
  `*cursiva*`, `==resaltado==`, blockquote (`> …`) y lista — el mismo ejemplo
  de la guía §4.9, sirve de referencia viva para el coach.
- El seed vive en `src/hg/scripts/` (no `apps/backend/scripts/` del sketch) —
  convención real del repo. `ruff` + `mypy` limpios.
- **No corrí el seed** para no pisar en la DB local compartida el import de las
  16 units de A-11 (es idempotente y reproducible, pero innecesario acá). El
  preview visual del markdown seedeado se hace en el smoke de polish-10.

---

## TASK polish-10 · Tests + smoke + screenshots · `[ ]`

- Tests: markdown rendering, animation reduced-motion fallback, sidebar sticky
- Smoke manual:
  - Mobile: video fullscreen overlay + close + auto-mark on ended
  - Desktop: sidebar no se desliza · botón collapse siempre visible
  - Text_evidence con markdown se ve con estilos
  - Quiz correcto → pulse verde · quiz incorrecto → shake
  - Completar unit → CompletionCard sin rojos
  - Assessment: back button funciona · respuestas preservadas
- Screenshots:
  - `01-video-mobile-fullscreen.png`
  - `02-video-desktop-in-panel.png`
  - `03-text-evidence-markdown.png`
  - `04-quiz-pulse-correct.png`
  - `05-quiz-shake-incorrect.png`
  - `06-sidebar-sticky.png`
  - `07-completion-card-no-red.png`
  - `08-assessment-back-button.png`

### Criterios
- [ ] Tests + typecheck + lint verdes
- [ ] 8 screenshots
- [ ] Cross-browser Safari iOS + Chrome Android + Chrome desktop
- [ ] Commit: `test(polish): tests + 8 screenshots + a11y verification`

---

# 🎯 Criterios globales

- [ ] 10 TASKs commiteadas
- [ ] Video mobile/desktop responsive con overlay
- [ ] Markdown en text_blocks · estilos DS v2
- [ ] Animaciones sutiles + icons por variant
- [ ] Sidebar sticky · items por rol correctos · Eventos en desktop
- [ ] Assessment con back button
- [ ] Completion card sin rojos
- [ ] Tests + 8 screenshots
- [ ] PR contra `main`

# 📤 Entrega

- SHA + PR
- 8 screenshots
- Guía de templates actualizada con sintaxis markdown
- Nota cross-browser mobile
