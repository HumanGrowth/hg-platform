# Prompt Claude Code · Seed con emails realistas pre-JxCR demo

> **Modo recomendado:** `/effort medium` con **Claude Sonnet 4.6**. Esfuerzo: ~30-45 min.
> Sprint **paralelo** al polish (no toca pages, solo data). Puede correr cuando sea.
> Resuelve **AOD-05** del punch list v3.

---

## ⚙️ Resume protocol

Si la sesión se compacta o reinicia:

1. Releé este prompt (`docs/prompts/claude-code_seed_realistic_emails_pre_jxcr.md`).
2. Releé `HG/Docs/HG_Punch_List_JxCR_Demo.md` §10.5 (AOD-05).
3. `git status` + `git log --oneline -5` para ver qué se hizo.
4. Reanudá desde el primer `[ ]` sin tildar.

## 🧱 Reglas duras

- **Solo afecta seed scripts** (`apps/backend/scripts/seed_*.py`). NO modifica producción.
- **NO ejecutar contra Neon prod** — solo Postgres local (`docker-compose up`).
- **NO renombrar tablas/columnas**. Solo cambiar valores literales del seed.
- **Mantener referencias** (manager_id, org_id, path_enrollments) consistentes.
- **Un commit único** al final: `chore(seed): realistic emails for demo seeds (AOD-05)`

## 📌 Por qué importa

En `/admin/orgs/acme` tab Usuarios y tab Invitaciones se ven emails feos del estilo `prospect0-e11af@acme.test`, `prospect1-430c6@acme.test` con UUID en el prefix. Para la demo a Jóvenes por Costa Rica (JxCR) eso da imagen poco profesional. Cambiar a emails realistas hispanohablantes tipo `maria.lopez@acme.test`, `juan.perez@acme.test`.

## 🎯 Scope

- **Acme Corp**: 5 users existentes + invitaciones (1 accepted + 1 expired + 2 prospect → expired). Reemplazar **TODOS** los emails seed-generated.
- **Globex Ltd**: 4 users. Mismo tratamiento.
- **HG (internal)**: 1 user superadmin. Solo verificar que sea `hg.superadmin@humangrowth.io` o similar.
- **Test Co**: 1 user trial. Cambiar a algo limpio tipo `demo@testco.test`.

## 🧠 Decisiones firmadas (no re-debatir)

1. **Sufijo de dominios**: mantener `.test` (estándar reservado RFC 2606 — no rebota).
2. **Estilo de prefix**: `nombre.apellido` (lowercase, sin ñ → n, sin tildes).
3. **Nombres**: usar lista de 30 hispanohablantes (Costa Rica / Argentina / México mix) para que JxCR sienta familiaridad regional.
4. **Roles**: mantener los roles actuales (admin / manager / collaborator) — NO reasignar.
5. **Manager relationships**: respetar el grafo actual (collab1 reporta a Admin → ese vínculo se preserva con los nuevos nombres).
6. **Determinismo**: el script debe ser idempotente. Correrlo dos veces no debe duplicar users.
7. **Email del admin de Acme**: `maria.fernandez@acme.test` (será la cuenta para hacer demo del panel RRHH).

---

# TASKS

## TASK seed-01 · Lista de nombres realistas · `[ ]`

Archivo nuevo: `apps/backend/scripts/seed_data/realistic_names.py`.

