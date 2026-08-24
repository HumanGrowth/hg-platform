# Seed demo — credenciales

Emails/nombres realistas para la demo. Todos los dominios usan `.test`
(RFC 2606, reservado — no rebotan). **Son credenciales de demo, no secretos**:
se pueden commitear.

Estructura (ago-2026): **Company → Organizations**. Cada empresa tiene un `admin`
que gestiona toda la empresa (todas sus orgs + dashboard) y varias orgs, cada una
con un `manager` y 2-8 colaboradores. Se siembra además **actividad realista**
(attempts + bloques completados con recencia variada) para los dashboards.

Regenerar:

```bash
python -m hg.scripts.seed_learning_units   # units + bloques (necesario para actividad)
python -m hg.scripts.seed                   # empresas, orgs, rosters, actividad
```

Idempotente — no duplica filas; purga el demo viejo (orgs únicas `acme`/`globex`)
para un refresh limpio.

## Empresas y orgs

| Empresa | Orgs | Admin (gestiona toda la empresa) |
|---------|------|----------------------------------|
| Acme Corp | IT · Finanzas · Manufactura | `maria.fernandez@acme.test` |
| Globex Ltd | Ventas · Soporte | `patricia.alvarez@globex.test` |

Cada org tiene un manager; los colaboradores reportan a su manager y los managers
al admin de la empresa.

## Logins

| Empresa | Email | Password | Rol |
|---------|-------|----------|-----|
| HG (interna) | `superadmin@humangrowth.io` | `HGsuper#2026` | superadmin |
| Acme Corp | `maria.fernandez@acme.test` | `AcmeDemo#2026` | admin (gestiona toda Acme) |
| Acme · IT | `carlos.rodriguez@acme.test` | `AcmeDemo#2026` | manager |
| Acme · Finanzas | `roberto.jimenez@acme.test` | `AcmeDemo#2026` | manager |
| Acme · Manufactura | `fernando.picado@acme.test` | `AcmeDemo#2026` | manager |
| Globex Ltd | `patricia.alvarez@globex.test` | `GlobexDemo#2026` | admin (gestiona toda Globex) |
| Globex · Ventas | `ricardo.fonseca@globex.test` | `GlobexDemo#2026` | manager |
| Globex · Soporte | `marcela.brenes@globex.test` | `GlobexDemo#2026` | manager |

Todas las cuentas de una empresa comparten el password de esa empresa para
simplificar la demo. Los colaboradores siguen el patrón `nombre.apellido@<dominio>`
(ver `realistic_names.py`).

## Invitaciones Acme (org IT)

| Email | Estado |
|-------|--------|
| `ignacio.blanco@acme.test` | accepted |
| `renata.campos@acme.test` | expired |
| `emiliano.duran@acme.test` | pending |
