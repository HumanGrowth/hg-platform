# Prompt Claude Code · B4-B · Frontend Manager + RRHH (dashboards + asignación de paths)

> **Modo recomendado:** `/effort high` con **Claude Opus 4.8**.
> Frontend: `/team` + `/team/[id]` + `/admin/org` + nav adaptativa por rol + modal asignar path + export CSV. ~4-5h secuencial. 8 TASKs.

---

## ⚙️ Resume protocol

Si la sesión se compacta o reinicia:

1. Releé este prompt entero (`docs/prompts/claude-code_B4-B_frontend_manager_rrhh.md`).
2. Verificá estado:
   ```bash
   git status && git log --oneline -10
   cd apps/frontend && pnpm typecheck 2>&1 | tail -10 && pnpm test 2>&1 | tail -10
   ```
3. Releé "## 📌 Estado al iniciar".
4. Buscá TASKs `🟧 IN PROGRESS` y reanudá desde el último criterio sin tildar.

## 🧱 Reglas duras

- **Un commit por TASK** con prefijo `feat(B4-B): ...`. Sub-commits intermedios `wip(B4-B): ...` cada >25 min.
- **Editá ESTE archivo al avanzar** (status + `[x]`).
- **No avances** si la TASK actual no está `✅ DONE`.
- **NO tocar backend** — este sprint es 100% frontend. Si encontrás un bug del backend B4-A, abrí issue en chat y seguí adelante con mock.
- **NO modificar componentes UI existentes** (`Button`, `Card`, `Dialog`, etc.) — usarlos como están.
- **No agregar dependencias** salvo confirmación. Recharts ya está disponible.
- **Sin BetaBanner extra** — la app ya lo tiene en layout.

## 📌 Estado al iniciar

- `main` con PR #6 mergeado. Backend prod en `api.humangrowth.io` con endpoints `/manager/me/team`, `/manager/users/{id}/detail`, `/manager/users/{id}/enroll`, `/admin/org/metrics`, `/admin/org/users/export.csv` funcionando.
- Frontend prod en `app.humangrowth.io` con `/library`, `/path`, `/library/[slug]` player HLS.
- Migraciones aplicadas en prod (rol owner Neon, Jun 17): B1-13, B2-01, B2-02, B2-03.
- Tests: backend **76/76** · frontend **25/25**.
- Route groups existentes: `(marketing)` · `(auth)` · `(app)` · `(admin)` · `(onboarding)`.
- Nav: SideNav (4 destinos colaborador), BottomNav (mobile, 4 ítems), TopBar (avatar + "Modo admin" solo para superadmin).

## 🧠 Decisiones UX

- **`/team` y `/team/[id]` viven en `(app)`** — el manager es un colaborador con bonus, no un admin separado. Aparecen como 5° destino "Mi equipo" en la nav, **solo si `user.role IN ('manager', 'admin', 'superadmin')`**.
- **BottomNav mobile**: sigue mostrando 4 ítems máximo. Si el user tiene `role=manager`, el slot "Perfil" se mueve al menú del avatar y "Mi equipo" toma su lugar. Si NO es manager, BottomNav sigue como está.
- **`/admin/org` vive en `(admin)`** — junto a `/admin/orgs`. Solo superadmin y admins de la org pueden verlo.
- **Sidebar admin** suma item "Dashboard org" arriba de "Organizaciones".
- **Iconos**: usar lucide-react. "Mi equipo" → `Users`. "Dashboard org" → `LineChart`.
- **Asignar path**: modal con dropdown `<select>` de los 6 paths (P1..P6) + tag de qué paths ya están asignados.
- **Heat map RRHH**: grilla simple con cells de color según `completion_rate` (0% → cream-200, 100% → forest). Recharts opcional para gráfico de barras de adopción por mes (mock hasta tener histórico).

---

# TASKS

## TASK B4-B-01 · Types + cliente API · `[ ]`

### 1.1 · Extender `apps/frontend/src/lib/types.ts`

