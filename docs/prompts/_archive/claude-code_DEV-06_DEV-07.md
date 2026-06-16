# Prompt para Claude Code · DEV-06 (Auth) + DEV-07 (RBAC)

Copiar todo lo que está debajo de la línea y pegar en Claude Code parado en la raíz del repo (`hg-platform/`).

---

# Contexto

Continuás el monorepo `hg-platform/`. Ya está terminada la Capa 1 de Identity (Organization, User, UserSession), las migraciones B1-03/04 corren y RLS está activo con la política `tenant_isolation` que lee `app.current_org_id`. Tu trabajo hoy es **DEV-06 (autenticación)** y **DEV-07 (RBAC)** del Kanban.

# Decisión de producto ya tomada — modelo híbrido de registro

**No habrá self-service de organizaciones en el MVP.** El flujo es:

1. El **superadmin de HG** (rol `superadmin`) crea una `Organization` desde un endpoint admin interno (`POST /api/v1/admin/orgs`).
2. El superadmin envía una **invitación** al admin de la org cliente (`POST /api/v1/admin/orgs/:id/invite`). Esto genera una fila en una **nueva tabla `invitations`** con `token` (hash) + `expires_at` + `org_id` + `role` (`admin` por defecto) + `email`.
3. El invitado recibe email con link tipo `https://app.humangrowth.app/accept-invite?token=<plain>` (en MVP el email es stub-log, real en B3-05).
4. El invitado abre el link → frontend llama `POST /api/v1/auth/accept-invite` con `{token, password, full_name}` → backend crea el `User`, marca la invitación como `accepted_at`, retorna `access_token + refresh_token + user`.
5. Una vez que existe un admin de la org, ese admin puede invitar a más usuarios de su misma org (cualquier `role` permitido por su nivel). Esto reutiliza el mismo endpoint pero con `require_role("admin", "superadmin")`.
6. Endpoints públicos: solo `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`, `POST /api/v1/auth/accept-invite`. **`/auth/register` NO existe.**

Esto le da a HG control de licencias (`licenses_total` se valida en el invite), facilita facturación y matchea el modelo B2B Enterprise.

# Reglas no negociables

1. Toda query con datos de usuario corre dentro de transacción + `set_org_context(db, org_id)` ANTES del primer SELECT.
2. JWT lleva claims `sub` (user_id), `org_id`, `role`, `type` (`access`|`refresh`), `iat`, `exp`. Nada de PII en el payload más allá de eso.
3. Refresh tokens se persisten **hasheados** en `user_sessions.refresh_token_hash` (nunca plaintext). Login = nueva fila. Refresh = rota el hash. Logout = `revoked_at`.
4. Passwords hasheados con bcrypt (vía `passlib`). Mínimo 10 caracteres.
5. Cada login actualiza `users.last_login_at`. Cada request autenticada actualiza `users.last_active_at` (async vía Celery o lazy, no bloquear la respuesta).
6. Las invitaciones expiran a 7 días por default. Token mostrado al admin solo una vez (el resto del tiempo solo el hash queda en DB).
7. Conventional Commits con prefijo Kanban: `feat(B1-06): ...`, `feat(B1-07): ...`.

# TASKS

## TASK 1 · Modelo `Invitation`

Archivo nuevo: `apps/backend/src/hg/modules/identity/invitations.py` (o agregalo a `identity/models.py` si preferís — recomiendo archivo separado para mantener el módulo limpio).

```python
class Invitation(Base):
    __tablename__ = "invitations"
    __table_args__ = (
        UniqueConstraint("org_id", "email", "accepted_at", name="uq_invitation_org_email_pending"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    email: Mapped[str] = mapped_column(String(254), nullable=False, index=True)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role", create_type=False), nullable=False, default=UserRole.collaborator,
    )
    token_hash: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    invited_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"),
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    accepted_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"),
    )
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
```

Importar en `migrations/env.py` (ya importa los models del módulo, agregar import explícito si vive en archivo separado).

