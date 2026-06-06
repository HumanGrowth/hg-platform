# Prompt para Claude Code · FU-01 + FU-02 + FU-03 (desbloqueos post-FE v1)

> **Modo recomendado:** `/effort high` con **Claude Opus 4.8**.
> Para FU-01 alcanza `/effort medium` (es DevOps mecánico); FU-02 y FU-03 se quedan en `high`.
> Estimado total: 3-4h con AI-assist. Tres FUs independientes — si una se complica, dejá nota y pasá a la siguiente.

---

## ⚙️ Resume protocol — leer ANTES de tocar código

Si la sesión se compacta (`/compact`) o reinicia:

1. Releé este prompt entero (vivís en `docs/prompts/claude-code_FU-01_02_03.md`).
2. Verificá estado real del repo:
   ```bash
   git status
   git log --oneline -10
   make test-backend 2>&1 | tail -20
   docker compose ps
   docker compose exec backend uv run alembic current
   cd apps/frontend && pnpm typecheck 2>&1 | tail -10
   ```
3. Releé "## 📌 Estado al iniciar" abajo.
4. Buscá TASKs con `🟧 IN PROGRESS` y reanudá desde el último criterio sin tildar.

## 🧱 Reglas duras

- **Un commit por TASK** con prefijo Kanban: `fix(FU-01): ...`, `feat(FU-02): ...`, `chore(FU-03): ...`.
- **Sub-commits intermedios** cada >25 min: `wip(FU-XX): partial — <qué>`.
- **Editá ESTE archivo al avanzar:** marcá `[ ]` → `[x]` y status en la tabla del final.
- **No avances** si la TASK actual no está `✅ DONE` con criterios verdes + commit.
- Si bloqueás, dejá nota debajo de la TASK y pasá; no inventés decisiones de producto.
- **TASKs independientes** — orden recomendado FU-01 → FU-02 → FU-03 pero no obligatorio. Si FU-02 backend tarda, podés cerrar FU-03 primero.

## 📌 Estado al iniciar

- Último commit: `60c549c` (docs ADR-0003). Rama `feat/B1-03-04-identity-rls`. **No mergeada a main** todavía.
- Stack local en `pnpm dev :3000` funciona end-to-end (login/admin/invite verificado Día 4).
- Stack en `docker compose up` **NO funciona**: contenedor `hg-frontend` en crash-loop.
- Backend OK en Docker (`hg-backend`, `hg-worker`, `hg-postgres`, `hg-redis` saludables).
- Tests backend: 25/25 verdes. Frontend: 6/6.
- Migraciones aplicadas: `B1-03 layer1 identity`, `B1-04 enable rls`, `B1-06 add invitations`, `B1-06b enable rls on invitations`.
- Tablas: `organizations`, `users`, `user_sessions`, `invitations` (todas con RLS donde aplica).
- Seed: 3 orgs (Acme, Globex, Human Growth) + 9 users. Credenciales en `docs/dev-credentials.md`.

---

# Contexto

Cerrás los 3 follow-ups identificados al cierre del Frontend v1 (ver journal en Notion "HG Dev - Task Journal", entrada Día 4). El objetivo es **dejar el stack 100% levantado en Docker y demoable end-to-end**, sin huecos visibles en el panel admin.

Después de esto el camino queda libre para B1-02 (deploy productivo a Railway/Vercel/Neon) y B1-09 (migración 111 videos a R2) sin sorpresas.

---

# TASKS

## TASK FU-01 · Fix contenedor `hg-frontend` para Docker compose · `[x]` ✅

**Problema:** el contenedor `hg-frontend` está en crash-loop por dos issues:
1. `MODULE_NOT_FOUND: /app/server.js` — mismatch entre lo que copia el Dockerfile y lo que `CMD` ejecuta.
2. **Falta** `API_BASE_URL_INTERNAL` env var — las Next API routes server-side resuelven `localhost:8000` desde dentro del contenedor, que es **el contenedor mismo**, no `backend:8000`.

### 1.1 · Diagnóstico inicial

Antes de tocar nada, levantá el contenedor para reproducir el error y confirmar:
```bash
docker compose up frontend 2>&1 | head -30
```
Anotá el path exacto que `node` no encuentra y el `WORKDIR` actual.

### 1.2 · Fix Dockerfile (`apps/frontend/Dockerfile`)

El Dockerfile actual copia `apps/frontend/.next/standalone` a `/app/` y ejecuta `node apps/frontend/server.js`. El issue es la combinación con `outputFileTracingRoot: path.join(import.meta.dirname, "../../")` en `next.config.mjs`, que hace que `standalone` se genere en una estructura específica.

Verificar contenido real:
```bash
docker compose run --rm --entrypoint sh frontend -c "find / -name 'server.js' 2>/dev/null | head; ls -la /app/; ls -la /app/apps/frontend/ 2>/dev/null"
```

