# Prompt para Claude Code · Frontend v1 (FE-01 → FE-08)

> **Modo recomendado:** `/effort high` con **Claude Opus 4.8**.
> Razonamiento profundo (~32k tokens por turno), ejecución secuencial, costo acotado. Sin paralelismo de subagentes — una TASK a la vez.
>
> Si una TASK es mecánica (FE-01, FE-08), podés bajar a `/effort medium` para ahorrar tokens.

---

## ⚙️ Resume protocol — leer ANTES de tocar código

Si la sesión se compacta (`/compact`) o se reinicia, reanudás así:

1. Releé este prompt entero (vivís en `docs/prompts/claude-code_Frontend-v1.md`).
2. Verificá el estado real del repo:
   ```bash
   git status
   git log --oneline -10
   make test-backend 2>&1 | tail -20
   docker compose exec backend uv run alembic current
   cd apps/frontend && pnpm typecheck 2>&1 | tail -20
   ```
3. Releé el bloque "## 📌 Estado al iniciar" abajo.
4. Buscá TASKs marcadas `🟧 IN PROGRESS` y reanudá desde el último criterio sin tildar.

## 🧱 Reglas duras

- **Un commit por TASK.** Conventional Commits con prefijo Kanban: `feat(FE-XX): ...`.
- **Sub-commits intermedios** si una TASK toma >25 min: `wip(FE-XX): partial — <qué>` — esto es tu checkpoint.
- **Editá ESTE archivo al avanzar.** Marcá `[ ]` → `[x]` y cambiá el status en la tabla del final.
- **No avances** si la TASK actual no está `✅ DONE` con tests + commit + criterios tildados.
- Si bloqueás, dejá nota debajo de la TASK y pasá; no inventés decisiones de producto.
- **TASK 1 ANTES de TASK 2 ANTES de TASK 3...** El orden importa: TASK 2 depende de los tokens de TASK 1, TASK 3 del cliente API, etc.

## 📌 Estado al iniciar (actualizar antes del run)

- Último commit firme: `885c18e — feat(FE-01): integrate Human Growth design system tokens` (sobre rama `feat/B1-03-04-identity-rls`)
- Backend Capa 1 + RLS productivos (B1-03, B1-04 cerrados).
- Auth + RBAC + invitaciones (B1-06, B1-07) — endpoints en `/api/v1/auth/*` y `/api/v1/admin/*`. JWT con claims `sub, org_id, role, type`.
- Frontend hoy es solo la landing placeholder con los 6 pilares en `apps/frontend/src/app/page.tsx`.
- Design system beta en `~/Andy/HG/Design/Human Growth Design System/` (copiar a `packages/design-system/source/` en TASK 1).
- Seed: 2 orgs (Acme, Globex) + 7 users — credenciales en `docs/dev-credentials.md`.

---

# Contexto

Construís la **v1 del frontend Next.js 14** integrando el design system beta de Human Growth como tokens permanentes. La identidad visual final aún no está firmada (DEC-03 del kanban), pero el DS beta es tan completo que sirve como direction.

El backend de B1-06/07 ya está vivo: login con email+password retorna `{access_token, refresh_token, user}`, accept-invite crea user con token, /me retorna el user, admin puede crear orgs e invitaciones.

## Decisión de producto firme

- **Sin self-service de orgs.** Solo invitación por superadmin HG.
- **Brand temporal pero arquitecturalmente permanente.** Tokens en CSS variables + tailwind config → swap a identidad final (cuando llegue) es config, no rewrite.
- **Banner `BETA · pendiente identidad final`** en todas las pantallas del app mientras DEC-03 no esté firmada.

## Design system — qué importar y cómo

El DS vive en `~/Andy/HG/Design/Human Growth Design System/`. Archivos críticos:
- `README.md` — voice/tone, principios visuales, "what we never do"
- `colors_and_type.css` — TODOS los tokens (colors, type, spacing, radii, shadows, motion)
- `SKILL.md` — manifest del skill
- `assets/logo-*.svg` — 4 lockups del logo (black, white, color, color-bg)
- `hg-*.jsx` — componentes de referencia de pantallas (NO portar tal cual: leerlos como inspiración, reescribir contra shadcn)
- `preview/components-*.html` — specs visuales de buttons, inputs, cards, badges, etc.