```ts
export interface Enrollment {
  id: string;
  user_id: string;
  career_path_id: string;
  career_path_code: "P1" | "P2" | "P3" | "P4" | "P5" | "P6";
  career_path_name: string;
  assigned_by_user_id: string | null;
  assigned_by_name: string | null;
  source: "manual" | "auto";
  is_active: boolean;
  enrolled_at: string;
  completed_at: string | null;
}

export interface TeamMember {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  career_level: CareerLevel | null;
  job_title: string | null;
  last_active_at: string | null;
  is_inactive: boolean;
  courses_in_progress: number;
  courses_completed: number;
  total_watch_minutes: number;
  active_enrollments: number;
}

export interface TeamResponse {
  items: TeamMember[];
  total: number;
  inactive_count: number;
}

export interface CourseProgressDetail {
  course_id: string;
  course_slug: string;
  course_title: string;
  career_level: string;
  competency_code: string | null;
  watch_pct: number;
  is_completed: boolean;
  last_played_at: string;
  completed_at: string | null;
}

export interface TeamMemberDetail extends TeamMember {
  enrollments: Enrollment[];
  courses_in_progress_list: CourseProgressDetail[];
  courses_completed_list: CourseProgressDetail[];
  pillar_completion_rate: Record<"P1" | "P2" | "P3" | "P4" | "P5" | "P6", number>;
}

export interface PillarMetric {
  completion_rate: number;
  active_users: number;
  total_courses_started: number;
}

export interface TopPerformer {
  user_id: string;
  full_name: string;
  courses_completed: number;
  total_watch_minutes: number;
}

export interface OrgMetrics {
  total_licenses: number;
  active_licenses: number;
  adoption_rate: number;
  avg_watch_minutes_per_user: number;
  total_courses_completed: number;
  completion_rate_global: number;
  by_pillar: Record<"P1" | "P2" | "P3" | "P4" | "P5" | "P6", PillarMetric>;
  by_career_level: Record<string, number>;
  top_performers: TopPerformer[];
  inactive_users_count: number;
}

export type TeamSort = "name" | "last_active" | "completion";

export interface TeamFilters {
  page?: number;
  page_size?: number;
  sort?: TeamSort;
  inactive_only?: boolean;
}
```

### 1.2 · Agregar funciones en `apps/frontend/src/lib/api.ts`

```ts
export const apiGetMyTeam = async (filters?: TeamFilters): Promise<TeamResponse> => {
  const res = await backend.get<TeamResponse>("/api/v1/manager/me/team", { params: filters });
  return res.data;
};

export const apiGetTeamMemberDetail = async (userId: string): Promise<TeamMemberDetail> => {
  const res = await backend.get<TeamMemberDetail>(`/api/v1/manager/users/${userId}/detail`);
  return res.data;
};

export const apiAssignPath = async (userId: string, pathCode: string): Promise<Enrollment> => {
  const res = await backend.post<Enrollment>(`/api/v1/manager/users/${userId}/enroll`, {
    career_path_code: pathCode,
  });
  return res.data;
};

export const apiUnassignPath = async (userId: string, pathCode: string): Promise<void> => {
  await backend.delete(`/api/v1/manager/users/${userId}/enroll/${pathCode}`);
};

export const apiGetOrgMetrics = async (orgId?: string): Promise<OrgMetrics> => {
  const res = await backend.get<OrgMetrics>("/api/v1/admin/org/metrics", {
    params: orgId ? { org_id: orgId } : undefined,
  });
  return res.data;
};

/** Descarga CSV directo desde el browser. Devuelve URL para anchor download. */
export const orgUsersExportCsvUrl = (orgId?: string): string => {
  const base = `${BACKEND}/api/v1/admin/org/users/export.csv`;
  return orgId ? `${base}?org_id=${orgId}` : base;
};
```

> ⚠️ `orgUsersExportCsvUrl` retorna URL — el CSV no se descarga vía axios para preservar el comportamiento nativo de `<a download>`. El backend requiere auth Bearer, así que el download debe usar `apiExportOrgUsersCsv` con fetch + blob (alternativa más robusta). Implementar la fn con fetch que adjunta `Authorization` desde `useAuthStore` y triggea download de blob.

### 1.3 · Criterios

- [ ] Tipos en `types.ts` (TeamMember, OrgMetrics, etc.)
- [ ] 5 fns en `api.ts` con types correctos
- [ ] Helper de download CSV con auth Bearer + blob trigger
- [ ] `pnpm typecheck` verde
- [ ] Commit: `feat(B4-B): types + API client for manager/team and admin/org`

---

## TASK B4-B-02 · Nav adaptativa por rol · `[ ]`

### 2.1 · Extender `apps/frontend/src/components/nav/items.ts`