**Solución sugerida** (validar antes de aplicar):
- Mantener `outputFileTracingRoot` en `next.config.mjs` apuntando al root del monorepo (necesario para que standalone incluya deps del workspace).
- En el Dockerfile etapa runtime, copiar el standalone respetando esa estructura:
  ```dockerfile
  # standalone con tracingRoot=monorepo genera /app/apps/frontend/server.js
  # y /app/node_modules con las deps del workspace
  COPY --from=builder --chown=nextjs:nodejs /app/apps/frontend/.next/standalone ./
  COPY --from=builder --chown=nextjs:nodejs /app/apps/frontend/.next/static ./apps/frontend/.next/static
  COPY --from=builder /app/apps/frontend/public ./apps/frontend/public
  ```
- `CMD ["node", "apps/frontend/server.js"]` — verificar que el archivo existe después del COPY.

Si el path generado por Next es diferente al esperado, ajustar el CMD acordemente. **NO inventes** la solución — verificá con un build local primero:
```bash
cd apps/frontend && pnpm build && ls -la .next/standalone/
```

### 1.3 · Fix `docker-compose.yml` con env var de red interna

Agregar al servicio `frontend`:
```yaml
environment:
  NEXT_PUBLIC_API_BASE_URL: http://localhost:8000      # del browser
  API_BASE_URL_INTERNAL: http://backend:8000           # de las Next API routes server-side
  AUTH_URL: http://localhost:3000
  AUTH_SECRET: ${AUTH_SECRET:-change_me}
```

### 1.4 · Adaptar `apps/frontend/app/api/auth/*/route.ts`

Las API routes server-side deben usar `API_BASE_URL_INTERNAL` cuando existe, y caer en `NEXT_PUBLIC_API_BASE_URL` cuando no:

```ts
const BACKEND_INTERNAL =
  process.env.API_BASE_URL_INTERNAL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8000";
```

Buscá en `apps/frontend/src/app/api/auth/` los `fetch()`/`axios` que llaman al backend y reemplazá la base URL. **No toques** el cliente browser (`src/lib/api.ts` con `backend` axios) — ese sigue usando `NEXT_PUBLIC_API_BASE_URL`.

### 1.5 · Documentar en `.env.example`

Agregar la nueva variable:
```env
# URL del backend desde dentro de la red Docker (usado por Next API routes server-side).
# En local con Docker: http://backend:8000. En Vercel + Railway: la URL pública del backend.
API_BASE_URL_INTERNAL=http://backend:8000
```

### 1.6 · Smoke test

```bash
docker compose down
docker compose up --build -d
sleep 15
docker compose ps                                              # todos healthy
curl -fsS http://localhost:3000/                               # 200 o 307 (redirect a /login)
curl -fsS http://localhost:3000/login                          # 200 HTML con la palabra "Human Growth"
# Login server-side (Next route → backend interno)
curl -fsS -c /tmp/c.txt -H 'Content-Type: application/json' \
  -d '{"email":"admin@acme.test","password":"AdminAcme#2026"}' \
  http://localhost:3000/api/auth/login | jq .user.email
# Debe retornar "admin@acme.test"
```

**Criterios:**
- [ ] `docker compose up` deja `hg-frontend` en estado healthy (no crash-loop)
- [ ] `curl http://localhost:3000/login` retorna 200
- [ ] Login server-side via Next API route funciona (alcanza al backend por la red docker)
- [ ] `.env.example` documenta `API_BASE_URL_INTERNAL`
- [ ] `docker compose down && docker compose up --build` reproducible desde cero
- [ ] Commit: `fix(FU-01): docker frontend container + internal backend URL routing`

---

## TASK FU-02 · Backend endpoint users por org + cierre tab Usuarios admin · `[ ]`

**Problema:** el tab "Usuarios" en `/admin/orgs/:id` quedó como placeholder porque el backend no expone listado de users por org ni operaciones admin sobre users. Bloquea cierre 100% de B4-08.

### 2.1 · Backend — schemas + service + endpoints

**Archivo:** `apps/backend/src/hg/modules/admin/router.py` (o crear `admin/users_router.py` si preferís separar).

Agregar 2 endpoints:

```python
@router.get("/orgs/{org_id}/users", response_model=PaginatedUsers)
def list_org_users(
    org_id: UUID,
    status: Literal["active", "inactive", "all"] = "all",
    role: UserRole | None = None,
    page: int = 1,
    page_size: int = 50,
    current_user: User = Depends(require_role("superadmin", "admin")),
    db: Session = Depends(get_db_as_superadmin),
) -> PaginatedUsers:
    """Lista users de una org. Admin solo puede listar su propia org."""
    if current_user.role.value == "admin" and current_user.org_id != org_id:
        raise HTTPException(403, "cannot list users of another org")
    # ... query con filter por status (is_active) + role + paginación
```