**Reglas innegociables del DS** (extraídas del README — respetarlas literalmente):
- Primary `#FF4500` (orange-500). Cream `#FDF5E6` (cream-100) como canvas default — **NUNCA** `#fff`.
- Ink `#1A140F` (warm-900) — **NUNCA** `#000`.
- Display: Anton ALL CAPS, condensed, weight-driven.
- Body: Manrope sentence case.
- Editorial accent: Instrument Serif italic (sparingly).
- Mono: JetBrains Mono.
- Radii sharp por default: 8px buttons, 12px cards, 16px modals.
- Borders 1px warm-ink low-alpha (`rgba(26,20,15,0.12)`).
- Easing `cubic-bezier(0.32, 0.72, 0, 1)` para entradas.
- **Iconos: Lucide stroke 1.75px** (usar `lucide-react`).
- **No emoji en UI seeded. No glassmorphism. No purple/blue gradients. No hand-drawn illustration.**
- **Voice:** directo, dry, peer-to-peer. Nunca "journey", "unlock", "rockstar", "elevate".

---

# TASKS (ejecución secuencial — orden importa)

## TASK FE-01 · Integrar design system al monorepo · `[x]` ✅

1. **Copiar el DS** a `packages/design-system/source/` (copia, no symlink):
   ```bash
   mkdir -p packages/design-system/source
   cp -R "../../Design/Human Growth Design System/"* packages/design-system/source/
   ```
   Ajustar el path relativo si hace falta. Documentar el origen en `packages/design-system/README.md` (origen, banner "v1 — pending DEC-03").

2. **Convertir tokens CSS a Tailwind config** en `apps/frontend/tailwind.config.ts`:
   - `colors`: paleta completa del DS — orange-50..900, cream-50..400, warm-300..900, success/warning/danger/info + bg variants
   - Eliminar el `pillar.*` viejo y reemplazar con:
     - P1 Carrera: `orange-500`
     - P2 Propósito: `warm-600`
     - P3 Relaciones: `success`
     - P4 Salud: `warning`
     - P5 Paz Interior: `info`
     - P6 Estabilidad: `orange-800`
   - `fontFamily`: `display: Anton`, `sans: Manrope`, `serif: Instrument Serif`, `mono: JetBrains Mono`
   - `fontSize`: type scale completa (micro 12 → 6xl 88)
   - `spacing`: extender Tailwind con la base de 4px del DS
   - `borderRadius`: sharp (sm 4 / md 8 / lg 12 / xl 16 / 2xl 24)
   - `boxShadow`: warm-ink tinted (sm, md, lg, focus orange-500 alpha 32%)
   - `transitionTimingFunction`: `ease-out` (Apple-ish) y `ease-state`

3. **Cargar fuentes** vía `next/font/google` en `apps/frontend/src/app/layout.tsx`:
   ```ts
   import { Anton, Manrope, Instrument_Serif, JetBrains_Mono } from "next/font/google";
   const anton = Anton({ subsets: ["latin"], weight: "400", variable: "--font-display" });
   const manrope = Manrope({ subsets: ["latin"], weight: ["400","500","600","700"], variable: "--font-body" });
   const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal","italic"], variable: "--font-serif" });
   const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400","500"], variable: "--font-mono" });
   ```
   Aplicar las 4 variables al `<html>`.

4. **Sobrescribir `globals.css`** con todo el bloque `:root` del DS (variables CSS) + `[data-theme="dark"]` + base styles (body usa `var(--bg)`, `var(--fg)`, `var(--font-body)`).

**Criterios:**
- [ ] `packages/design-system/source/` existe con todos los archivos del DS
- [ ] `tailwind.config.ts` usa los colores y fonts del DS
- [ ] Fuentes Anton + Manrope + Instrument Serif + JetBrains Mono cargan sin errores en `pnpm dev`
- [ ] `cream-100` es el background del body, **no white**
- [ ] `pnpm dev` levanta sin warnings
- [ ] Commit: `feat(FE-01): integrate Human Growth design system tokens`

