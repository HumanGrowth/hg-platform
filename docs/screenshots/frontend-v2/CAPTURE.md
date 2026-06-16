# Frontend v2 — capture checklist

> ⚠️ **Pendiente de captura.** Las imágenes no se generaron en el entorno de
> desarrollo del agente (sin Docker/Postgres locales para el backend, y las
> pantallas autenticadas requieren sesión). Capturar manualmente tras el deploy
> o levantando el stack (`make up`) + login.

## Cómo capturar

```bash
# Público (no requiere backend):
cd apps/frontend && pnpm build && pnpm start   # http://localhost:3000
# App/onboarding: requiere backend arriba + login (superadmin@humangrowth.app).
```

## Lista (guardar en este directorio)

| Archivo | Pantalla | Notas |
|---|---|---|
| `01-landing-hero.png` | `/` | Hero + Nav nuevos |
| `02-landing-features.png` | `/` | sección Features (6 dimensiones) |
| `03-paths-grid.png` | `/paths` | grid 12 rutas + filtros pilar/nivel |
| `04-pricing.png` | `/pricing` | PricingTable + FAQ |
| `05-contacto-form.png` | `/contacto` | form validado |
| `06-home-with-mini-radar.png` | `/home` | card MiniRadar |
| `07-radar-complete.png` | `/radar` | radar large + lista pilares |
| `08-onboarding-welcome.png` | `/onboarding/welcome` | |
| `09-onboarding-scenario.png` | `/onboarding/scenario/1` | progreso + opciones |
| `10-onboarding-result-radar-filling.png` | `/onboarding/result` | radar llenándose |
| `11-mobile-bottom-nav.png` | `/home` (viewport <768px) | BottomNav 4 ítems |

## E2E manual (incognito)

1. `/` → landing público con Hero nuevo.
2. Navegar `/paths`, `/for-teams`, `/pricing`, `/contacto`.
3. Submit `/contacto` → fila en `contact_inquiries` (tras deploy).
4. "Conversemos" → `/login`.
5. Login superadmin → `/home` (SideNav + TopBar; resize → BottomNav).
6. Toggle admin → `/admin/orgs` → "Volver a colaborador" → `/home`.
7. `/radar` y `/onboarding/welcome` (forzar URL).
