# Prompt para Claude Code · Sprint A · Lun 8 Jun AM (~1.5-2h)

> **Modo recomendado:** `/effort medium` con **Claude Opus 4.8**.
> Tareas de baja complejidad pero alta consecuencia (history del repo, merge a main). Ir despacio y verificar.

---

## ⚙️ Resume protocol

Si la sesión se compacta o reinicia:

1. Releé este prompt entero (vivís en `docs/prompts/claude-code_Sprint-A_remote_merge_issue1.md`).
2. Verificá estado real:
   ```bash
   git status
   git remote -v
   git log --oneline -10
   git branch -vv
   ```
3. Releé "## 📌 Estado al iniciar" abajo.
4. Buscá TASKs marcadas `🟧 IN PROGRESS` y reanudá.

## 🧱 Reglas duras

- **Un commit por TASK** con Conventional Commits: `chore(A-01): ...`, `fix(A-03): ...`.
- **Editá ESTE archivo al avanzar:** `[ ]` → `[x]` y status en la tabla del final.
- **No avances** si la TASK actual no está `✅ DONE`.
- **TASKs en orden estricto.** A-01 → A-02 → A-03. A-02 depende de que A-01 esté en GitHub. A-03 sale después del merge para que viva limpia en `main`.

## 📌 Estado al iniciar

- **Repo GitHub:** `https://github.com/HumanGrowth/hg-platform` (recién creado, debería estar vacío o casi).
- **Rama local actual:** `feat/B1-03-04-identity-rls` con toda la cadena B1 + FE + FUs commiteada. Último commit: `bff0bfe`.
- **`main` local:** apunta al commit inicial (`99d92d0 chore: bootstrap monorepo (B1-01)`) — probablemente vacía o mínima.
- **Stack docker:** 5/5 healthy (`docker compose up`).
- Tests backend: 34/34. Frontend: 6/6.
- ISSUE-1 abierto: `apps/frontend/src/lib/api.ts` interceptor refresh fallido no muestra toast ni redirige (ver `docs/qa/FU-03_refresh_ttl_low.md`).

---

# Contexto

3 tareas de cierre para dejar el repo listo para deploy productivo (Sprint B). La rama gigante `feat/B1-03-04-identity-rls` vive solo en disco local; sin remote no podemos enganchar Vercel/Railway. Y mejor cerrar ISSUE-1 antes del deploy para que producción salga limpia.

---

# TASKS

## TASK A-01 · Conectar GitHub remote + push de rama y main · `[x]` ✅

### 1.1 · Verificar acceso al repo remoto

```bash
gh repo view HumanGrowth/hg-platform 2>&1 | head -20
# Si gh no está autenticado: gh auth login
# Alternativa sin gh CLI: clonar bare temporal para verificar permisos
```

Confirmar que tenés permisos de push. Si el repo está en una org (HumanGrowth) y todavía no sos miembro o tu PAT no tiene scope `repo`, **frená acá** y dejá nota.

### 1.2 · Agregar remote y configurar branches

```bash
git remote add origin https://github.com/HumanGrowth/hg-platform.git
git remote -v                                    # debe mostrar origin

# Si el repo remoto tiene un commit inicial (README autogenerado), traerlo:
git fetch origin
git log origin/main --oneline 2>/dev/null        # ¿existe origin/main?
```

**Si `origin/main` existe** con commits que NO están en local:
- NO mergear ciego. Hacé `git rebase origin/main` sobre `main` local primero.
- Resolvé conflictos (si hay) — probablemente solo el README.

**Si `origin/main` NO existe** (repo recién creado vacío):
- Saltar al paso 1.3.

### 1.3 · Push de `main` (estado base)

```bash
git checkout main
git push -u origin main
```

### 1.4 · Push de la rama feature

```bash
git checkout feat/B1-03-04-identity-rls
git push -u origin feat/B1-03-04-identity-rls
```

Verificá en `https://github.com/HumanGrowth/hg-platform/branches` que la rama aparece.

### 1.5 · Configurar `.github/` files que hagan sentido

Verificá que existen y son adecuados:
- `.github/workflows/ci.yml` (debería existir desde B1-08)
- `.github/PULL_REQUEST_TEMPLATE.md` (existe)

Si falta algo:
- `.github/CODEOWNERS` — opcional, pero útil. Una sola línea: `* @<tu-github-username>` por ahora.

### 1.6 · Branch protection (manual en GitHub UI)

**Andrés hace este paso en la consola web** (Claude Code no puede vía CLI sin permisos finos):

1. `https://github.com/HumanGrowth/hg-platform/settings/branches`
2. Add branch protection rule para `main`:
   - ✅ Require a pull request before merging
   - ✅ Require status checks to pass before merging (cuando CI esté corriendo)
   - ✅ Require linear history (opcional pero recomendado)
   - ❌ NO require signed commits (innecesario en este momento)

**No bloqueante.** Si Andrés no llega a hacerlo hoy, dejarlo para mañana.