```py
"""30 nombres hispanohablantes para seed demos."""

ACME_USERS = [
    # (first_name, last_name, role, manager_email_or_None)
    ("María", "Fernández", "admin", None),  # admin@acme.test → maria.fernandez
    ("Carlos", "Rodríguez", "collaborator", "maria.fernandez@acme.test"),  # collab1
    ("Ana", "Méndez", "collaborator", None),  # collab2
    ("Diego", "Hernández", "collaborator", None),  # collab3
    ("Sofía", "Castro", "collaborator", None),  # new_hire
]

GLOBEX_USERS = [
    ("Roberto", "Soto", "admin", None),
    ("Lucía", "Vargas", "manager", "roberto.soto@globex.test"),
    ("Javier", "Morales", "collaborator", "lucia.vargas@globex.test"),
    ("Camila", "Jiménez", "collaborator", "lucia.vargas@globex.test"),
]

TESTCO_USERS = [
    ("Demo", "User", "admin", None),  # demo@testco.test
]

# Para invitaciones futuras (prospects)
PROSPECT_NAMES = [
    ("Andrés", "Vega"),
    ("Valeria", "Quirós"),
    ("Fernando", "Picado"),
    ("Mariana", "Salas"),
    ("Pablo", "Ulate"),
    ("Catalina", "Mora"),
]

def email_from(first: str, last: str, domain: str) -> str:
    """Normaliza: lowercase, sin tildes, sin ñ."""
    import unicodedata
    def _strip(s: str) -> str:
        nfd = unicodedata.normalize("NFD", s)
        return "".join(c for c in nfd if unicodedata.category(c) != "Mn").lower()
    return f"{_strip(first)}.{_strip(last)}@{domain}"
```

### Criterios

- [ ] Archivo creado con las 3 listas + helper `email_from`
- [ ] Helper testeable: `email_from("María", "Fernández", "acme.test") == "maria.fernandez@acme.test"`
- [ ] Sub-commit: `wip(seed): realistic names dataset`

---

## TASK seed-02 · Refactor `seed_acme.py` (o equivalente) · `[ ]`

Localizar el script que crea Acme + users. Probable ubicación: `apps/backend/scripts/seed_demo.py` o `apps/backend/src/hg/scripts/seed.py`.

```bash
grep -rn "acme" apps/backend/scripts/ apps/backend/src/hg/scripts/ | grep -i email
grep -rn "prospect" apps/backend/scripts/ apps/backend/src/hg/scripts/
```

Reemplazar la generación de emails así:

```py
from .seed_data.realistic_names import ACME_USERS, email_from

for first, last, role, manager_email in ACME_USERS:
    email = email_from(first, last, "acme.test")
    full_name = f"{first} {last}"
    manager = users_by_email.get(manager_email) if manager_email else None
    user = create_or_get_user(
        session,
        email=email,
        full_name=full_name,
        role=role,
        org_id=acme.id,
        manager_id=manager.id if manager else None,
    )
    users_by_email[email] = user
```

`create_or_get_user` debe ser idempotente: si existe `WHERE email=email AND org_id=org_id` → update, sino → insert.

### Mapping de migración

Si hay datos viejos en la DB local, NO hacer DELETE de users (rompe FKs). En su lugar:

```sql
-- Idempotent UPDATE de emails viejos a nuevos (correr una vez)
UPDATE users SET email = 'maria.fernandez@acme.test', full_name = 'María Fernández'
  WHERE email = 'admin@acme.test' AND org_id = (SELECT id FROM organizations WHERE slug = 'acme');

UPDATE users SET email = 'carlos.rodriguez@acme.test', full_name = 'Carlos Rodríguez'
  WHERE email = 'collab1@acme.test' AND org_id = (SELECT id FROM organizations WHERE slug = 'acme');

-- etc para los 5 users
```

Generar SQL migration `apps/backend/alembic/versions/XXX_rename_seed_emails.py` con estos UPDATEs (no DROP). Marcar `down_revision` adecuado.

### Criterios

- [ ] Script seed usa lista `ACME_USERS` para crear/actualizar
- [ ] Idempotencia verificada: correr `python -m scripts.seed_demo` dos veces no duplica
- [ ] Migration alembic con UPDATEs (no DELETE/INSERT)
- [ ] Sub-commit: `wip(seed): acme realistic emails + migration`

---

## TASK seed-03 · Refactor `seed_globex.py` + `seed_testco.py` · `[ ]`

Mismo patrón que TASK 02 para Globex (4 users) y Test Co (1 user). Sumar al mismo alembic migration los UPDATEs.