```ts
import { Hexagon, Home, Route as RouteIcon, User, Users, type LucideIcon } from "lucide-react";
import type { UserRole } from "@/lib/types";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Si está definido, solo se muestra cuando user.role está en la lista. */
  roles?: UserRole[];
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/home", label: "Inicio", icon: Home },
  { href: "/path", label: "Mi Ruta", icon: RouteIcon },
  { href: "/radar", label: "Mi Radar", icon: Hexagon },
  { href: "/team", label: "Mi equipo", icon: Users, roles: ["manager", "admin", "superadmin"] },
  { href: "/profile", label: "Perfil", icon: User },
];

export function navItemsForRole(role: UserRole | undefined): NavItem[] {
  return NAV_ITEMS.filter((item) => !item.roles || (role && item.roles.includes(role)));
}

export function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
```

### 2.2 · SideNav consume `navItemsForRole`

En `apps/frontend/src/components/nav/SideNav.tsx`, importar `navItemsForRole` y `useAuthStore`. Calcular `items = navItemsForRole(user?.role)` en render. Iterar `items` en vez de `NAV_ITEMS`.

### 2.3 · BottomNav: 4 ítems máximo, regla de prioridad

En `apps/frontend/src/components/nav/BottomNav.tsx`: si user es manager/admin/superadmin, los 4 slots son **Inicio · Mi Ruta · Mi equipo · Mi Radar** (mover Perfil al menú del avatar). Si NO es manager, los 4 slots actuales se mantienen.

```ts
function bottomNavItemsForRole(role: UserRole | undefined): NavItem[] {
  const all = navItemsForRole(role);
  if (role && ["manager", "admin", "superadmin"].includes(role)) {
    return all.filter((i) => i.href !== "/profile").slice(0, 4);
  }
  return all.slice(0, 4);
}
```

### 2.4 · Criterios

- [ ] `navItemsForRole` con filtro por rol
- [ ] SideNav muestra "Mi equipo" solo a manager/admin/superadmin
- [ ] BottomNav respeta máximo 4 ítems con prioridad role-aware
- [ ] Logout de un colaborador → no aparece "Mi equipo". Login como manager → aparece.
- [ ] `pnpm typecheck` verde
- [ ] Commit: `feat(B4-B): role-aware nav (SideNav + BottomNav add 'Mi equipo' for managers)`

---

## TASK B4-B-03 · Página `/team` · dashboard del manager · `[ ]`

### 3.1 · Crear `apps/frontend/src/app/(app)/team/page.tsx`

Client component. Estructura:

```
┌─────────────────────────────────────────────────┐
│ Eyebrow: Mi equipo                              │
│ Display: 12 personas a tu cargo                 │
│ Texto: 3 inactivas · 8 con actividad esta semana│
│                                                 │
│ [Filter: All / Solo inactivos]  [Sort: nombre ▼]│
│                                                 │
│ ┌───────────────────────────────────────────┐  │
│ │ Avatar  María González          [L3]       │  │
│ │         maria@acme.com  ·  Sr Engineer     │  │
│ │         Última actividad: hace 2 horas     │  │
│ │         3 cursos en progreso · 5 completos │  │
│ │         ████████░░ 42% completion (P1)     │  │
│ │                              [Ver detalle →]│  │
│ └───────────────────────────────────────────┘  │
│ ┌───────────────────────────────────────────┐  │
│ │ Avatar  Juan Pérez         [⚠ Inactivo]    │  │
│ │         juan@acme.com  ·  Coordinator      │  │
│ │         Sin actividad hace 12 días         │  │
│ │         ...                                 │  │
│ └───────────────────────────────────────────┘  │
│                                                 │
│  Paginación: ← 1 2 3 →                          │
└─────────────────────────────────────────────────┘
```

- Estados: `loading` (skeleton de 4 cards), `error` (card con retry), `empty` (mensaje "Aún no tenés reportes directos"), `ok`.
- Filtro `inactive_only`: switch chip que recarga con el filtro.
- Sort: dropdown con 3 opciones (Nombre / Última actividad / Completion).
- Card de cada reporte: avatar (iniciales), nombre, badge career_level, email + job_title, último acceso humano-readable (`hace 2 horas` / `hace 3 días`), counts de cursos, link `→ /team/[id]`.
- Si `is_inactive=true`, badge naranja "⚠ Inactivo" + texto en `text-fg-muted`.
- Header del page muestra `inactive_count` como badge llamativo si > 0.

### 3.2 · Helper `formatRelativeTime(isoDate: string | null): string`