**Criterios:**
- [ ] `git remote -v` muestra `origin → github.com/HumanGrowth/hg-platform`
- [ ] `main` pusheado a origin
- [ ] `feat/B1-03-04-identity-rls` pusheado a origin con todos los commits
- [ ] `https://github.com/HumanGrowth/hg-platform` muestra el código en el browser
- [ ] CI corrió en el push (mirar Actions tab) — ya sea pass o fail, importa que se haya disparado
- [ ] Commit: ninguno (esto no toca archivos del repo, solo git remote)

---

## TASK A-02 · Self-review + merge a `main` · `[ ]`

### 2.1 · Abrir Pull Request

Vía CLI (`gh`) o web UI:

```bash
gh pr create --base main --head feat/B1-03-04-identity-rls \
  --title "Build foundational platform: DB + Auth + Frontend v1 + Docker stack" \
  --body-file /tmp/pr_body.md
```

Cuerpo del PR (`/tmp/pr_body.md`):

```markdown
## Resumen

Cierra Bloque B1 (parcial) + Frontend v1 (FE-01..FE-08) + 3 follow-ups (FU-01/02/03) en una sola cadena.

## Tickets del Kanban cubiertos

- ✅ B1-01 monorepo
- ✅ B1-03 esquema PG + Alembic (3 tablas + 4 migraciones)
- ✅ B1-04 RLS multi-tenancy (hg_app + hg_superadmin)
- ✅ B1-05 Redis + Celery
- ✅ B1-06 Auth JWT + invitaciones
- ✅ B1-07 RBAC + admin endpoints
- 🟧 B1-08 CI/CD (workflow listo, falta deploy auto)
- ✅ FE-01..FE-08 Frontend v1 (Auth + Home + Library + Profile + Admin)
- ✅ FU-01 Docker frontend fix
- ✅ FU-02 Admin users endpoint + tab
- ✅ FU-03 QA refresh ciclo

## Tests
- Backend: 34/34 passing (RLS + auth + invitations + admin users)
- Frontend: 6/6 passing (Vitest)
- Lint: ruff + mypy + ESLint todos verdes

## Migraciones DB
- `B1-03_layer1_identity.py`
- `B1-04_enable_rls_multi_tenancy.py`
- `B1-06_add_invitations_table.py`
- `B1-06b_enable_rls_on_invitations.py`

## ADRs incluidos
- ADR-0001 UUID v4 + RLS desde día 1
- ADR-0002 Registro por invitación (sin self-service)
- ADR-0003 Design system beta como direction v1

## Tipo de merge sugerido
**Merge commit** (no squash). Conservar la historia de 15+ commits ayuda a debugging futuro. La rama representa una cadena de decisiones, no un fix puntual.

## Pendientes conocidos (no bloqueantes)
- ISSUE-1: interceptor refresh fallido sin toast → se resuelve en `fix(A-03)` antes del merge
- Conexión productiva a `hg_app` (ver ADR-0001) → tarea de deploy (B1-02)
```

### 2.2 · Self-review en GitHub

Andrés (manual):
1. Ir al PR en GitHub
2. Tab "Files changed"
3. Pasarle ojo rápido — no busques perfección, busca cosas obviamente raras (credenciales en código, paths absolutos, console.log olvidados, etc.)
4. Si hay algo que arreglar, NO bloquees el merge — anótalo como issue separado y mergeá

### 2.3 · Verificar que CI está verde

```bash
gh pr checks <pr-number>
# o ver Actions tab en la web
```

Si CI falla, **NO mergear**. Anotar el fallo en una nota de A-02 y pasar a A-03 mientras se debuggea offline.

### 2.4 · Merge

Tipo: **merge commit** (no squash, no rebase). Conservamos historia.

```bash
gh pr merge <pr-number> --merge --delete-branch
# o desde la web: "Create a merge commit" + "Delete branch"
```

### 2.5 · Sincronizar local

```bash
git checkout main
git pull origin main
git branch -d feat/B1-03-04-identity-rls    # rama remota ya borrada
```

**Criterios:**
- [ ] PR creado y mergeado a `main`
- [ ] `main` en local refleja el merge (`git log --oneline -3` muestra el merge commit)
- [ ] Rama `feat/B1-03-04-identity-rls` borrada de local y remoto
- [ ] CI status del merge commit es verde (o anotado como bug separado)

---

## TASK A-03 · Fix ISSUE-1 · toast + redirect · `[x]` ✅

Crear rama nueva desde `main` actualizado:

```bash
git checkout -b fix/ISSUE-1-session-expired-toast
```

### 3.1 · Editar el interceptor en `apps/frontend/src/lib/api.ts`

**Estado actual** (líneas 54-71):

```ts
backend.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config as (typeof error.config & { _retried?: boolean }) | undefined;
    if (error.response?.status === 401 && original && !original._retried) {
      original._retried = true;
      try {
        const session = await apiRefresh();
        useAuthStore.getState().setSession(session.user, session.accessToken);
        original.headers = { ...original.headers, Authorization: `Bearer ${session.accessToken}` };
        return backend(original);
      } catch {
        useAuthStore.getState().clear();
      }
    }
    return Promise.reject(error);
  },
);
```