**Migración**: `make makemigration m="B1-06 add invitations table"` + aplicar RLS sobre `invitations` (`org_id`-based) en una segunda migración `B1-06b enable rls on invitations`.

## TASK 2 · Extender `core/security.py`

Reemplazar el módulo con:

```python
"""Password hashing + JWT helpers (access + refresh)."""
from __future__ import annotations

import hashlib
import secrets
from datetime import UTC, datetime, timedelta
from typing import Any, Literal
from uuid import UUID

import jwt
from passlib.context import CryptContext

from hg.config import get_settings

settings = get_settings()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

TokenType = Literal["access", "refresh"]


def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def _now() -> datetime:
    return datetime.now(UTC)


def create_token(
    *,
    user_id: UUID,
    org_id: UUID,
    role: str,
    token_type: TokenType,
    extra: dict[str, Any] | None = None,
) -> str:
    now = _now()
    ttl = (
        timedelta(minutes=settings.jwt_access_ttl_minutes)
        if token_type == "access"
        else timedelta(days=settings.jwt_refresh_ttl_days)
    )
    payload: dict[str, Any] = {
        "sub": str(user_id),
        "org_id": str(org_id),
        "role": role,
        "type": token_type,
        "iat": now,
        "exp": now + ttl,
        "jti": secrets.token_urlsafe(16),
    }
    if extra:
        payload.update(extra)
    return jwt.encode(payload, settings.secret_key, algorithm=settings.jwt_algorithm)


def decode_token(token: str, *, expected_type: TokenType | None = None) -> dict[str, Any]:
    payload = jwt.decode(token, settings.secret_key, algorithms=[settings.jwt_algorithm])
    if expected_type and payload.get("type") != expected_type:
        raise jwt.InvalidTokenError(f"expected token type {expected_type}, got {payload.get('type')}")
    return payload


def generate_opaque_token(nbytes: int = 32) -> tuple[str, str]:
    """Genera (plaintext, sha256-hash). Plaintext se envía al usuario una sola vez."""
    plain = secrets.token_urlsafe(nbytes)
    digest = hashlib.sha256(plain.encode()).hexdigest()
    return plain, digest


def hash_opaque_token(plain: str) -> str:
    return hashlib.sha256(plain.encode()).hexdigest()
```

## TASK 3 · Auth router · `modules/identity/router.py`

Crear el router con estos endpoints:

- `POST /api/v1/auth/login` → body `{email, password, org_slug?}`. Si `org_slug` no se pasa y el email existe en una sola org, se usa esa; si está en varias, retornar 400 pidiendo `org_slug` explícito. Verifica password, crea `UserSession`, devuelve `{access_token, refresh_token, user: {id, email, full_name, role, org_id, career_level}}`. Actualiza `last_login_at`.
- `POST /api/v1/auth/refresh` → body `{refresh_token}`. Valida JWT type=refresh, busca la session por hash del JTI o del token (decidí UNO; sugerencia: hash del token completo en `user_sessions.refresh_token_hash`), verifica no revocada y no expirada, **rota** (crea nueva session, marca la vieja como revocada), retorna nuevos access+refresh.
- `POST /api/v1/auth/logout` → body `{refresh_token}` o vía Bearer. Marca `revoked_at = now()` en la session correspondiente.
- `GET /api/v1/auth/me` → requiere Bearer. Retorna el `User` actual con `org_id` y `role`.
- `POST /api/v1/auth/accept-invite` → body `{token, password, full_name}`. Busca `Invitation` por `token_hash = sha256(token)`. Valida: no `revoked_at`, no `accepted_at`, no expirada. Verifica `org.licenses_used < org.licenses_total`. Crea `User`, incrementa `licenses_used`, marca `accepted_at` + `accepted_user_id`. Retorna tokens igual que login.

Schemas Pydantic en `modules/identity/schemas.py`.

Lógica de negocio en `modules/identity/service.py` (los endpoints son delgados, llaman al service).

