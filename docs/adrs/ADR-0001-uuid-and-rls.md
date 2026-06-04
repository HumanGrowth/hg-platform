# ADR-0001 — UUID v4 en aplicación + Row Level Security desde día 1

- **Estado:** Aceptado
- **Fecha:** 2026-06-04
- **Entregables relacionados:** DEV-03 (esquema Capa 1), DEV-04 (RLS multi-tenancy)

## Contexto

Human Growth es una plataforma multi-tenant: una sola base de datos PostgreSQL
aloja datos de múltiples organizaciones (`org_id`). Dos decisiones transversales
deben fijarse antes de escribir cualquier tabla con datos de usuario:

1. **Cómo se generan las claves primarias.**
2. **Cómo se garantiza el aislamiento entre tenants.**

Ambas son caras de revertir una vez que hay datos productivos, por eso se
deciden en el día 1.

## Decisión

### 1. Identificadores: UUID v4 generado en la aplicación

- Todas las tablas usan `id UUID PRIMARY KEY`, con el valor generado en Python
  (`default=uuid.uuid4` en el modelo SQLAlchemy), **no** en la base de datos.

### 2. Row Level Security (RLS) desde el día 1

- Toda tabla con datos de usuario lleva `org_id NOT NULL` + índice.
- Se habilita `ENABLE ROW LEVEL SECURITY` **y** `FORCE ROW LEVEL SECURITY` en
  esas tablas (`users`, `user_sessions`).
- Política `tenant_isolation` (USING + WITH CHECK):

  ```sql
  org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
  ```

- Cada request/sesión de FastAPI debe fijar el contexto dentro de su
  transacción con `SET LOCAL` / `set_config('app.current_org_id', <uuid>, true)`
  (helper `hg.core.tenancy.set_org_context`).
- Los **workers de Celery** y cualquier proceso fuera del ciclo request deben
  llamar explícitamente a `set_org_context()` por cada unidad de trabajo
  scopeada a un tenant.
- `organizations` **no** lleva RLS: es la tabla raíz de tenant (no tiene
  `org_id`) y se gobierna a nivel de aplicación / rol administrativo.

### Roles de base de datos

- `hg_app` — **NOSUPERUSER, NOBYPASSRLS**. Rol bajo el cual debe operar la
  aplicación para que las políticas se apliquen.
- `hg_superadmin` — **BYPASSRLS**. Para operaciones internas que deben cruzar
  tenants (jobs de plataforma, soporte, migraciones administrativas).

> ⚠️ **Nota operativa importante:** en PostgreSQL los superusuarios y los roles
> `BYPASSRLS` **ignoran** las políticas RLS incluso con `FORCE`. El rol por
> defecto del contenedor de desarrollo (`hg`) es superusuario, por lo que la app
> **no queda protegida** si conecta como `hg`. Para que el aislamiento sea
> efectivo, la cadena de conexión de la aplicación debe usar `hg_app` (o hacer
> `SET ROLE hg_app`). Pendiente de cablear en la configuración de despliegue.

## Alternativas consideradas

| Alternativa | Por qué se descartó |
|---|---|
| **`BIGSERIAL` / enteros autoincrementales** | IDs enumerables (fuga de volumen de negocio, IDOR más fácil); colisión al mergear/sharding futuro. |
| **`gen_random_uuid()` server-side (pgcrypto)** | Genera el ID recién en el `INSERT`: peor para flujos donde la app necesita el ID antes de persistir (relaciones, eventos, logs), y dificulta el debug/trazabilidad en la capa de aplicación. |
| **Aislamiento sólo por `WHERE org_id = ?` en la app** | Una sola query sin el filtro fuga datos entre tenants; RLS lo hace cumplir en el motor, como red de seguridad. |

## Consecuencias

- ✅ IDs no enumerables y generables antes de tocar la DB.
- ✅ Aislamiento por tenant garantizado por el motor, no sólo por disciplina del
  desarrollador.
- ⚠️ Cada sesión de FastAPI **debe** ejecutar `SET LOCAL app.current_org_id`
  dentro de su transacción (`get_db` abre una transacción explícita para esto).
- ⚠️ Los workers Celery **deben** usar `set_org_context()` explícitamente.
- ⚠️ La conexión productiva de la app debe usar el rol `hg_app` (no un
  superusuario) para que RLS tenga efecto.
- ⚠️ La política usa `NULLIF(..., '')` para que un contexto ausente/vacío
  devuelva 0 filas en lugar de lanzar un error de casteo de UUID.