### Criterios

- [ ] Globex con 4 users realistas + grafo manager respetado
- [ ] Test Co con 1 user `demo@testco.test`
- [ ] Sub-commit: `wip(seed): globex + testco realistic emails`

---

## TASK seed-04 · Invitaciones realistas · `[ ]`

Las invitaciones de Acme hoy tienen prefix UUID (`prospect0-e11af`, `prospect1-430c6`). En el script que crea invitaciones, reemplazar por:

```py
from .seed_data.realistic_names import PROSPECT_NAMES, email_from

# Crear 4 invitaciones de Acme con prospects realistas
for i, (first, last) in enumerate(PROSPECT_NAMES[:4]):
    email = email_from(first, last, "acme.test")
    status = ["accepted", "expired", "expired", "pending"][i]
    create_invitation(session, org=acme, email=email, role="collaborator", status=status)
```

Para invitaciones existentes en DB local, sumar UPDATEs al alembic migration:

```sql
UPDATE invitations SET email = 'andres.vega@acme.test'
  WHERE email LIKE 'prospect0-%@acme.test';
UPDATE invitations SET email = 'valeria.quiros@acme.test'
  WHERE email LIKE 'prospect1-%@acme.test';
UPDATE invitations SET email = 'fernando.picado@acme.test'
  WHERE email LIKE 'preview@acme.test';
-- newhire@acme.test ya tiene email limpio, no tocar
```

### Criterios

- [ ] 4 invitaciones de Acme con nombres realistas
- [ ] Migration completa
- [ ] Sub-commit: `wip(seed): realistic invitation emails`

---

## TASK seed-05 · Ejecutar + verificar · `[ ]`

```bash
# Local Postgres corriendo
cd apps/backend
alembic upgrade head
python -m scripts.seed_demo  # idempotente
python -m scripts.seed_demo  # segunda corrida — verificar no duplica
```

Verificar en `/admin/orgs/acme`:
- Tab Usuarios: 5 users con nombres realistas. `María Fernández` como admin. Manager column muestra `María Fernández` para `Carlos Rodríguez`.
- Tab Invitaciones: 4 invitaciones con emails tipo `andres.vega@acme.test`, status mixto.

Verificar en `/admin/orgs/globex`:
- 4 users con nombres realistas.

### Criterios

- [ ] Seed corre 2x sin duplicar
- [ ] UI muestra todos los emails realistas
- [ ] Cero emails con UUID en prefix visibles
- [ ] Login con `maria.fernandez@acme.test` funciona (password: el default seed, ej `acme123!`)
- [ ] Login con `carlos.rodriguez@acme.test` funciona
- [ ] Commit final: `chore(seed): realistic emails for demo seeds (AOD-05)`

---

# 🎯 Criterios globales "hecho"

- [ ] 5 TASKs (seed-01..05) commiteadas
- [ ] Alembic migration aplicada localmente
- [ ] Seed idempotente
- [ ] `/admin/orgs/acme` + `/admin/orgs/globex` con emails realistas en Usuarios e Invitaciones
- [ ] Login con `maria.fernandez@acme.test` (admin Acme) funciona — ese será el user de demo del panel RRHH
- [ ] Documentar passwords seed en `apps/backend/scripts/seed_data/README.md` (gitignored si tiene secrets reales, commited si son `acme123!` style)

# 📤 Entrega

- SHA único final
- Lista de nuevos emails con sus passwords (para usar en demo)
- Output de `python -m scripts.seed_demo` (verificación idempotencia)

# Status por TASK (editar al avanzar)

| ID | Subject | Status |
|---|---|---|
| seed-01 | Lista de nombres realistas | `[ ]` |
| seed-02 | Refactor seed_acme + migration | `[ ]` |
| seed-03 | Refactor globex + testco | `[ ]` |
| seed-04 | Invitaciones realistas | `[ ]` |
| seed-05 | Ejecutar + verificar | `[ ]` |