Registrar el router en `hg/api/v1/__init__.py`:
```python
from hg.modules.identity.router import router as identity_router
router.include_router(identity_router, prefix="/auth", tags=["auth"])
```

## TASK 4 · Admin router (invitaciones)

`modules/admin/router.py` con:

- `POST /api/v1/admin/orgs` (superadmin only) → crea Organization. Body con todos los campos.
- `GET /api/v1/admin/orgs` (superadmin only) → lista paginada.
- `POST /api/v1/admin/orgs/:org_id/invite` (superadmin OR admin de esa org) → body `{email, role}`. Valida licencias. Crea `Invitation` con token. **Retorna el plaintext del token UNA SOLA VEZ** en la respuesta (junto al link completo para copiar). Loggea (no envía aún) el email a stdout/Sentry.
- `DELETE /api/v1/admin/invitations/:id` → marca `revoked_at` (cualquier admin de la org o superadmin).
- `GET /api/v1/admin/orgs/:org_id/invitations?status=pending|accepted|expired` → lista.

Registrar prefijo `/admin` en `api/v1`.

## TASK 5 · Middleware de auth + tenancy · `core/auth_middleware.py`

```python
"""Bearer auth + tenancy context per request."""
from __future__ import annotations

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from hg.core.security import decode_token
from hg.core.tenancy import set_org_context
from hg.db import get_db
from hg.modules.identity.models import User

bearer = HTTPBearer(auto_error=True)


def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    try:
        payload = decode_token(creds.credentials, expected_type="access")
    except Exception as e:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="invalid token") from e

    org_id = payload["org_id"]
    user_id = payload["sub"]
    # 1. Set tenant context BEFORE any query
    set_org_context(db, org_id)
    # 2. Now the SELECT respects RLS
    user = db.get(User, user_id)
    if not user or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="user not found or inactive")
    return user


def require_role(*allowed_roles: str):
    """Factory: dependency que valida que current_user.role esté en la lista."""
    def _checker(user: User = Depends(get_current_user)) -> User:
        if user.role.value not in allowed_roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail="insufficient role")
        return user
    return _checker
```

Reemplazar el stub viejo de `core/deps.py` por estos imports (mantener compatibilidad).

⚠️ **Sutileza importante**: para endpoints como `POST /admin/orgs` (crear org) y `POST /auth/accept-invite` (no hay sesión todavía), `set_org_context` no aplica de la misma forma. Solución: para esos endpoints usar una dependency `get_db_as_superadmin` que conecta con `hg_superadmin` (BYPASSRLS) o `SET LOCAL ROLE hg_superadmin` al inicio. Documentar esto en el código.

## TASK 6 · Tests

`apps/backend/tests/test_auth.py`:
- Login OK + payload del JWT correcto (claims `sub`, `org_id`, `role`, `type=access`)
- Login con password incorrecto → 401
- Login con email no existente → 401 (mismo mensaje genérico)
- Refresh OK rota la session vieja
- Refresh con token revocado → 401
- Refresh con access_token (en vez de refresh_token) → 401
- `/auth/me` retorna user correcto
- `/auth/me` sin token → 401

`apps/backend/tests/test_invitations.py`:
- Superadmin crea org y envía invitación
- Admin de org A NO puede invitar a org B (403)
- Admin sin licencias disponibles (`licenses_used == licenses_total`) → 400
- Accept-invite con token válido crea el user e incrementa `licenses_used`
- Accept-invite con token expirado → 410 (Gone)
- Accept-invite con token ya usado → 410
- Accept-invite con token revocado → 410

`apps/backend/tests/test_rbac.py`:
- Endpoint con `require_role("admin", "superadmin")` rechaza a un `collaborator` → 403
- Endpoint con `require_role("admin")` permite a `admin` de la misma org
- Admin de org A intentando ver datos de org B no ve nada (RLS lo filtra) — confirmar que la combinación RBAC + RLS funciona en capas

