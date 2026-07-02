# Prompt Claude Code · Polish App (Colaborador + Player + Admin) pre-JxCR demo

> **Modo recomendado:** `/effort high` con **Claude Opus 4.8**.
> Sprint **secuencial al polish marketing** (PR de marketing debe estar mergeado en `main` antes de arrancar este). Refactor de nav + IA (info architecture) + 2 pages nuevas + cleanup de datos visibles + conectar `/radar` y `/profile` al motor real + sidebar rico del player + "Ver como org" para superadmin. **~10-12h secuencial. 15 TASKs.**

---

## ⚙️ Resume protocol

Si la sesión se compacta o reinicia:

1. Releé este prompt entero (`docs/prompts/claude-code_polish_app_pre_jxcr.md`).
2. Releé `HG/Docs/HG_Punch_List_JxCR_Demo.md` (secciones 9-13 y feedback colaborador).
3. Verificá estado:
   ```bash
   git status && git log --oneline -10
   cd apps/frontend && pnpm typecheck 2>&1 | tail -10 && pnpm test 2>&1 | tail -10
   ```
4. Buscá TASKs `🟧 IN PROGRESS` y reanudá desde el último criterio sin tildar.

## 🧱 Reglas duras

- **Un commit por TASK** con prefijo `feat(app-polish): ...` o `fix(app-polish): ...`. Sub-commits `wip(...)` cada >25 min.
- **Editá ESTE archivo al avanzar** (status + `[x]`).
- **No avances** si la TASK actual no está `✅ DONE`.
- **El polish marketing DEBE estar mergeado** en `main` antes de arrancar (toca sidebar y topbar shared).
- **NO modificar motor de assessment, scorers, catálogo, manager/RRHH endpoints**.
- **NO instalar dependencias nuevas** salvo confirmación.
- **NO tocar páginas de marketing/auth/onboarding** — eso ya está cubierto por el polish marketing.

## 📌 Estado al iniciar