### 3.2 · Aplicar el fix

En el `catch`, además de `clear()`:
1. Mostrar toast "Sesión expirada — iniciá sesión otra vez" con variant `danger`.
2. Redirigir a `/login` (usar `window.location.href` para forzar full reload — evita estados Zustand stale).

Sketch:

```ts
} catch {
  useAuthStore.getState().clear();
  // Toast: usar el store de toasts existente (apps/frontend/src/lib/toast-store.ts)
  const { showToast } = await import("@/lib/toast-store").then((m) => m.useToastStore.getState());
  showToast({
    title: "Sesión expirada",
    description: "Iniciá sesión otra vez para continuar.",
    variant: "danger",
  });
  // Redirect dura: full reload limpia memoria de Zustand
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
}
```

**Verificá** la API real de `useToastStore` mirando `src/lib/toast-store.ts` — el nombre del método puede ser `add`, `push`, `showToast`, etc. Adaptá.

### 3.3 · Test manual rápido

```bash
# Bajar TTL del access token a 1 min
echo "JWT_ACCESS_TTL_MINUTES=1" >> .env       # sobrescribir si ya está
docker compose restart backend

# En browser:
# 1. Login con admin@acme.test / AdminAcme#2026
# 2. Esperar 70 seg sin hacer nada
# 3. Click en cualquier link del nav
# Resultado esperado: toast "Sesión expirada" + redirect a /login
```

**Restaurar** `.env`:

```bash
# Editar .env, volver a JWT_ACCESS_TTL_MINUTES=30
docker compose restart backend
```

### 3.4 · Test automatizado (mínimo)

En `apps/frontend/src/lib/__tests__/api.test.ts` agregar (o crear si no existe):

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

describe("axios interceptor — refresh fail", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("clears auth + redirects to /login when refresh fails", async () => {
    // Mock window.location.href
    const originalLocation = window.location;
    delete (window as any).location;
    window.location = { href: "" } as Location;

    // Mock apiRefresh to throw
    vi.mock("@/lib/api", async (importOriginal) => {
      const mod = await importOriginal<typeof import("@/lib/api")>();
      return { ...mod, apiRefresh: vi.fn().mockRejectedValue(new Error("expired")) };
    });

    // Trigger a 401 via the interceptor
    // ... (depende de cómo se exporta el axios)
    // Verificar:
    //   - useAuthStore.getState().accessToken === null
    //   - window.location.href === "/login"

    (window as any).location = originalLocation;
  });
});
```

Si el setup de Vitest no facilita el test (a veces los interceptors son difíciles de testear aislados), dejarlo como verificación manual + nota en el commit.

### 3.5 · Commit + PR + merge

```bash
git add apps/frontend/src/lib/api.ts apps/frontend/src/lib/__tests__/api.test.ts
git commit -m "fix(ISSUE-1): show toast + redirect on refresh failure"
git push -u origin fix/ISSUE-1-session-expired-toast

gh pr create --base main --head fix/ISSUE-1-session-expired-toast \
  --title "fix: toast + redirect on session expired (ISSUE-1)" \
  --body "Cierra ISSUE-1 abierto en docs/qa/FU-03_refresh_ttl_low.md. Cuando el refresh falla (token revocado o backend caído), ahora se muestra toast 'Sesión expirada' y se hace redirect a /login con full reload para limpiar memoria de Zustand."

# Self-review rápido + merge
gh pr merge --merge --delete-branch
git checkout main && git pull
```

**Criterios:**
- [ ] Edit aplicado a `apps/frontend/src/lib/api.ts`
- [ ] Verificado manualmente en browser (TTL=1min, esperar, click, ver toast+redirect)
- [ ] `.env` restaurado a TTL=30
- [ ] PR mergeado a `main`
- [ ] `docs/qa/FU-03_refresh_ttl_low.md` actualizado marcando ISSUE-1 como RESUELTO (commit dentro del mismo PR)

---

# 🎯 Criterios globales "hecho"

- [ ] Repo en `https://github.com/HumanGrowth/hg-platform` con `main` actualizado
- [ ] Toda la cadena B1+FE+FU mergeada en `main` (1 merge commit)
- [ ] ISSUE-1 cerrado en otro merge commit
- [ ] CI corriendo en push a main (verde o issue tracked)
- [ ] Local sincronizado con remoto (`git status` clean)
- [ ] Ramas feature borradas (local y remoto)

# Entrega

Reporte al cerrar:
1. URL del PR principal mergeado
2. URL del PR de ISSUE-1 mergeado
3. SHA del merge commit en `main`
4. Status del CI (verde / failing — con detalles si failing)
5. Tiempo total invertido
6. Desviaciones del plan

---

## 🟧 Status por TASK

| ID | Subject | Status |
|---|---|---|
| A-01 | GitHub remote + push branches | ✅ |
| A-02 | Self-review + merge a main | ✅ |
| A-03 | Fix ISSUE-1 toast + redirect | ✅ |

> Estados: `[ ]` pending · `🟧` in progress · `✅` done · `🚫` blocked (con nota)