## TASK FE-02 · Componentes base (shadcn-style + DS) · `[x]` ✅

Generar primitives en `apps/frontend/src/components/ui/` usando los tokens del DS:

- `button.tsx` — variantes `primary` (orange-500 bg + white fg), `secondary` (transparent + ink border), `ghost`, `destructive`. Sizes sm/md/lg. Radius 8px. Hover: bg -6%; press: scale 0.98 + bg -12%; transition 120ms `--ease-state`.
- `input.tsx` — radius 8px, border 1px `--border`, focus 2px orange. Sin inner shadow.
- `card.tsx` — radius 12px, shadow-sm hover→shadow-md, padding 24px.
- `badge.tsx` — variantes `default`, `earned` (orange-500), `pillar-p1..p6`, `success`, `warning`, `danger`.
- `avatar.tsx` — round, fallback cream-300 bg + initials warm-900.
- `chip.tsx` — radius 8px, padding 8px 12px, text-xs eyebrow.
- `dialog.tsx` — radius 16px, shadow-lg, scrim `rgba(26,20,15,0.45)`.
- `tabs.tsx` — underline-style, active tab orange-500 underline 2px.
- `progress.tsx` — bar 8px height, radius 4px, fill orange-500.
- `eyebrow.tsx` (custom) — text-micro uppercase tracking-meta fg-muted.
- `display.tsx` (custom) — Anton component con variants `display-1/2/3`.

Cada componente con `cva` (class-variance-authority), accesible (focus visible, ARIA), tipos exportados.

**Banner global** `components/BetaBanner.tsx`:
> Fondo `warning-bg`, text `warning`, full width, dismissible (no persistido en v1).
> Copy: `BETA · DIRECTION V1 — IDENTIDAD VISUAL PENDIENTE DE DEC-03`

**Página `/_kit`** (no Storybook — overkill v1) con preview de todos los componentes.

**Criterios:**
- [ ] 11 componentes UI + BetaBanner + página `/_kit`
- [ ] Todos usan `cn()` de `@/lib/utils`
- [ ] `BetaBanner` se renderiza en `app/(app)/layout.tsx` (no en `(auth)`)
- [ ] `pnpm typecheck` sin errores
- [ ] Commit: `feat(FE-02): base UI primitives with HG design tokens`

## TASK FE-03 · Auth: login + accept-invite + me · `[x]` ✅

**3.1 · Cliente API tipado** en `apps/frontend/src/lib/api.ts` (extender lo que ya hay):
- Funciones: `apiLogin(email, password, orgSlug?)`, `apiAcceptInvite(token, password, fullName)`, `apiRefresh(refreshToken)`, `apiMe(accessToken)`, `apiLogout(refreshToken)`.
- Interceptor que auto-refresh en 401 (una sola vez antes de fallar).

**3.2 · Auth state** con Zustand en `lib/auth-store.ts`:
- `user`, `accessToken`, `refreshToken`, `setSession(...)`, `clear()`.
- **Refresh** en cookie httpOnly vía API Route `/api/auth/session`. **Access token solo en memoria** (sin localStorage).

**3.3 · Páginas auth** (route group `(auth)` sin sidebar):
- `app/(auth)/login/page.tsx` — form Manrope, hero Anton (sentence — no slogan motivacional), email + password, button "Iniciar sesión" orange, link "Olvidé mi contraseña" stub.
- `app/(auth)/accept-invite/page.tsx?token=xxx` — valida token al cargar (muestra org name + email del backend), form crea password + full_name, button "Crear cuenta", redirige a /home.
- `app/(auth)/layout.tsx` — centered, max-w-md, cream-100 bg, logo color top.

**3.4 · Middleware Next.js** `middleware.ts` raíz frontend:
- Ruta empieza con `/(app)` o `/(admin)` y no hay session → redirect `/login`.
- Ruta es `/login` y hay session válida → redirect `/home`.

**Criterios:**
- [ ] `/login` con `admin@acme.test / AdminAcme#2026` redirige a `/home`
- [ ] `/accept-invite?token=xxx` con token válido crea user y redirige
- [ ] Refresh automático en 401 funciona (test manual con TTL bajo a 1 min)
- [ ] Login inválido muestra error inline (no toast genérico)
- [ ] Logout limpia session + redirect `/login`
- [ ] Tests Vitest mínimos: `apiLogin` mock + form validation
- [ ] Commit: `feat(FE-03): auth flow (login, accept-invite, refresh, logout)`

