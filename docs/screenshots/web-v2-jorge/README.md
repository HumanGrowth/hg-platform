# web-v2 · Jorge feedback · screenshots

Capturados con Chrome headless (`--screenshot`) contra `localhost:3000`, DS v2.

| Archivo | Cubre |
|---|---|
| `01-home-hero-nuevo.png` | Hero nuevo (H1 2 líneas, 2 párrafos, "Ver dimensiones") + **nav desktop 5 tabs** + toggle ES·EN. Sirve como `11-nav-desktop-5-tabs`. |
| `02-home-full.png` | Home completo (1440×4000): SixPillars watermark cards · MarketingRadar · WhatIsHg (3 cards) · Timeline 4 pasos · Quote Deloitte · Footer. Cubre `02..07`. |
| `08-metodo-sin-pmm-radar.png` | /metodo sin "PMM" + radar ilustrativo. |
| `09-pricing-copy-simplificado.png` | /pricing con eyebrow "PRECIOS". |
| `10-perspectivas-page.png` | /perspectivas (hero + filtro por pilar + grid). |
| `12-plataforma-placeholder.png` | Placeholder "Próximamente" (/plataforma, igual que /blog). |
| `13-nav-mobile-hamburger-closed.png` | Nav mobile con hamburger (drawer cerrado). |

## Pendiente de captura manual
- **`12-nav-mobile-drawer-open`**: el drawer se abre por interacción (click en
  hamburger, `useState`), que el modo `--screenshot` estático de Chrome no puede
  disparar. Requiere captura manual o Playwright (no instalado — regla de no
  agregar dependencias). El drawer está verificado funcionalmente (tests + build).