En `lib/utils.ts`. Devuelve "ahora", "hace 5 min", "hace 2 horas", "hace 3 días", "hace 2 semanas", "—" si null. No agregar lib externa; usar `Intl.RelativeTimeFormat`.

### 3.3 · Criterios

- [ ] `/team` consume `apiGetMyTeam` con filtros funcionales
- [ ] Loading skeleton + empty state + error state
- [ ] Cards con todos los datos del schema
- [ ] Paginación si total > page_size (20 default)
- [ ] Link a `/team/[id]` activo
- [ ] `pnpm typecheck` + `pnpm test` verdes
- [ ] Commit: `feat(B4-B): /team manager dashboard with filters, sorts, and inactive alerts`

---

## TASK B4-B-04 · Página `/team/[id]` · detalle subordinado + asignar paths · `[ ]`

### 4.1 · Crear `apps/frontend/src/app/(app)/team/[id]/page.tsx`

```
┌─────────────────────────────────────────────────┐
│ ← Volver a mi equipo                            │
│                                                 │
│ Avatar  María González       [L3] [Sr Engineer] │
│         maria@acme.com                          │
│         Última actividad: hace 2 horas          │
│                                                 │
│ ┌─────────────────┬──────────────────────────┐  │
│ │ Progreso        │ Paths asignados          │  │
│ │ por dimensión   │                          │  │
│ │                 │ [P1] Carrera e impacto   │  │
│ │ P1 ████░░░ 60%  │  asignado por Andrés ·   │  │
│ │ P2 ░░░░░░  0%   │  hace 3 días         [×] │  │
│ │ P3 ██░░░░ 25%   │                          │  │
│ │ P4 ░░░░░░  0%   │ [P3] Relaciones          │  │
│ │ P5 ░░░░░░  0%   │  ...                 [×] │  │
│ │ P6 ░░░░░░  0%   │                          │  │
│ │                 │ [+ Asignar nuevo path]   │  │
│ └─────────────────┴──────────────────────────┘  │
│                                                 │
│ Cursos en progreso (3)                          │
│ ┌──────────────────────────────────────────────┐│
│ │ • Adaptabilidad básica · 45% · hace 2 horas  ││
│ │ • Resolver conflictos · 30% · hace 1 día     ││
│ └──────────────────────────────────────────────┘│
│                                                 │
│ Cursos completados (5)                          │
│ ┌──────────────────────────────────────────────┐│
│ │ ✓ Foundation: AI literacy · jun 10           ││
│ │ ✓ Comunicación L1 · jun 5                    ││
│ └──────────────────────────────────────────────┘│
│                                                 │
│ ⓘ Assessments: pendiente — feature en desarrollo│
│   (placeholder hasta motor B2-02/B2-03)         │
└─────────────────────────────────────────────────┘
```

- Cargar con `apiGetTeamMemberDetail(id)` en mount.
- Grid 2 columnas en desktop, stack en mobile.
- Barras de progreso por pilar (`pillar_completion_rate`): cada barra usa color `bg-pillar-pN`.
- Lista de paths asignados con badge color del pilar + nombre + metadata (asignador, hace cuánto) + botón ❌ para unenroll. Confirm dialog antes de remover.
- Botón "Asignar nuevo path" abre modal (TASK B4-B-05).
- Listas de cursos en progreso/completos con `formatRelativeTime`.
- Placeholder de Assessments con icono de info y texto explicativo.

### 4.2 · Criterios

- [ ] Carga + renderiza datos reales de `apiGetTeamMemberDetail`
- [ ] Grid 2 columnas con barras de progreso por pilar coloreadas
- [ ] Botón unenroll con confirm dialog
- [ ] Modal asignar (placeholder o componente final si llegás)
- [ ] 404 graceful si no es tu reporte directo
- [ ] `pnpm typecheck` verde
- [ ] Commit: `feat(B4-B): /team/[id] detail page with pillar completion bars and enrollment list`

---

## TASK B4-B-05 · Modal "Asignar nuevo path" · `[ ]`

### 5.1 · Componente `apps/frontend/src/components/team/AssignPathDialog.tsx`

Reutilizar `Dialog` del DS. Props:

```ts
interface Props {
  open: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  alreadyAssignedCodes: string[];        // ["P1", "P3"]
  onAssigned: (enrollment: Enrollment) => void;
}
```

