# Home real + org admin gate (B3-04 / FU-12) — screenshots

Capturadas con Playwright + Chromium contra el stack local (frontend `next dev`
:3000 + backend host :8000 + DB seedeada). Se enriqueció el progreso de
`collab1@acme.test` (dev only, sin migración) para que el home muestre datos
reales: racha de 3 días, 2 cursos completados, 1 en progreso, completion P1 67%.

| Archivo | Pantalla |
|---|---|
| `01-home-dashboard.png` | `/home` colaborador — stats (racha/min mes/completados), próximo paso, radar, completion por pilar |
| `02-home-mobile.png` | `/home` en mobile (390px) con BottomNav |
| `03-admin-org-as-admin.png` | `/admin/org` accedido por **admin de org** (no superadmin) — `OrgAdminGate`; sidebar sin "Organizaciones" |
| `04-home-modo-admin.png` | `/home` de un admin de org — botón "Modo admin" en TopBar (FU-12) + estado vacío del home |
| `05-superadmin-orgs.png` | `/admin/orgs` como superadmin — panel global (`SuperadminGate`); sidebar con ambos ítems |

**Login:** `collab1@acme.test` (01, 02), `admin@acme.test` (03, 04),
`superadmin@humangrowth.app` (05).

**FU-12:** 03 demuestra que un admin de org ya entra a su dashboard (antes el
gate global era superadmin-only). El backend ya scopeaba al admin a su propia org
(`_resolve_org` ignora `?org_id` salvo superadmin) — verificado en
`test_admin_org_metrics.py`.
