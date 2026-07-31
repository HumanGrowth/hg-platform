# HG · Release · Menu Audit (TASK 0 · item 1)

Fecha: 2026-07-31 · Fuente: `components/nav/{items.ts,SideNav.tsx,BottomNav.tsx,MoreDrawer.tsx,TopBar.tsx}`

## Hallazgo principal: el menú YA es declarativo y filtrado por rol

`components/nav/items.ts` define `SIDE_NAV_ITEMS: NavItem[]` con `roles?: UserRole[]`
por item + helper `sideNavItemsForRole(user)`. **No hay condicionales anidados en
JSX** — ya cumple la regla dura #5. TASK 1 está en gran parte hecho.

### Items actuales (desktop · SideNav)

| Item | href | Visible para |
|------|------|--------------|
| Inicio | `/home` | todos |
| Mi Ruta | `/path` | todos |
| Módulos | `/modulos` | todos |
| Eventos | `/eventos` | todos |
| Mi Perfil | `/perfil` | todos |
| **Mi equipo** | `/team` | **manager/admin/superadmin** (vía `showTeam`) |
| Modo admin | `/admin/org` | admin/superadmin |

- `MANAGER_ROLES = ["manager","admin","superadmin"]`, `ADMIN_ROLES = ["admin","superadmin"]`.
- **"Mi equipo" YA está** para managers en **desktop** (`SideNav`) y **mobile**
  (`MoreDrawer.tsx:44` — `/team` "Mi equipo").
- `isActive(pathname, href)` ya resuelve el estado activo incluyendo subrutas.
- Íconos lucide por item (Home, RouteIcon, Sparkles, Calendar, User, Users, ShieldCheck).

### El único gap real: el gate `reports_count > 0`

`showTeam(user)` oculta "Mi equipo" si el manager **no tiene reportes asignados**
(`reports_count ?? 0 > 0`, decisión previa TM-04). Un `manager` sin reportes en la
seed NO ve el link → probablemente esto es lo que Andy percibe como "sin entrypoint".

**Opciones (decisión de Andy):**
- A. Mantener el gate (correcto: sin equipo no hay nada que ver) → el fix es de
  **datos** (asignar reportes al manager de prueba), no de código.
- B. Mostrar siempre "Mi equipo" para managers (aunque `/team` muestre estado vacío
  "todavía no tenés reportes asignados").

### Nota: `/admin/events` NO está en el menú de nav del colaborador

Es correcto — vive en el sidebar del panel admin (`(admin)/layout.tsx`, agregado en
#40). El nav de colaborador linkea a `/admin/org` ("Modo admin") como entrada al panel.

## Conclusión TASK 1
- Refactor declarativo: **ya hecho**.
- Manager "Mi equipo" desktop+mobile: **ya hecho**.
- Acción pendiente: decidir el gate `reports_count` (A vs B) — es lo único.
