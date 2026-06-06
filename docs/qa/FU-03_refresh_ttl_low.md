# FU-03 · QA manual — ciclo de refresh con TTL bajo

**Fecha:** 2026-06-06 · **Stack:** docker compose (5 contenedores healthy) ·
**Build frontend:** imagen dockerizada en `:3000` · **Backend:** `:8000`.

## Setup

- `JWT_ACCESS_TTL_MINUTES=1` en `.env` (no commiteado) + `docker compose up -d backend`
  (recrea el contenedor para releer `env_file`; `restart` NO alcanza).
- Verificado en backend: `get_settings().jwt_access_ttl_minutes == 1`.
- Driver: Chrome real vía Playwright (`channel: chrome`, headless), capturando el
  Network y las cookies del contexto. El access token vive **en memoria** (Zustand);
  el refresh token en cookie **httpOnly** `hg_refresh`.
- **Importante:** el ciclo 401→refresh→200 se dispara en navegación **client-side**
  (SPA), donde el token viejo sigue en memoria. Un reload completo rehidrata vía
  `SessionGate` (refresh-on-load) y no exhibe el 401.
- TTL **restaurado a 30** al finalizar (`get_settings().jwt_access_ttl_minutes == 30`).

## Flujo principal — 7 pasos

| # | Acción | Esperado | Resultado |
|---|--------|----------|-----------|
| 1 | Login `admin@acme.test` | redirect `/home`, dashboard con datos | ✅ |
| 2 | Cookie `hg_refresh` httpOnly | presente | ✅ (`present: true`) |
| 3 | Esperar ~65 s (TTL access = 60 s) | token en memoria expira | ✅ |
| 4 | Click "Mi perfil" (nav client-side) | `GET /api/v1/auth/me → 401`, luego `POST /api/auth/refresh → 200`, luego retry `GET /api/v1/auth/me → 200` | ✅ secuencia exacta capturada |
| 5 | Cookie `hg_refresh` cambió | sí (rotación) | ✅ (`rotated: true`) |
| 6 | Seguir navegando | cada hit al backend refresca transparente | ✅ (mismo interceptor; 1 retry por request) |
| 7 | Logout | `/login`, cookie `hg_refresh` desaparece | ✅ (route `logout` revoca + `clearRefreshCookie`) |

### Evidencia del paso 4 (Network real capturado)

```
RESP 401  /api/v1/auth/me          ← access token expirado
RESP 200  /api/auth/refresh        ← rota el refresh (cookie nueva)
RESP 200  /api/v1/auth/me          ← retry con el access token nuevo
profile h1: "ACME CORP ADMIN"      ← perfil cargado con datos reales
```

Screenshot: `docs/screenshots/frontend-v1/07-refresh-cycle-profile.png` (perfil cargado
tras el ciclo). Nota: una captura tomada <1 s tras el click muestra "Cargando…" — es
timing del retry, no un fallo (el retry resuelve a los ~200 ms).

## Edge cases

| Caso | Esperado | Resultado |
|------|----------|-----------|
| **Refresh token revocado server-side mid-sesión** (revoco la sesión por backend, mantengo la cookie, expiro el access, navego) | caer en `/login` con toast "Sesión expirada" | ⚠️ **Parcial** — `refresh → 401` y la cookie se limpia, pero la SPA **no redirige ni togglea toast** en el momento: queda con la data sin cargar ("Cargando…"). El siguiente reload sí cae en `/login` (middleware). → **ISSUE-1** |
| **Backend caído mid-refresh** (`docker compose stop backend`, navego) | toast de error, **sin crash blanco** | ✅ sin crash blanco (shell/top-nav intacto, sin `pageerror`); ⚠️ sin toast explícito (mismo origen que ISSUE-1). Screenshot `09-backend-down.png` |
| **2 pestañas, logout en una** | la otra cae en `/login` | ✅ vía navegación/reload (logout limpia la cookie httpOnly compartida → middleware redirige). En navegación **client-side** mid-sesión aplica el mismo gap de ISSUE-1 |

Screenshot revoked: `docs/screenshots/frontend-v1/08-revoked-redirect-login.png`.

## Issues abiertos (no se resuelven en FU-03)

### ISSUE-1 — La SPA no redirige a `/login` ni togglea toast cuando el refresh falla mid-sesión
- **Dónde:** `apps/frontend/src/lib/api.ts`, interceptor de respuesta de `backend`.
  En el `catch` del refresh fallido sólo hace `useAuthStore.getState().clear()`.
- **Síntoma:** ante refresh rechazado (token revocado/expirado) o backend caído, la
  request original queda rechazada y la página muestra su estado de carga; no hay
  redirect a `/login` ni feedback. La cookie sí se limpia (route `refresh`), así que
  el próximo reload/navegación dura cae en `/login` por middleware.
- **Fix sugerido (otra tarea):** en el `catch`, además de `clear()`, hacer
  `toast("Sesión expirada", "danger")` + `window.location.assign("/login")` (o router
  push desde un punto con acceso al router). Cubre revoked + backend-down con un toast
  consistente.
- **Severidad:** media (UX; no hay fuga de datos — la sesión efectivamente termina).

## Conclusión

El **mecanismo central de refresh con rotación funciona correctamente** (pasos 1–7 ✅).
Los edge cases no producen crashes ni estados inseguros, pero el manejo de "sesión
terminada" mid-SPA es silencioso → **ISSUE-1** para pulir el feedback. TTL restaurado a 30.