Contenido:
- Header: "Asignar path a [María]"
- Subhead: "Elegí el pilar que quieras agregar a su ruta."
- Grid 2×3 de 6 cards de paths (P1..P6). Cards con `card-disabled` y check si ya asignado.
- Click en card no asignada → llama `apiAssignPath(userId, code)` → cierra modal + toast success + `onAssigned(enrollment)`.
- Si error → toast danger con mensaje del backend.

### 5.2 · Wirearlo en `/team/[id]`

Al click de "Asignar nuevo path" → abre dialog. Al `onAssigned` refrescar `apiGetTeamMemberDetail(id)` para que la lista se actualice.

### 5.3 · Criterios

- [ ] Modal funcional con 6 cards por pilar
- [ ] Cards ya asignadas marcadas + no clickeables
- [ ] Asignación + toast + refresh de la página detalle
- [ ] Error handling con toast
- [ ] `pnpm typecheck` + `pnpm test` verdes
- [ ] Commit: `feat(B4-B): AssignPathDialog modal with 6-pillar grid and toast feedback`

---

## TASK B4-B-06 · Página `/admin/org` · dashboard RRHH · `[ ]`

### 6.1 · Crear `apps/frontend/src/app/(admin)/admin/org/page.tsx`

```
┌─────────────────────────────────────────────────┐
│ Eyebrow: Panel RRHH                             │
│ Display: Adopción y progreso                    │
│ Texto: Métricas en vivo de toda la organización │
│                                                 │
│ ┌──────────┬──────────┬──────────┬──────────┐   │
│ │ Adopción │ Completion│ Activos │ Inactivos│   │
│ │   65%    │   42%     │   34    │    8     │   │
│ │ 34/52    │ 89/210    │ últimos │  >7 días │   │
│ │          │           │  30d    │          │   │
│ └──────────┴──────────┴──────────┴──────────┘   │
│                                                 │
│ Completion por pilar (heat strip)               │
│ ┌──────────────────────────────────────────────┐│
│ │ P1 ████████████████░░  72%                   ││
│ │ P2 ░░░░░░░░░░░░░░░░░░   0%                   ││
│ │ P3 ██░░░░░░░░░░░░░░░░  12%                   ││
│ │ P4 ░░░░░░░░░░░░░░░░░░   0%                   ││
│ │ P5 ░░░░░░░░░░░░░░░░░░   0%                   ││
│ │ P6 ░░░░░░░░░░░░░░░░░░   0%                   ││
│ └──────────────────────────────────────────────┘│
│                                                 │
│ Distribución por nivel  │  Top performers       │
│ ┌─────────────┐         │  1. María Pérez · 12  │
│ │ L1  ███ 12  │         │  2. Juan G    · 8     │
│ │ L2  ████ 18 │         │  3. Ana López · 7     │
│ │ L3  ███ 11  │         │                       │
│ │ L4  ██ 7    │         │                       │
│ │ L5  █ 3     │         │                       │
│ │ L6  ░ 1     │         │                       │
│ └─────────────┘         │                       │
│                                                 │
│ [⬇ Descargar progreso completo (CSV)]           │
└─────────────────────────────────────────────────┘
```

- Cargar `apiGetOrgMetrics()` en mount. Si superadmin, mostrar selector de org arriba (opcional, fase 2). Por ahora MVP: el endpoint devuelve la org del current_user.
- 4 KPI cards arriba con number grande + label + sublabel.
- Heat strip de pilares: barras horizontales con `bg-pillar-pN` y % a la derecha.
- Distribución por nivel: lista con bar chart simple (no Recharts, solo divs con width%).
- Top performers: lista 1-5 con nombre + courses_completed.
- Botón de descarga CSV: usa el helper de TASK 01 que descarga el blob con auth.

### 6.2 · Agregar item al sidebar admin

En `apps/frontend/src/app/(admin)/layout.tsx`, agregar arriba de "Organizaciones":

```tsx
<Link
  href={"/admin/org" as Route}
  className="flex items-center gap-2 rounded-md px-3 py-2 font-sans text-sm font-medium text-fg hover:bg-bg-sunken"
>
  <LineChart size={16} strokeWidth={1.75} />
  Dashboard org
</Link>
```

### 6.3 · Criterios