Correr `make test-backend` y todo verde.

## TASK 7 · Seed de demo

`apps/backend/scripts/seed.py`:
- Crea 1 superadmin global (HG)
- Crea 2 orgs demo (Tier B): "Acme Corp" (slug `acme`) y "Globex Ltd" (slug `globex`), 50 licencias cada una
- Crea 1 admin por org
- Crea 3 collaborators por org, 1 con `manager_id` apuntando al admin de la org

Comando en Makefile:
```make
seed: ## Seed datos de demo
	docker compose exec backend uv run python -m hg.scripts.seed
```

Credenciales demo en `docs/dev-credentials.md` (agregar a `.gitignore` para no commitearlo):
```
superadmin@humangrowth.app / HGsuper#2026
admin@acme.test / AdminAcme#2026
admin@globex.test / AdminGlobex#2026
collab1@acme.test / Collab#2026
... etc
```

## TASK 8 · Documentación

1. **ADR-0002 · Modelo de registro híbrido por invitación**
   - Path: `docs/adrs/ADR-0002-invitation-based-registration.md`
   - Decisión: solo invitación (sin self-service de orgs); HG controla licencias y compliance.
   - Alternativas: self-service público (descartado, no B2B), invitación pura sin superadmin (descartado, requiere panel HG).
   - Consecuencias: necesitamos panel admin HG (B1-10) antes del piloto; los emails de invitación inicialmente son stub-log.

2. Actualizar `docs/ARCHITECTURE.md`:
   - Sección "Auth & RBAC (DEV-06/07)" con diagrama de flujo (mermaid simple) de los 3 escenarios: login, refresh, accept-invite.
   - Listar endpoints públicos vs autenticados.

## TASK 9 · Commits

Dos commits limpios:
```bash
git add apps/backend/src/hg/core/security.py apps/backend/src/hg/core/auth_middleware.py \
        apps/backend/src/hg/modules/identity/{router.py,schemas.py,service.py,invitations.py} \
        apps/backend/src/hg/api/v1/__init__.py \
        apps/backend/migrations/versions/*B1-06* \
        apps/backend/tests/test_auth.py apps/backend/tests/test_invitations.py \
        apps/backend/scripts/seed.py docs/adrs/ADR-0002*
git commit -m "feat(B1-06): JWT auth + invitation-based registration flow"

git add apps/backend/src/hg/modules/admin/router.py \
        apps/backend/tests/test_rbac.py docs/ARCHITECTURE.md
git commit -m "feat(B1-07): RBAC dependency (require_role) + admin org/invitation endpoints"
```

# Criterios de "hecho"

- [ ] `make migrate` aplica las migraciones `B1-06_*` sin warnings
- [ ] `\dt` muestra la tabla `invitations` con RLS habilitada
- [ ] `make seed` corre limpio y crea las 2 orgs + 7 users
- [ ] `curl -X POST localhost:8000/api/v1/auth/login -d '{"email":"admin@acme.test","password":"AdminAcme#2026"}'` retorna `access_token`, `refresh_token`, `user`
- [ ] `curl /api/v1/auth/me -H "Authorization: Bearer <access>"` retorna el user
- [ ] Crear invitación como superadmin retorna `{invite_token, invite_url, expires_at}`
- [ ] Aceptar invitación con ese token crea el user y NO se puede reutilizar
- [ ] `make test-backend` pasa todos los tests
- [ ] `make lint-backend` sin errores
- [ ] OpenAPI en `localhost:8000/docs` muestra los nuevos endpoints organizados en tags `auth` y `admin`
- [ ] Existen `ADR-0002-invitation-based-registration.md` y la sección Auth en `ARCHITECTURE.md`

# Entrega

Reportá al final:
- Archivos creados/modificados (paths absolutos)
- Output de `make test-backend` (resumen contador de tests)
- Output de los 3 curls de prueba (login → me → invite)
- Cualquier desviación del plan y por qué la tomaste
