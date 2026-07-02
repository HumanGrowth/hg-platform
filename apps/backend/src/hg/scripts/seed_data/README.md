# Seed demo — credenciales (AOD-05)

Emails/nombres realistas para la demo JxCR. Todos los dominios usan `.test`
(RFC 2606, reservado — no rebotan). **Son credenciales de demo, no secretos**:
se pueden commitear.

Regenerar: `make seed` (o `python -m hg.scripts.seed`). Idempotente — no duplica
usuarios y renombra en sitio los emails viejos (`admin@acme.test`,
`prospect0-…@acme.test`, etc.) a los realistas.

## Logins

| Org | Email | Password | Rol |
|-----|-------|----------|-----|
| HG (interna) | `superadmin@humangrowth.app` | `HGsuper#2026` | superadmin |
| Acme Corp | `maria.fernandez@acme.test` | `AcmeDemo#2026` | admin (cuenta demo panel RRHH) |
| Acme Corp | `carlos.rodriguez@acme.test` | `AcmeDemo#2026` | collaborator (reporta a María) |
| Acme Corp | `ana.mendez@acme.test` | `AcmeDemo#2026` | collaborator |
| Acme Corp | `diego.hernandez@acme.test` | `AcmeDemo#2026` | collaborator |
| Acme Corp | `sofia.castro@acme.test` | `AcmeDemo#2026` | collaborator |
| Globex Ltd | `roberto.soto@globex.test` | `GlobexDemo#2026` | admin |
| Globex Ltd | `lucia.vargas@globex.test` | `GlobexDemo#2026` | manager (reporta a Roberto) |
| Globex Ltd | `javier.morales@globex.test` | `GlobexDemo#2026` | collaborator (reporta a Lucía) |
| Globex Ltd | `camila.jimenez@globex.test` | `GlobexDemo#2026` | collaborator (reporta a Lucía) |

Todas las cuentas de una org comparten el password de esa org para simplificar
la demo.

## Invitaciones Acme (tab Invitaciones)

| Email | Estado |
|-------|--------|
| `andres.vega@acme.test` | accepted |
| `valeria.quiros@acme.test` | expired |
| `fernando.picado@acme.test` | expired |
| `mariana.salas@acme.test` | pending |
| `newhire@acme.test` | accepted (preexistente, ya limpio) |