- [ ] `/admin/org` consume `apiGetOrgMetrics` con datos reales
- [ ] 4 KPI cards + heat strip + distribución + top performers
- [ ] Descarga CSV funcional (verificar archivo se descarga con todos los headers)
- [ ] Sidebar admin con nuevo item "Dashboard org"
- [ ] Gateado por `AdminGate` (igual que el resto de `(admin)`)
- [ ] `pnpm typecheck` verde
- [ ] Commit: `feat(B4-B): /admin/org RRHH dashboard with KPIs, heat strip and CSV export`

---

## TASK B4-B-07 · Tests frontend · `[ ]`

### 7.1 · Tests por componente

En `apps/frontend/src/app/(app)/team/__tests__/page.test.tsx`:

- Loading state visible al montar.
- Render de cards después de respuesta mock.
- Filtro `inactive_only` recarga con el filtro.
- Empty state cuando `items.length === 0`.

En `apps/frontend/src/components/team/__tests__/AssignPathDialog.test.tsx`:

- Render con 6 cards.
- Cards ya asignadas marcadas como disabled.
- Click en card disponible → llama `apiAssignPath`.

En `apps/frontend/src/lib/__tests__/utils.test.ts` (extender existente):

- `formatRelativeTime(null)` → `"—"`.
- `formatRelativeTime("hace 5 min ISO")` → `"hace 5 min"` con tolerance.

### 7.2 · Criterios

- [ ] 6-7 tests nuevos
- [ ] `pnpm test` → 31+/31+ verdes
- [ ] Commit: `test(B4-B): /team + AssignPathDialog + relative time helper`

---

## TASK B4-B-08 · Screenshots + docs · `[ ]`

### 8.1 · Screenshots `docs/screenshots/manager-rrhh-b4-b/`

Tomar con Playwright (login como `admin@acme.test`):

- `01-team-dashboard.png` — `/team` con 2 reportes y filtro normal
- `02-team-inactive-filter.png` — `/team` con filtro "Solo inactivos"
- `03-team-detail.png` — `/team/[id]` con barras por pilar
- `04-assign-path-modal.png` — modal asignar abierto
- `05-admin-org-dashboard.png` — `/admin/org` con KPIs
- `06-mobile-team-card.png` — vista mobile del team dashboard

### 8.2 · `docs/ARCHITECTURE.md`

Agregar subsección "## Frontend Manager + RRHH (B4-B)":
- Rutas `/team`, `/team/[id]`, `/admin/org`.
- Nav adaptativa por rol.
- Modal `AssignPathDialog`.
- Export CSV con auth Bearer + blob trigger.

### 8.3 · `apps/frontend/README.md`

Mencionar nuevas rutas + dependencia de endpoints `/manager/*` y `/admin/org/*`.

### 8.4 · Criterios

- [ ] 6 screenshots en `docs/screenshots/manager-rrhh-b4-b/` + CAPTURE.md
- [ ] ARCHITECTURE + frontend README actualizados
- [ ] Commit: `docs(B4-B): screenshots + ARCHITECTURE/README updates`

---

# 🎯 Criterios globales "hecho"

- [ ] 8 TASKs commiteadas individualmente.
- [ ] Nav adaptativa: colaborador NO ve "Mi equipo"; manager/admin/superadmin SÍ.
- [ ] `/team` muestra reportes reales con filtros + sort + paginación.
- [ ] `/team/[id]` muestra detalle + asignación/quitar paths funcionando contra backend prod.
- [ ] `/admin/org` muestra KPIs reales + descarga CSV.
- [ ] `pnpm build` + `typecheck` verdes · `pnpm test` 31+/31+ verde.
- [ ] 6 screenshots + ARCHITECTURE + README.

# 📤 Entrega

- SHA del último commit
- 6 screenshots
- URL del PR contra `main`
- Lista de desviaciones del plan

# Status por TASK (editar al avanzar)

| ID | Subject | Status |
|---|---|---|
| B4-B-01 | Types + cliente API + CSV download helper | `[x] DONE` |
| B4-B-02 | Nav adaptativa por rol (SideNav + BottomNav) | `[x] DONE` |
| B4-B-03 | /team dashboard con filtros y alertas | `[x] DONE` |
| B4-B-04 | /team/[id] detalle + barras por pilar | `[x] DONE` |
| B4-B-05 | AssignPathDialog modal 6 pilares | `[x] DONE` |
| B4-B-06 | /admin/org RRHH dashboard + CSV | `[x] DONE` |
| B4-B-07 | Tests frontend (6-7 nuevos) | `[x] DONE` |
| B4-B-08 | Screenshots + docs | `[x] DONE` |