## TASK FE-04 · App shell + home dashboard · `[x]` ✅

**4.1 · App shell** `app/(app)/layout.tsx`:
- Top nav: logo color (h-8) izq, links centro ("Inicio", "Biblioteca", "Mi perfil"), avatar+menú der.
- Glass on scroll: `backdrop-filter: blur(12px)` sobre cream-100 80%.
- Sidebar opcional collapsed por default en tablet+.
- Container `--container-app` (1440px).

**4.2 · Home dashboard** `app/(app)/home/page.tsx` (referenciar `hg-app.jsx`, `hg-appshell.jsx`, `hg-profile.jsx` del DS):
- Hero Anton: greeting sentence (sin "journey", "unlock", "rockstar", "elevate")
- Eyebrow "PROGRESO GENERAL"
- Card "Tu próximo paso" + button orange "Continuar"
- Grid "Tus 6 dimensiones" (3×2 desktop, 2×3 tablet, 1×6 mobile) — un card por pilar con:
  - Background `cream-50`, código pilar como pill, nombre, progress bar con `pillar_score` (mock 0% si no hay assessment), CTA "Explorar" ghost
- "Actividad reciente" — lista vacía con empty state (ring rotatorio + "Sin actividad aún. Comenzá explorando un pilar.")

**4.3 · `components/EmptyRing.tsx`:**
- Ring del logo CSS animation 2.4s linear infinite rotate 360°
- Texto Manrope sentence case debajo

**Criterios:**
- [ ] Logged user llega a `/home` y ve el dashboard
- [ ] Avatar con iniciales reales
- [ ] 6 pilares con colores asignados
- [ ] Empty state usa el ring rotando
- [ ] Voice respeta el README del DS (verificar manualmente: cero "journey/unlock/rockstar/elevate")
- [ ] Mobile responsive <768px = single column
- [ ] Commit: `feat(FE-04): app shell + home dashboard with 6-pillar grid`

## TASK FE-05 · Biblioteca de carrera + perfil · `[x]` ✅

**5.1 · `/library`** (kanban B2-09):
- Filtros laterales: por pilar (chips multi-select), por nivel (L1..L4b chips).
- Grid cards vacío v1 (sin seed de cursos): empty state "No hay cursos disponibles en tu organización. Vuelve pronto."
- Si más adelante hay cursos: thumb + título + duración + badge de pilar.

**5.2 · `/profile`** (kanban B2-10):
- Header: avatar grande + name + role + org_name (sentence-case el nombre)
- **Radar chart Recharts** de los 6 pilares con `pillar_scores` (mock random si no hay datos)
- Historial: lista vertical de assessments (vacío v1)
- Logros: grid de badges (vacío v1 — usar ring motif del logo como "badge frame")

**Criterios:**
- [ ] `/library` muestra filtros funcionales aunque la lista esté vacía
- [ ] `/profile` radar chart con 6 ejes etiquetados (P1..P6)
- [ ] Datos reales de `/api/v1/auth/me` (no mockeados client-side)
- [ ] Commit: `feat(FE-05): library + learning profile pages`

## TASK FE-06 · Admin panel (HG superadmin) · `[x]` ✅

**6.1 · Route group `(admin)`** con sidebar admin propio. Solo si `user.role === "superadmin"`.

**6.2 · `/admin/orgs`** — lista:
- Tabla con name, slug, tier, licenses_used/total, billing_status, created_at
- Botón "Nueva organización" → modal con form (name, slug, country, tier, licenses_total)
- Click row → `/admin/orgs/:id`

**6.3 · `/admin/orgs/:id`** — detalle:
- Info de org
- Tabs: "Usuarios" / "Invitaciones"
- Tab "Invitaciones": botón "Enviar invitación" → modal (email, role) → al guardar muestra `invite_url` con botón "Copiar" (recordar: token plaintext aparece UNA SOLA VEZ)
- Lista invitaciones con status pending/accepted/expired/revoked + botón "Revocar" si pending