```python
@router.patch("/users/{user_id}", response_model=UserOut)
def update_user(
    user_id: UUID,
    payload: UserAdminUpdate,  # is_active?, role?, manager_id?, career_level?
    current_user: User = Depends(require_role("superadmin", "admin")),
    db: Session = Depends(get_db_as_superadmin),
) -> UserOut:
    """Admin de la misma org puede modificar; superadmin puede cualquiera.

    Reglas:
    - No podés desactivar al último superadmin.
    - No podés cambiar tu propio role.
    - manager_id debe pertenecer a la misma org.
    - Si is_active pasa de True a False, decrementar org.licenses_used.
    - Si is_active pasa de False a True, validar org.licenses_used < licenses_total.
    """
```

**Schemas** (`apps/backend/src/hg/modules/admin/schemas.py` o reusar identity):
```python
class UserAdminUpdate(BaseModel):
    is_active: bool | None = None
    role: UserRole | None = None
    manager_id: UUID | None = None
    career_level: CareerLevel | None = None

class UserOut(BaseModel):
    id: UUID
    email: str
    full_name: str
    role: UserRole
    career_level: CareerLevel | None
    is_active: bool
    last_login_at: datetime | None
    last_active_at: datetime | None
    manager_id: UUID | None
    created_at: datetime

class PaginatedUsers(BaseModel):
    items: list[UserOut]
    total: int
    page: int
    page_size: int
```

**Importante:** corre bajo `hg_superadmin` (BYPASSRLS) + check explícito de `org_id` en el código — sigue el mismo patrón que `list_org_invitations`.

### 2.2 · Tests backend (`apps/backend/tests/test_admin_users.py`)

- Superadmin lista users de Acme → ve los 4 users de Acme
- Admin de Acme lista users de Globex → 403
- Admin de Acme lista users de Acme → ve 4 (con paginación, filtros status/role funcionan)
- PATCH desactivar user → `licenses_used` baja en 1
- PATCH reactivar cuando `licenses_used == licenses_total` → 400 (sin licencias)
- PATCH cambiar manager_id a user de otra org → 400 (cross-org no permitido)
- PATCH desactivar al último superadmin → 400 (regla de negocio)
- Admin no puede modificar su propio role → 400
- Collaborator → 403 en cualquiera de los dos endpoints

**Criterios backend:**
- [ ] `GET /api/v1/admin/orgs/{id}/users` paginado con filtros `status` + `role`
- [ ] `PATCH /api/v1/admin/users/{id}` con validaciones de licencias y cross-org
- [ ] OpenAPI muestra los 2 endpoints nuevos bajo tag `admin`
- [ ] `make test-backend` pasa (incluyendo los nuevos tests)
- [ ] `make lint-backend` verde

### 2.3 · Frontend — cliente API + tab Usuarios

**Archivo:** `apps/frontend/src/lib/api.ts` — agregar:
```ts
export const apiListOrgUsers = async (
  orgId: string,
  params?: { status?: string; role?: string; page?: number; page_size?: number },
) => {
  const res = await backend.get(`/api/v1/admin/orgs/${orgId}/users`, { params });
  return res.data as { items: User[]; total: number; page: number; page_size: number };
};

export const apiUpdateUser = async (userId: string, payload: Partial<User>) => {
  const res = await backend.patch(`/api/v1/admin/users/${userId}`, payload);
  return res.data as User;
};
```

**UI del tab Usuarios** en `apps/frontend/src/app/(admin)/admin/orgs/[id]/page.tsx`:
- Tabla con columnas: name (full_name + email), role (badge), career_level, manager (nombre o "—"), last_active_at, status (chip active/inactive).
- Filtros arriba: select status (all/active/inactive), select role.
- Row actions (menú "..."): "Desactivar" / "Reactivar", "Cambiar rol" (modal), "Reasignar manager" (modal con select de users de la misma org).
- Paginación abajo (50 por página).
- Empty state si `items.length === 0`.

**Reglas UI:**
- Si el current user es admin (no superadmin) y el row es él mismo, deshabilitar el menú con tooltip "No puedes modificar tu propia cuenta".
- Si la org tiene `licenses_used >= licenses_total`, mostrar warning chip arriba de la tabla: "Sin licencias disponibles · no puedes reactivar users".

**Criterios frontend:**
- [ ] Tab "Usuarios" muestra users reales de la org
- [ ] Filtros status/role funcionan
- [ ] Desactivar/reactivar user actualiza `licenses_used` en la card de la org (refetch tras mutate)
- [ ] Cambio de rol y reasignar manager funcionan
- [ ] Admin de org A intenta abrir `/admin/orgs/<org-B-id>` → 403 visible (no pantalla rota)
- [ ] Voice OK: nada de "journey/unlock/rockstar/elevate"
- [ ] Commit: `feat(FU-02): admin users endpoint + Users tab in org detail panel`

