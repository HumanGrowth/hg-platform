# Motor de assessment (B2-02/B2-03) — screenshots

Capturadas con Playwright + Chromium contra el stack local (frontend `next dev`
:3000 + backend host :8000 + Postgres con migración B2-04 + seed de los 9
instrumentos). Se corrieron onboardings reales vía API para `collab1/2/3@acme.test`
+ un detalle P3 (N3 candidato a Generativo) para `collab1`.

| Archivo | Pantalla |
|---|---|
| `01-onboarding-welcome.png` | `/onboarding/welcome` — intro + CTA "Empezar" |
| `02-onboarding-item-likert.png` | Ítem likert 1-7 (MLQ Propósito) del onboarding |
| `03-onboarding-item-mc.png` | Ítem multiple-choice (PMM v3 Carrera) del onboarding |
| `04-onboarding-result-radar-preliminary.png` | `/onboarding/result/[id]` — radar de estados + vías (preliminary) |
| `05-home-with-real-states.png` | `/home` — radar real + `PillarStatesGrid` (state + source badge + CTA detalle) |
| `06-pillar-detail-flow.png` | `/onboarding/detail/P2` — evaluación detallada (kind=pillar_detail) |
| `07-confirm-n4-modal.png` | Modal de confirmación N3→N4 Generativo (P3) en `/home` |
| `08-manager-view-states.png` | `/team/[id]` — "Estados por pilar" (manager ve estados/vías, **no** respuestas) |
| `09-mobile-onboarding.png` | Onboarding en mobile (390px) |

**Logins:** `admin@acme.test` (01/02/03 onboarding nuevo + 08 manager),
`collab2@acme.test` (04 result), `collab1@acme.test` (05/06/07),
`admin@globex.test` (09 mobile).

**Datos:** onboardings corridos vía API (dev only). collab1 tiene P3 en N3 con
`requires_user_confirmation` para mostrar el modal (07).