**Criterios:**
- [ ] Login `superadmin@humangrowth.app / HGsuper#2026` accede a `/admin/orgs`
- [ ] Login `admin@acme.test` no accede (redirect /home con toast)
- [ ] Crear org desde modal funciona y aparece en la lista
- [ ] Invitación muestra `invite_url` copiable; abrir en incognito y completar accept-invite funciona
- [ ] Commit: `feat(FE-06): HG superadmin panel (orgs + invitations)`

## TASK FE-07 · Verificación end-to-end · `[x]` ✅

1. **Flujo completo manual:**
   - Login como superadmin → crear org "Test Co" con 5 licencias → invitar `test@test.com`
   - Copiar invite_url → abrir incognito → completar form → llegar a /home
   - Verificar backend: `licenses_used = 1`
   - Logout → re-login → llegar a /home

2. **Lint + typecheck + build:**
   ```bash
   cd apps/frontend
   pnpm lint
   pnpm typecheck
   pnpm build
   ```

3. **Screenshots:** login, home, profile, /admin/orgs, /admin/orgs/:id (invitación) — guardar en `docs/screenshots/frontend-v1/` (PNG).

**Criterios:**
- [ ] Flujo manual e2e OK
- [ ] `pnpm build` output `.next/standalone` sin errores
- [ ] 5+ screenshots en `docs/screenshots/frontend-v1/`
- [ ] Commit: `chore(FE-07): manual e2e verification + v1 screenshots`

## TASK FE-08 · Documentación · `[ ]`

1. **ADR-0003 · Adopción del DS beta como direction v1**
   - Path: `docs/adrs/ADR-0003-design-system-beta-as-v1.md`
   - Decisión, riesgo (rework cosmético si DEC-03 final difiere), mitigación (tokens-based swap)

2. **Actualizar `docs/ARCHITECTURE.md`** sección "Frontend v1": stack + integración DS + páginas implementadas vs pendientes + cómo swapear tokens cuando DEC-03 cierre.

3. **Actualizar `apps/frontend/README.md`**: cómo correr frontend solo (`pnpm dev`), integración DS, voice rules resumidas.

**Criterios:**
- [ ] ADR-0003 escrito
- [ ] `ARCHITECTURE.md` actualizada
- [ ] `apps/frontend/README.md` actualizado
- [ ] Commit: `docs: ADR-0003 + frontend v1 architecture notes`

---

# 🎯 Criterios globales "hecho"

- [ ] Las 8 TASKs commiteadas individualmente
- [ ] `make up` levanta todo + `localhost:3000` muestra app con cream bg, Anton/Manrope cargadas
- [ ] Login → home → profile → admin (con superadmin) funcionan
- [ ] Banner BETA visible en todas las pantallas del app group
- [ ] CERO violaciones del DS: sin emojis seeded, sin `#fff`/`#000` hardcoded, sin glassmorphism, sin gradients purple/blue
- [ ] `pnpm typecheck` + `pnpm lint` + `pnpm build` pasan
- [ ] Screenshots tomadas

# Entrega

Al terminar reportá:
1. Archivos creados/modificados (paths absolutos)
2. Output de build (resumen)
3. Screenshots adjuntas
4. Desviaciones del plan y por qué
5. Lista de cosas DIFERIDAS por bloqueo o falta de tiempo
6. **Actualizá `📌 Estado al iniciar`** arriba con commit final y status real

---

## 🟧 Status por TASK (actualizar a medida que avanzás)

| ID | Subject | Status | Effort sugerido |
|---|---|---|---|
| FE-01 | Integrar DS al monorepo | ✅ | medium |
| FE-02 | Componentes base (shadcn + DS) | ✅ | high |
| FE-03 | Auth flow | ✅ | high |
| FE-04 | App shell + home dashboard | ✅ | high |
| FE-05 | Biblioteca + perfil | ✅ | medium |
| FE-06 | Admin panel | ✅ | high |
| FE-07 | Verificación e2e | ✅ | medium |
| FE-08 | Documentación | `[ ]` | low |

> Estados: `[ ]` pending · `🟧` in progress · `✅` done · `🚫` blocked (con nota)