---

## TASK FU-03 · QA manual del refresh con TTL bajo · `[ ]`

**Objetivo:** verificar end-to-end en navegador real que el ciclo refresh funciona cuando el access token expira mid-sesión.

### 3.1 · Setup

1. Bajar el TTL del access token a 1 minuto. Editar `.env` local (NO commitear):
   ```env
   JWT_ACCESS_TTL_MINUTES=1
   ```
2. Restart backend: `docker compose restart backend`.
3. Abrir Chrome/Firefox normal (no incognito), DevTools Network tab abierto.

### 3.2 · Flujo a verificar

| Paso | Acción | Resultado esperado |
|---|---|---|
| 1 | Ir a `http://localhost:3000/login`, login `admin@acme.test / AdminAcme#2026` | Redirect a `/home`, dashboard renderiza con datos |
| 2 | En DevTools Application > Cookies, verificar cookie `hg_refresh` httpOnly | Presente |
| 3 | Esperar 70 segundos (sin tocar nada) | — |
| 4 | Click en "Mi perfil" en el nav | `/profile` carga datos. En Network: 1× `/api/v1/auth/me` → 401, seguido de 1× `/api/auth/refresh` → 200, seguido de 1× `/api/v1/auth/me` retry → 200 |
| 5 | Verificar cookie `hg_refresh` cambió | Sí (rotación de refresh) |
| 6 | Continuar navegando otros 70 seg | Cada navegación que pegue al backend debe disparar el ciclo refresh transparentemente |
| 7 | Click en logout | `/login` aparece. Cookie `hg_refresh` desaparece. |

### 3.3 · Edge cases a probar

- **Refresh token revocado:** logout en una pestaña, intentar acción en otra pestaña abierta → debería caer en `/login` con toast "Sesión expirada".
- **Backend caído mid-refresh:** apagar `docker compose stop backend`, intentar navegar → toast de error, no crash blanco.
- **2 pestañas abiertas:** en una hacer logout, esperar 70 seg, en la otra hacer click — debería caer en `/login`.

### 3.4 · Documentar resultados

Crear `docs/qa/FU-03_refresh_ttl_low.md` con:
- Capturas de DevTools Network del ciclo 401 → refresh → 200
- Tabla de los 7 pasos + edge cases con ✅/❌ por cada uno
- Cualquier bug encontrado → archivar como issue separado (no resolver en FU-03)

### 3.5 · Restaurar TTL

Volver `.env` a `JWT_ACCESS_TTL_MINUTES=30` y `docker compose restart backend`.

**Criterios:**
- [ ] Documento `docs/qa/FU-03_refresh_ttl_low.md` con el reporte
- [ ] Tabla de 7 pasos + 3 edge cases todos ✅, o issues abiertos para los que fallaron
- [ ] TTL restaurado a 30 min al final
- [ ] Commit: `chore(FU-03): manual QA report — refresh cycle with low TTL`

---

# 🎯 Criterios globales "hecho"

- [ ] FU-01 commiteado: `docker compose up` levanta el stack completo healthy
- [ ] FU-02 commiteado: tab Usuarios funciona, endpoints backend con tests verdes
- [ ] FU-03 commiteado: doc de QA con resultados del ciclo refresh
- [ ] `make test-backend` pasa (≥ 30 tests con los nuevos de FU-02)
- [ ] `make lint-backend` y `cd apps/frontend && pnpm lint && pnpm typecheck && pnpm build` verdes
- [ ] `docker compose ps` muestra los 5 contenedores healthy

# Entrega

Reportá al final:
1. Archivos creados/modificados (paths absolutos)
2. Output de `make test-backend` (resumen contador)
3. Output de `docker compose ps` (5 servicios healthy)
4. Screenshots adicionales si encontraste algo visualmente notable
5. Desviaciones del plan y por qué
6. Issues abiertos (si FU-03 detectó algún bug que no debe resolverse acá)
7. **Actualizá `📌 Estado al iniciar`** arriba con el commit final

---

## 🟧 Status por TASK (actualizar a medida que avanzás)

| ID | Subject | Status | Effort sugerido |
|---|---|---|---|
| FU-01 | Fix Docker frontend (Dockerfile + env var) | ✅ | medium |
| FU-02 | Endpoint users por org + tab Usuarios admin | `[ ]` | high |
| FU-03 | QA manual refresh TTL bajo | `[ ]` | medium |

> Estados: `[ ]` pending · `🟧` in progress · `✅` done · `🚫` blocked (con nota)
