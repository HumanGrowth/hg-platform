# ADR-0014 · Dashboard RRHH personalizable por administrador

- **Estado:** aceptado
- **Fecha:** 2026-11-03
- **Autores:** @andy

## Contexto

El dashboard RRHH (`/admin/org`) crece con cada release y no todos los administradores necesitan los
mismos widgets ni en el mismo orden. Se pidió poder reordenarlos (drag & drop) y mostrar u ocultar cada
uno, de forma **personal por administrador**.

## Decisión

- **Dónde se guarda:** columna `users.dashboard_prefs JSONB NOT NULL DEFAULT '{}'` (migración
  `RH-02`), con forma `{"org": {"order": [ids], "hidden": [ids]}}`. Es dato del propio usuario, así
  que la RLS existente de `users` ya lo aísla; no hay tabla ni grants nuevos. Una tabla aparte se
  descartó: es un blob chico, siempre se lee y escribe completo y por usuario.
- **API:** `GET | PUT | DELETE /api/v1/auth/me/dashboard-prefs/{dashboard}` (`dashboard` ∈ `org`,
  ampliable). El backend solo valida forma (ids `[a-z0-9_]`, máx. 60, sin duplicados) y guarda; los ids
  los define el frontend. Un id desconocido se ignora al renderizar y un widget nuevo aparece al final,
  visible, hasta que el administrador decida.
- **Frontend:** `DashboardGrid` genérico + registro de widgets (`OrgDashboard`). Drag & drop con la API
  nativa de HTML5 (sin librería nueva), flechas subir/bajar como alternativa de teclado y táctil, e
  interruptor por widget. Cada cambio se guarda al instante y se revierte con aviso si falla.
- **Se retira "Módulos estancados"** (widget, endpoint field y query): no aportó valor de seguimiento.
- **Tonos de estado por tema:** tokens `--tone-*` en `globals.css` con valores propios en claro y
  oscuro (los pasteles de la paleta no funcionan sobre fondo oscuro; el chip activo tenía contraste
  1,1:1). Texto ≥ 4,5:1 y barras ≥ 3:1 verificados con la fórmula WCAG.

## Consecuencias

- Al agregar un widget basta con sumarlo al registro; los ids ya guardados no se renombran.
- Reordenar con drag & drop no funciona en pantallas táctiles (límite de la API nativa); ahí se usan las
  flechas.
- Mover widgets de distinto ancho en la grilla de 12 columnas puede dejar huecos; es aceptable porque
  la configuración es del propio administrador.
