# web-v3 · Jorge feedback addendum · screenshots

Chrome headless contra `localhost:3000`.

| Archivo | Cubre (nº pedido) |
|---|---|
| `01-home-hero-corto-watermark.png` | 01 · hero H1 corto + watermark Hï + **07 nav 4 tabs** (Plataforma·Método·Perspectivas·Precios, sin Blog) + toggle ES·EN |
| `02-home-full-productstack-cta.png` | 02 ProductStack (placeholders) · 03 HomeCTAFinal · 09 radar 2 mallas en home · timeline pasos 3-4 nuevos |
| `04-metodo-hero-corto.png` | 04 · hero "La ciencia nos respalda." |
| `05-metodo-pilares-radar-back-to-back.png` | 05 radar back-to-back · **10 pillar icons fixed** (P5 Paz interior=bulb, P6 Estabilidad=scales, cards con tags) · pilares user-friendly sin referencias |
| `06-plataforma-features.png` | 06 · /plataforma con 6 feature cards reales |
| `07-nav-4-tabs.png` | 07 · nav desktop recortado |
| `08-perspectivas-filter-empty.png` | 08 · /perspectivas con chips por content type + empty state |
| `09-radar-2-mallas-home.png` | 09 · radar con malla verde (crecimiento) + estado actual + leyenda + badges en ejes |

## Pendiente de captura manual
- Drawer mobile abierto (requiere interacción; verificado por test).
- Badges P5/P6 dentro de la app autenticada (/perfil) — requiere login + backend;
  el fix es visible en las cards de /metodo y cubierto por pillars.test.ts.

## TODOs documentados en código
1. Copy pilares /metodo → `src/lib/locales/es.ts` (TODO(Andrés) inline).
2. Screenshots app → `public/marketing/screens/` + flag `HAS_SCREENS` en ProductStack.tsx.
3. Contenido real de Perspectivas → post CMS (prompt `claude-code_perspectivas_cms.md`).