- `main` con polish marketing mergeado (PR previo) y motor de assessment vivo (PR #10).
- Tests baseline (a confirmar tras polish marketing).
- Stack local corriendo + Andrés logueado como collab1 con onboarding ya hecho.

## 🧠 Decisiones firmadas por Andrés (no re-debatir)

1. **Scroll bug `/home`**: contenedor padre permite seguir scrolleando — fix CSS layout
2. **Retake**: lista de 7 cards (1 por pilar) con botón "Re-evaluar" + cooldown 30d respetado
3. **Chips "P#" eliminados globalmente** — reemplazar por nombres de pilar
4. **`/radar` + `/profile` → unificar en `/perfil`** — los originales redirigen
5. **Dropdown TopBar avatar** → sumar "Editar mi información" → `/perfil/editar`
6. **Sidebar**: Inicio · Mi Ruta · Biblioteca · Mi Perfil (4 destinos colaborador). Para managers: 5° "Mi equipo"
7. **BottomNav mobile**: 4 ítems fijos + nuevo ítem "**Más**" (icon hamburger) que abre drawer lateral con extras (Mi equipo si aplica, Editar perfil, Modo admin si aplica, Logout)
8. **Tab unificada** se llama **"Mi Perfil"**
9. **Player `/library/[slug]`**: sidebar derecho con metadata real (pilar, competencia, nivel, descripción, autor). Bottom del player: botones "Marcar completado" + "Siguiente curso".
10. **AC-01 demo blocker** → opción C: botón **"Ver como esta org"** en `/admin/orgs/[id]` (header). Sete cookie `hg_acting_org_id`. Backend lee la cookie para superadmin y resuelve `/admin/org` con ese tenant. Banner sticky superior "Viendo como Acme Corp · [Volver a HG]".
11. **Mi equipo en nav**: ocultar cuando `user.role in (manager, admin, superadmin)` **AND** `reports_count === 0` (no aparece en sidebar ni en BottomNav "Más").
12. **`/admin/orgs/[id]`**: tab default = Usuarios. Celdas Manager y Última actividad vacías → "—" / "Nunca". Sumar input search por nombre/email arriba de la tabla.

---

# TASKS

## TASK app-polish-01 · Fix scroll bug + cleanup `/home` · `[ ]`

### 1.1 · Fix scroll layout

En `apps/frontend/src/app/(app)/layout.tsx` (y/o globals.css):

- Asegurar que **solo el `<main>` interno scrollea**, no el `<body>` ni el `<html>`.
- El layout debe ser `flex flex-col h-screen overflow-hidden` con TopBar fijo + SideNav fijo + `<main className="flex-1 overflow-y-auto">`.
- BottomNav mobile no debe robar scroll.

### 1.2 · `/home` issues capturados en walkthrough live

| Ref | Fix |
|---|---|
| HM-01 | BetaBanner: ocultar **o** cambiar texto a `"Beta v1"` simple (sin "DEC-03"). Decisión: ocultar para JxCR demo si `NEXT_PUBLIC_HIDE_BETA_BANNER=true`. Default: ocultar. |
| HM-02 | Heading "Hola, Acme" — toma primer token del `full_name`. Para `"Acme Corp Collaborator 1"` toma "Acme". Cambiar a tomar **el último token** o usar `first_name` si existe en el backend. Si no existe, fallback al primer token que NO sea el nombre de la org. |
| HM-03 | Stats bar "días seguidos / min este mes / cursos completados" — verificar que los **números se rendericen** (hoy solo veo labels). Si `streak_days === 0`, mostrar `"0 días"` no vacío. |
| HM-04 | "Tu próximo paso" → mostrar el **título descriptivo del curso**, no el slug. Hoy muestra `"L1-P1-002"`. Mientras los cursos no tengan títulos largos en DB, mostrar `"Curso ${course_title}"` con un fallback humano. **Trabajar con TASK 07 (cleanup data)**. |
| HM-05 | **Lista "Valores por pilar"** con números sueltos (17/100/75/...) — **eliminar** esta lista (es legacy / mock confundente). El radar arriba ya da la info visual; los detalles están en las cards de abajo. |
| HM-06 | Cards "Tus dimensiones" inconsistentes — asegurar que **todas las cards muestren `state_label`** + badge source ("Confirmado" / "Estimación rápida") + "vía de movimiento" + CTA. Patrón uniforme. |
| HM-07 | Cards P6A/P6B muestran códigos crudos "P6A"/"P6B" → usar **solo nombres** ("Resiliencia emocional" / "Bienestar financiero"). |
| HM-08 | Actividad reciente: filtrar cursos cuyo `course_slug` empiece con `seed-w-` (datos de prueba). Si quedan 0, mostrar empty state honesto. |
| HM-09 | Sección final "¿Sos admin de tu organización? ." — quitar el punto huérfano. Mejor reformular: link a Mi Perfil si role=collaborator, link a Modo admin si role IN (admin, superadmin). |
| HM-10 | Streak heatmap: si `active_days === 0`, mostrar empty state grande "Empezá a usar la plataforma para construir tu racha" en vez de heatmap deprimente con todos 0. |
| HM-12 | MiniRadar SVG sin `<title>` ni `aria-label`. Agregar `role="img"` + `aria-label="Tu radar con 6 dimensiones..."`. |

### 1.3 · Criterios

- [ ] Scroll: body sin scroll, solo main interno
- [ ] BetaBanner condicional/oculto
- [ ] Heading nombre correcto
- [ ] Stats bar con números visibles
- [ ] Próximo paso con título descriptivo
- [ ] Lista "Valores por pilar" eliminada
- [ ] 7 cards uniformes (state_label + source badge + vía + CTA)
- [ ] P6A/P6B sin códigos crudos
- [ ] Actividad reciente filtra `seed-w-*`
- [ ] Empty state streak heatmap
- [ ] MiniRadar a11y
- [ ] `pnpm typecheck` verde
- [ ] Commit: `fix(app-polish): home scroll + 11 issues capturados live`

---

## TASK app-polish-02 · Refactor sidebar + BottomNav con "Más" · `[ ]`

### 2.1 · `apps/frontend/src/components/nav/items.ts`

Cambiar a:

```ts
import {
  BookOpen, Hexagon, Home, Menu, Route as RouteIcon, User, Users,
  type LucideIcon
} from "lucide-react";
import type { UserRole } from "@/lib/types";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  roles?: UserRole[];
}

export const SIDE_NAV_ITEMS: NavItem[] = [
  { href: "/home", label: "Inicio", icon: Home },
  { href: "/path", label: "Mi Ruta", icon: RouteIcon },
  { href: "/library", label: "Biblioteca", icon: BookOpen },
  { href: "/perfil", label: "Mi Perfil", icon: User },
  { href: "/team", label: "Mi equipo", icon: Users, roles: ["manager", "admin", "superadmin"] },
];

export const BOTTOM_NAV_ITEMS_BASE: NavItem[] = [
  { href: "/home", label: "Inicio", icon: Home },
  { href: "/path", label: "Mi Ruta", icon: RouteIcon },
  { href: "/library", label: "Biblioteca", icon: BookOpen },
  { href: "/perfil", label: "Perfil", icon: User },
];

export function sideNavItemsForRole(role: UserRole | undefined): NavItem[] {
  return SIDE_NAV_ITEMS.filter((i) => !i.roles || (role && i.roles.includes(role)));
}
```

### 2.2 · `SideNav.tsx`

- Mostrar **4 ítems base** + **5° "Mi equipo"** solo si manager/admin/superadmin (via `sideNavItemsForRole`).
- **Eliminar "Mi Radar"** del sidebar (se funde en Mi Perfil).
- Mantener colapsable + localStorage.

### 2.3 · `BottomNav.tsx`

Cambiar a 4 ítems fijos (BOTTOM_NAV_ITEMS_BASE) + nuevo botón "**Más**" (icon `Menu` de lucide) que abre un **drawer lateral** desde la derecha.

Crear `apps/frontend/src/components/nav/MoreDrawer.tsx`:

```tsx
"use client";
import { LogOut, Menu, Repeat, ShieldCheck, UserCog, Users } from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/lib/auth-store";
import { apiLogout } from "@/lib/api";

export function MoreDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const user = useAuthStore((s) => s.user);
  const isManagerPlus = user && ["manager", "admin", "superadmin"].includes(user.role);
  const isAdminPlus = user && ["admin", "superadmin"].includes(user.role);

  async function logout() {
    try { await apiLogout(); } finally {
      useAuthStore.getState().clear();
      window.location.href = "/login";
    }
  }

  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-40 bg-ink-900/30" onClick={onClose} />
      <aside className="fixed right-0 top-0 bottom-0 z-50 w-72 bg-bg-raised border-l border-border p-6 flex flex-col gap-1">
        <div className="eyebrow mb-4">Más opciones</div>
        {isManagerPlus && (
          <Link href="/team" onClick={onClose} className="flex items-center gap-3 rounded-md px-3 py-3 text-fg hover:bg-bg-sunken">
            <Users size={18} strokeWidth={1.75} /> Mi equipo
          </Link>
        )}
        {isAdminPlus && (
          <Link href="/admin/org" onClick={onClose} className="flex items-center gap-3 rounded-md px-3 py-3 text-fg hover:bg-bg-sunken">
            <ShieldCheck size={18} strokeWidth={1.75} /> Modo admin
          </Link>
        )}
        <Link href="/perfil/editar" onClick={onClose} className="flex items-center gap-3 rounded-md px-3 py-3 text-fg hover:bg-bg-sunken">
          <UserCog size={18} strokeWidth={1.75} /> Editar mi información
        </Link>
        <div className="mt-auto pt-4 border-t border-border">
          <button onClick={logout} className="flex w-full items-center gap-3 rounded-md px-3 py-3 text-danger hover:bg-bg-sunken">
            <LogOut size={18} strokeWidth={1.75} /> Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  );
}
```

Integrar en `BottomNav.tsx`: 4 links + 1 botón "Más" que abre `MoreDrawer`.

### 2.4 · Criterios

- [ ] SideNav con 4 destinos + "Mi equipo" condicional
- [ ] "Mi Radar" eliminado del sidebar
- [ ] BottomNav con 4 + "Más"
- [ ] MoreDrawer con role-aware items + logout
- [ ] `pnpm typecheck` verde
- [ ] Commit: `feat(app-polish): refactor sidebar + BottomNav with 'Más' drawer`

---

## TASK app-polish-03 · TopBar avatar dropdown · `[ ]`

### 3.1 · `apps/frontend/src/components/nav/TopBar.tsx`

Modificar el dropdown del avatar para incluir:
- Nombre + email del user (header del menu)
- `Editar mi información` → `/perfil/editar`
- `Modo admin` (si role IN admin/superadmin) → `/admin/org`
- Separator
- `Cerrar sesión`

(El "Modo admin" actual ya está como toggle en TopBar para superadmin — moverlo al dropdown y abrir también a admin.)

### 3.2 · Criterios

- [ ] Dropdown del avatar con 4 items condicionales
- [ ] Quitar el toggle "Modo admin" del header (queda solo en el dropdown)
- [ ] `pnpm typecheck` verde
- [ ] Commit: `feat(app-polish): TopBar avatar dropdown with edit profile + admin mode`

---

## TASK app-polish-04 · NUEVO `/perfil` unificado · `[ ]`

### 4.1 · Crear `apps/frontend/src/app/(app)/perfil/page.tsx`

Reemplaza a `/radar` y `/profile`. Estructura:

```
┌──────────────────────────────────────────────┐
│ Header con avatar + nombre + role + org      │
│                                              │
│ === Sección 1: Mi Radar ===                  │
│  Radar SVG grande (Recharts) con datos       │
│  REALES de apiGetMyResults()                 │
│                                              │
│ === Sección 2: Mis dimensiones ===           │
│  7 cards con: nombre pilar + state_label +   │
│  badge source + vía de movimiento + last_at  │
│                                              │
│ === Sección 3: Re-evaluar ===                │
│  7 cards (1 por pilar) con botón             │
│  "Re-evaluar" (disabled si cooldown 30d      │
│  no cumplido — mostrar tooltip "Disponible   │
│  en X días"). Card "Re-hacer evaluación      │
│  corta" arriba como opción alternativa.      │
│                                              │
│ === Sección 4: Historial ===                 │
│  Lista de pillar_results pasados con fecha   │
│  + delta. Empty state si solo hay 1.         │
│                                              │
│ === Sección 5: Logros (opcional placeholder)│
│  Empty: "Próximamente: badges al completar   │
│  pilares."                                   │
└──────────────────────────────────────────────┘
```

### 4.2 · Datos del radar

Usar `radarValuesFromResults()` ya existente. Asegurar que mapea **los 7 estados a coordenadas válidas** del RadarChart (no escala 0-100 hardcoded). Si un pilar no tiene resultado aún, mostrar punto en 0 con tooltip "No evaluado".

### 4.3 · Crear redirects

- `apps/frontend/src/app/(app)/radar/page.tsx` → redirect a `/perfil` (usar `redirect()` de Next).
- `apps/frontend/src/app/(app)/radar/[pillar]/page.tsx` → redirect a `/perfil#pilar-<code>` (anchor).
- `apps/frontend/src/app/(app)/profile/page.tsx` → redirect a `/perfil`.

### 4.4 · Criterios

- [ ] `/perfil` con 5 secciones
- [ ] Radar con datos reales de `apiGetMyResults()`
- [ ] Cards uniformes por pilar
- [ ] Cooldown 30d respetado en botones "Re-evaluar"
- [ ] `/radar`, `/radar/[p]`, `/profile` redirigen
- [ ] `pnpm typecheck` verde
- [ ] Commit: `feat(app-polish): new /perfil unifies /radar + /profile with real assessment data`

---

## TASK app-polish-05 · NUEVO `/perfil/editar` · `[ ]`

### 5.1 · Crear `apps/frontend/src/app/(app)/perfil/editar/page.tsx`

Form simple para editar:
- **Nombre completo** (`full_name`) — editable
- **Email** — read-only (cambia vía admin)
- **Cargo** (`job_title`) — editable
- **Career level** — read-only (lo asigna manager)
- Sección "Contraseña" con botón "Cambiar contraseña" → placeholder por ahora (B3-07 pendiente) — mostrar tooltip "Funcionalidad próxima".

### 5.2 · Endpoint backend

Si no existe, crear `PATCH /api/v1/me` que acepta `{ full_name, job_title }`. Mantener validación strict.

### 5.3 · Criterios

- [ ] Page `/perfil/editar` con form
- [ ] Endpoint `PATCH /me` con 2 tests backend nuevos
- [ ] Cancel button → `/perfil`
- [ ] Save → toast success + redirect
- [ ] Commit: `feat(app-polish): /perfil/editar with name/job_title editable`

---

## TASK app-polish-06 · Eliminar chips "P#" globalmente · `[ ]`

### 6.1 · Buscar y reemplazar todos los lugares donde se renderiza `P1/P2/.../P6/P6A/P6B` como texto visible al usuario

```bash
grep -rn "P1\|P2\|P3\|P4\|P5\|P6A\|P6B" apps/frontend/src --include="*.tsx" --include="*.ts" | grep -v "test\|types\|enum"
```

Lugares conocidos:
- `Badge variant="pillar-pN"` — usar variant pero label = nombre del pilar
- Radar axis labels — mapear `P1 → "Carrera"`, `P2 → "Propósito"`, etc.
- Cards de pilar en /home, /perfil — heading = nombre del pilar (sin código)
- `/admin/org` heat strip — labels = nombres
- MiniRadar — axis sin chips

### 6.2 · Helper en `lib/pillars.ts`

```ts
export const PILLAR_SHORT_LABEL: Record<PillarCode, string> = {
  P1: "Carrera",
  P2: "Propósito",
  P3: "Relaciones",
  P4: "Salud",
  P5: "Paz interior",
  P6A: "Resiliencia",
  P6B: "Finanzas",
};

export const PILLAR_FULL_LABEL: Record<PillarCode, string> = {
  P1: "Carrera e impacto",
  P2: "Propósito y significado",
  P3: "Relaciones y conexión",
  P4: "Salud y bienestar",
  P5: "Paz interior y claridad",
  P6A: "Resiliencia emocional",
  P6B: "Bienestar financiero",
};
```

Usar `PILLAR_SHORT_LABEL` donde antes había badges `P#` (radar axis, chips compactos), `PILLAR_FULL_LABEL` en headings y cards.

### 6.3 · Criterios

- [ ] Cero ocurrencias de `P1/P2/.../P6B` como texto visible al usuario
- [ ] Helpers en `lib/pillars.ts`
- [ ] Radar muestra nombres cortos en axis
- [ ] `pnpm typecheck` + `pnpm test` verdes (ajustar tests que buscan "P1")
- [ ] Commit: `feat(app-polish): replace 'P#' chips with pillar names globally`

---

## TASK app-polish-07 · Cleanup datos visibles (cursos seed) · `[ ]`

### 7.1 · Cursos con títulos descriptivos

Hoy los 3 cursos reales L1 tienen `title = "L1-P1-001" / "L1-P1-002" / "L1-P2-002"` (slug-style). Necesitan **títulos descriptivos** para demo.

**Opción A (rápida)**: actualizar el seed `seed_catalog` y los manifests para que `title` sea descriptivo. Decidir títulos junto con Andrés. Sugerencia placeholder:
- `L1-P1-001` → "Adaptabilidad en el día a día"
- `L1-P1-002` → "Aprendizaje continuo en tu rol"
- `L1-P2-002` → "Colaboración en equipos diversos"

Correr seed update en local + prod (manual con owner Neon URL).

### 7.2 · Filtrar "Seed Widget" de la UI

Los cursos `seed-w-collab2-*` y `seed-w-hist-*` son data de prueba de B4-E (necesarios para que los widgets de actividad tengan datos). NO se pueden eliminar del DB sin romper streak heatmap + activity feed.

**Solución**: en frontend, **ocultar de listados visibles** (`/library`, "Actividad reciente" en /home) los cursos con slug que empiece con `seed-w-`. Pero seguir contándolos para stats (streak, minutos).

Implementación: filtro en `apiListCourses` cliente-side **o** flag backend `?exclude_demo=true`. Mi sugerencia: flag backend opcional, default `false`, frontend lo pasa siempre `true` en producción.

### 7.3 · Criterios

- [ ] 3 cursos reales con títulos descriptivos (seed update + manifests)
- [ ] Filtro `seed-w-*` aplicado a `/library` y "Actividad reciente" /home
- [ ] Streak heatmap + widgets siguen funcionando (los datos no se borran del DB)
- [ ] Commit: `fix(app-polish): descriptive titles + hide seed-w-* from user-facing lists`

---

## TASK app-polish-08 · `/path` con CTA contextual · `[ ]`

### 8.1 · Sumar arriba del listado de carriles

Banner contextual con el **pillar más rezagado del user** según assessment:

```tsx
{nextBottleneck && (
  <Card className="mb-8 bg-cream-200 flex items-center gap-4">
    <div className="rounded-full bg-pillar-{nextBottleneck.code} w-2 h-12" />
    <div className="flex-1">
      <p className="eyebrow">Tu próximo crítico de graduación</p>
      <p className="font-semibold text-fg">{PILLAR_FULL_LABEL[nextBottleneck.code]}</p>
      <p className="text-sm text-fg-muted">{nextBottleneck.suggested_next_step}</p>
    </div>
    <Link href={`/library?pillar=${nextBottleneck.code}`}>
      <Button>Explorar este pilar →</Button>
    </Link>
  </Card>
)}
```

Cálculo: ordenar `pillar_states` por nivel ordinal (Foundation/L1 < L2 < ... < L6 / Latente < Explorador < ... / Baja < Media < Alta) y tomar el más bajo.

### 8.2 · Títulos descriptivos en cursos del carril

Aplica el cleanup de TASK 07 automáticamente.

### 8.3 · Criterios

- [ ] Banner contextual con pillar más rezagado + CTA
- [ ] Cursos con títulos descriptivos
- [ ] Commit: `feat(app-polish): /path with contextual bottleneck CTA + descriptive course titles`

---

## TASK app-polish-09 · Redirects + cleanup viejos · `[ ]`

### 9.1 · Verificar que los redirects de `/radar`, `/radar/[pillar]`, `/profile` → `/perfil` no rompan links externos.

Buscar todos los `href="/radar"` y `href="/profile"` en code + actualizarlos a `/perfil`.

### 9.2 · Eliminar archivos antiguos si nada los usa

- `apps/frontend/src/app/(app)/radar/RadarView.tsx` — verificar si se usa fuera de /radar. Si no, mover a `_archive` o eliminar.
- `apps/frontend/src/app/(app)/profile/` — eliminar todo el directorio (queda solo el `page.tsx` con redirect).

### 9.3 · Criterios

- [ ] Cero `href="/radar"` o `href="/profile"` directos en código
- [ ] Files viejos limpios
- [ ] Commit: `chore(app-polish): cleanup old /radar /profile files after /perfil unification`

---

## TASK app-polish-11 · Player sidebar con metadata real (LP-02) · `[ ]`

Sidebar derecho de `/library/[slug]` hoy muestra solo `<heading>{slug}</heading>` + duración.

### 11.1 · Backend (sin cambios de DB)

El endpoint `GET /api/v1/courses/{id}` ya devuelve `pillar_code`, `competency_code`, `level_code`, `description`, `author` (verificar en `apps/backend/src/hg/modules/learning/router.py`). Si falta `author` en el response schema, agregarlo (el modelo lo tiene).

### 11.2 · Componente `<CourseMeta/>`

`apps/frontend/src/components/learning/CourseMeta.tsx`:

```tsx
type Props = { course: Course };
export function CourseMeta({ course }: Props) {
  return (
    <aside className="flex flex-col gap-4 px-4 py-5 border-l border-border">
      <div className="flex flex-wrap gap-2">
        <Badge variant="pillar" style={{ background: pillarColor(course.pillar_code) }}>
          {PILLAR_FULL_LABEL[course.pillar_code]}
        </Badge>
        <Badge>{course.competency_code}</Badge>
        <Badge>Nivel {course.level_code}</Badge>
      </div>
      <h2 className="font-serif text-lg">{course.title}</h2>
      <p className="text-sm text-fg-muted">{course.description}</p>
      {course.author ? (
        <div className="mt-2 text-xs text-fg-muted">
          <span className="uppercase tracking-meta">Autor</span>
          <div className="mt-1 text-sm text-fg">{course.author}</div>
        </div>
      ) : null}
      <div className="mt-2 text-xs text-fg-muted">
        <span className="uppercase tracking-meta">Duración</span>
        <div className="mt-1 text-sm text-fg">{formatDuration(course.duration_seconds)}</div>
      </div>
    </aside>
  );
}
```

`PILLAR_FULL_LABEL` viene de TASK 06. `pillarColor()` debe leer del tema (e.g. `bg-pillar-p1`).

### 11.3 · Wiring en `app/(app)/library/[slug]/page.tsx`

Reemplazar el `<aside>` placeholder por `<CourseMeta course={course} />`. Layout grid `grid-cols-[1fr_320px]` en desktop. En mobile (sm:hidden) colapsar bajo el player.

### 11.4 · Empty state si curso no tiene metadata

Si `pillar_code` es null (no debería pasar con seed real pero por defensa), renderizar solo título + duración con `<EmptyMeta/>` minimal.

### 11.5 · Criterios

- [ ] Sidebar muestra badges pillar/comp/nivel con colores correctos
- [ ] Heading es `course.title` descriptivo, no slug
- [ ] Tests visual smoke OK
- [ ] Commit: `feat(app-polish): CourseMeta sidebar with pillar/competency/level/author`

---

## TASK app-polish-12 · Player: marcar completado + siguiente (LP-03) · `[ ]`

Bottom del player necesita 2 acciones mínimas para demo.

### 12.1 · Botón "Marcar como completado"

- Usar endpoint existente `POST /api/v1/learning/courses/{id}/complete` (verificar en router) o, si solo existe `progress`, sumar uno nuevo que setea `progress_pct=100` + `completed_at=now()`.
- UI: botón `<Button variant="primary">` debajo del controls bar del player. Disabled si `progress_pct === 100` (mostrar `<Badge variant="success">Completado</Badge>`).
- Después de completar: toast "¡Curso completado!" + refetch del path para invalidar el "próximo paso".

### 12.2 · Card "Siguiente curso"

Bajo el botón completar, sumar card "Siguiente en tu ruta":
- Llamar `GET /api/v1/learning/path/next?after={current_course_id}` (si no existe, crearlo: devuelve siguiente curso del path activo del user, o null).
- Si hay siguiente: link al `/library/{next.slug}` con thumbnail + título + pilar.
- Si no hay (último curso del path): copy "Completaste todos los cursos de esta ruta."

### 12.3 · Hookear con TASK 11

CourseMeta sidebar arriba + estos 2 controles abajo del player. Layout: `<div>player + actions</div>` (izquierda) + `<CourseMeta/>` (derecha).

### 12.4 · Criterios

- [ ] Botón completar funciona + toast + estado disabled correcto
- [ ] Card siguiente curso renderiza o muestra empty state
- [ ] Refetch del "próximo paso" en `/home` y `/path` después de completar
- [ ] Commit: `feat(app-polish): mark complete + next course on player`

---

## TASK app-polish-13 · "Ver como org" para superadmin (AC-01) · `[ ]`

**DEMO BLOCKER.** Permitir a HG superadmin entrar al dashboard RRHH de cualquier org con su data real.

### 13.1 · Backend · context resolver

Archivo: `apps/backend/src/hg/core/tenancy.py` (o donde se resuelve `current_org_id`).

```py
def get_current_org_id(request: Request, user: User) -> UUID:
    if user.is_superadmin():
        acting = request.cookies.get("hg_acting_org_id")
        if acting:
            try:
                return UUID(acting)
            except ValueError:
                pass
    return user.org_id
```

Aplicar este resolver en los endpoints que sirven `/admin/org`: `/api/v1/admin/org/dashboard`, `/api/v1/admin/org/funnel`, `/api/v1/admin/org/pillars`, etc. **Solo lectura** — escrituras siguen usando `user.org_id` (no permitir mutaciones cross-tenant).

### 13.2 · Backend · endpoints set/clear

```py
# routes/admin_orgs.py
@router.post("/admin/orgs/{org_id}/act-as", dependencies=[Depends(require_superadmin)])
async def act_as_org(org_id: UUID, response: Response):
    org = await org_repo.get(org_id)
    if not org: raise HTTPException(404)
    response.set_cookie("hg_acting_org_id", str(org_id), httponly=True, samesite="lax", max_age=3600)
    return {"ok": True, "org": OrgRead.from_orm(org)}

@router.post("/admin/orgs/act-as/clear", dependencies=[Depends(require_superadmin)])
async def clear_act_as(response: Response):
    response.delete_cookie("hg_acting_org_id")
    return {"ok": True}
```

### 13.3 · Frontend · botón "Ver como"

En `app/(admin)/admin/orgs/[id]/page.tsx`, en el header junto al nombre de la org, sumar:

```tsx
<Button
  variant="primary"
  onClick={async () => {
    await apiActAsOrg(orgId);
    router.push("/admin/org");
  }}
>
  Ver dashboard como esta org →
</Button>
```

### 13.4 · Banner sticky "Viendo como"

Componente `apps/frontend/src/components/admin/ActingAsBanner.tsx`. Se monta en `app/(admin)/layout.tsx`. Lee `useActingAs()` hook que hace `GET /api/v1/me` y verifica si hay `acting_as_org`. Si sí:

```tsx
<div className="sticky top-0 z-50 bg-warning-bg text-warning-fg px-4 py-2 text-sm flex items-center justify-between">
  <span>Viendo como <strong>{actingOrg.name}</strong> (no es tu org real).</span>
  <Button variant="ghost" size="sm" onClick={async () => { await apiClearActAs(); router.refresh(); }}>
    Volver a HG
  </Button>
</div>
```

### 13.5 · `GET /me` debe devolver `acting_as_org`

Endpoint `/api/v1/me` debe leer la cookie y devolver el org en el que está actuando:

```py
return UserMeRead(
    ...,
    is_superadmin=user.is_superadmin(),
    acting_as_org=acting_org if acting_org and acting_org.id != user.org_id else None,
)
```

### 13.6 · Tests + smoke

- Login superadmin → `/admin/orgs` → click Acme row → click "Ver como" → `/admin/org` debe mostrar dashboard de Acme con users seed reales.
- Click "Volver a HG" → vuelve al panel HG vacío.
- Loguearse como admin@acme.test (no superadmin) y verificar que el endpoint `/admin/orgs/{id}/act-as` devuelve 403.

### 13.7 · Criterios

- [ ] Cookie HttpOnly setea y limpia correctamente
- [ ] Banner sticky visible en `/admin/org` cuando hay acting_as_org
- [ ] Solo superadmin puede act-as · resto recibe 403
- [ ] Lecturas tenant-aware · escrituras bloqueadas (verificar al menos un endpoint de escritura: editar settings de org)
- [ ] Commit: `feat(app-polish): act-as-org for superadmin (AC-01 demo blocker)`

---

## TASK app-polish-14 · Ocultar "Mi equipo" si reports_count===0 (TM-04) · `[ ]`

Decisión Andrés: ocultar "Mi equipo" del nav cuando rol califica pero no hay reportes.

### 14.1 · Backend `GET /me` debe devolver `reports_count`

Si no existe: agregar en `UserMeRead`. SQL simple `COUNT(*) FROM users WHERE manager_id = me.id`.

### 14.2 · Frontend · update `SIDE_NAV_ITEMS`

En `lib/nav-items.ts` (creado en TASK 02), el ítem "Mi equipo" debe filtrarse:

```ts
function visibleNavItems(user: UserMe): NavItem[] {
  return SIDE_NAV_ITEMS.filter(item => {
    if (!item.roles) return true;
    if (!item.roles.includes(user.role)) return false;
    if (item.href === "/team" && (user.reports_count ?? 0) === 0) return false;
    return true;
  });
}
```

Aplicar lo mismo al BottomNav "Más" drawer.

### 14.3 · Si user navega directo a `/team` sin reportes

Mostrar empty state mejorado: card centrada con copy "Aún no tenés personas a tu cargo. Cuando se te asignen, vas a poder seguirlas desde acá." (no renderizar widgets de inactividad vacíos).

### 14.4 · Criterios

- [ ] Superadmin/admin sin reportes NO ven "Mi equipo" en sidebar ni en "Más"
- [ ] Manager con reportes SÍ lo ven
- [ ] Acceso directo a `/team` sin reportes → empty state limpio (no widgets vacíos)
- [ ] Commit: `fix(app-polish): hide Mi equipo when reports_count===0 (TM-04)`

---

## TASK app-polish-15 · Polish `/admin/orgs/[id]` (AOD-01, AOU-01..03) · `[ ]`

5 fixes pequeños en una sola TASK.

### 15.1 · Tab default = Usuarios (AOD-01)

En `app/(admin)/admin/orgs/[id]/page.tsx`:

```tsx
<Tabs defaultValue="usuarios" className="mt-8">  // antes: "invitaciones"
```

### 15.2 · Cells vacías → "—" / "Nunca" (AOU-01, AOU-02)

En `components/admin/OrgUsersTab.tsx`, en cada `<td>`:

```tsx
<td>{user.manager_name ?? <span className="text-fg-muted">—</span>}</td>
<td>{user.last_active_at ? formatDate(user.last_active_at) : <span className="text-fg-muted">Nunca</span>}</td>
```

### 15.3 · Search por nombre/email (AOU-03)

Arriba de la tabla, debajo de los 2 combobox:

```tsx
<Input
  type="search"
  placeholder="Buscar por nombre o email…"
  value={query}
  onChange={(e) => setQuery(e.target.value)}
  className="max-w-sm"
/>
```

Filtrado cliente (lista corta · sin paginación todavía):

```ts
const filtered = users.filter(u =>
  !query
  || u.name.toLowerCase().includes(query.toLowerCase())
  || u.email.toLowerCase().includes(query.toLowerCase())
);
```

### 15.4 · Header con país + fecha creación (AOD-02 lite)

En el header de la página, debajo del nombre + slug + licencias, sumar:

```tsx
{org.country ? <span className="text-xs text-fg-muted">· {org.country}</span> : null}
<span className="text-xs text-fg-muted">· Creada {formatDate(org.created_at)}</span>
```

### 15.5 · Criterios

- [ ] Tab Usuarios abre por defecto
- [ ] Celdas vacías muestran "—" o "Nunca"
- [ ] Search funciona client-side
- [ ] Header muestra country + creación
- [ ] Commit: `fix(app-polish): polish admin/orgs/[id] tab + cells + search + header`

---

## TASK app-polish-10 · Tests + screenshots · `[ ]`

### 10.1 · Actualizar tests

- Tests que buscaban "Mi Radar" como nav → buscar "Biblioteca" o "Mi Perfil"
- Tests que buscaban "P1/P2/..." → buscar nombres de pilar
- Tests del home si testean lista "Valores por pilar" → quitar

### 10.2 · Smoke manual

Login como collab1 y caminar:
- `/home` (scroll OK · stats con números · próximo paso con título · cards uniformes · seed-w-* no visible · streak empty si aplica)
- `/perfil` (radar real · 7 cards · 7 cards retake con cooldown · historial · sin Logros mock confuso)
- `/perfil/editar` (form + save)
- `/path` (banner contextual + 3 cursos descriptivos)
- `/library` (sin Seed Widget visible + títulos descriptivos)
- `/library/[slug]` (CourseMeta sidebar real · botón Marcar completado · card Siguiente)
- BottomNav mobile + "Más" drawer abre con items correctos

Login como admin@acme.test:
- Sidebar SÍ muestra "Mi equipo" (tiene reportes)
- `/team` muestra widgets con data real

Login como superadmin@hg.test:
- Sidebar NO muestra "Mi equipo" (0 reportes)
- `/admin/orgs` → click Acme → header tiene botón "Ver como esta org"
- Click "Ver como" → `/admin/org` muestra dashboard de Acme con data + banner sticky "Viendo como Acme Corp · [Volver a HG]"
- Click "Volver a HG" → vuelve al panel HG vacío
- `/admin/orgs/[id]` abre en tab Usuarios · search funciona · celdas vacías muestran "—" / "Nunca"

### 10.3 · Screenshots `docs/screenshots/polish-app-jxcr/`

- `01-home-fixed.png`
- `02-perfil-radar-real.png`
- `03-perfil-retake-cards.png`
- `04-perfil-editar.png`
- `05-path-bottleneck-cta.png`
- `06-library-clean-titles.png`
- `07-bottom-nav-mas-drawer.png`
- `08-sidebar-no-radar.png`
- `09-player-coursemeta-sidebar.png` (TASK 11)
- `10-player-mark-complete-next.png` (TASK 12)
- `11-superadmin-act-as-acme.png` (TASK 13)
- `12-acting-as-banner.png` (TASK 13)
- `13-admin-orgs-detail-users-tab.png` (TASK 15)

### 10.4 · Criterios

- [ ] Tests verdes
- [ ] 13 screenshots
- [ ] Smoke manual OK (collab1 + admin + superadmin)
- [ ] Commit: `test(app-polish): adjust tests + 13 screenshots after refactor`

---

# 🎯 Criterios globales "hecho"

- [ ] 15 TASKs commiteadas individualmente
- [ ] Scroll bug `/home` resuelto
- [ ] `/perfil` unifica radar + profile con datos reales
- [ ] `/perfil/editar` para datos personales
- [ ] Sidebar 4+1 destinos · BottomNav 4+Más con drawer · "Mi equipo" oculto si reports=0
- [ ] TopBar avatar dropdown completo
- [ ] Cero chips "P#" como texto visible
- [ ] 3 cursos con títulos descriptivos · Seed Widget filtrados de UI
- [ ] `/path` con CTA contextual del scorer
- [ ] Player con CourseMeta sidebar + marcar completado + siguiente curso
- [ ] Superadmin puede "Ver como" cualquier org → dashboard real con banner sticky
- [ ] `/admin/orgs/[id]` tab Usuarios default + search + cells limpias
- [ ] Tests verdes · 13 screenshots
- [ ] PR contra `main`

# 📤 Entrega

- SHA último commit
- 13 screenshots
- URL del PR
- Lista de desviaciones

# Status por TASK (editar al avanzar)

| ID | Subject | Status |
|---|---|---|
| app-polish-01 | Fix scroll `/home` + cleanup HM-01..14 | `[ ]` |
| app-polish-02 | Sidebar + BottomNav con "Más" drawer | `[ ]` |
| app-polish-03 | TopBar avatar dropdown | `[ ]` |
| app-polish-04 | NUEVO `/perfil` unificado | `[ ]` |
| app-polish-05 | NUEVO `/perfil/editar` | `[ ]` |
| app-polish-06 | Eliminar chips "P#" globalmente | `[ ]` |
| app-polish-07 | Cleanup data (títulos + filtro seed-w-*) | `[ ]` |
| app-polish-08 | `/path` con CTA contextual | `[ ]` |
| app-polish-09 | Redirects + cleanup viejos | `[ ]` |
| app-polish-11 | Player CourseMeta sidebar (LP-02) | `[ ]` |
| app-polish-12 | Player: marcar completado + siguiente (LP-03) | `[ ]` |
| app-polish-13 | "Ver como org" superadmin (AC-01 blocker) | `[ ]` |
| app-polish-14 | Ocultar "Mi equipo" si reports=0 (TM-04) | `[ ]` |
| app-polish-15 | Polish `/admin/orgs/[id]` tabs+search+cells | `[ ]` |
| app-polish-10 | Tests + 13 screenshots | `[ ]` |
| app-polish-10 | Tests + 8 screenshots | `[ ]` |
