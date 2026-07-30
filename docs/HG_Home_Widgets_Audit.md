# HG · Home Widgets Audit (Sprint Tarde · TASK 1)

Fecha: 2026-07-29 · Fuente: `apps/frontend/src/app/(app)/home/page.tsx` + `components/widgets/sections/HomeActivitySection.tsx`

> Nota de nombres: la ruta de Inicio en el repo es **`/home`** (no `/inicio`). El
> componente es `HomePage`. El copy del hero ya dice "Hola, {nombre}".

## Widgets que Inicio renderiza hoy (orden actual, de arriba a abajo)

| # | Widget | Componente | Endpoint / fuente | Data | Estado |
|---|--------|-----------|-------------------|------|--------|
| 1 | Hero saludo + subtítulo | inline (`Display`/`Eyebrow`) | `auth-store` (nombre) | **real** | OK. Copy actual: "Acá está tu crecimiento, dimensión por dimensión." |
| 2 | Stats trio (racha / min mes / eventos completados) | inline `Card`×3 | `apiGetHomeDashboard()` → `stats` | **real** | OK |
| 3 | Próximo paso (next_step + progress + CTA) | inline `Card` | `apiGetHomeDashboard()` → `next_step` | **real** | OK. CTA linkea a `/eventos/{slug}` (ver conflicto TASK 5) |
| 4 | "Próximamente: tu recomendación diaria" | `AISoonBadge` | — (placeholder AI) | **placeholder** | Intencional (Sprint UI TASK 11). No captura data. Candidato a esconder/mantener según copy de Andy |
| 5 | Mini radar + "Ver radar completo" | `MiniRadar` | `apiGetMyResults()` / `pillar_completion_rates` | **real** | OK. Link va a `/perfil` |
| 6 | Grid de dimensiones (6) | `PillarStatesGrid` (si hay results) · fallback cards `PILLARS` | `apiGetMyResults()` / `pillar_completion_rates` | **real** | OK. **Este es el widget que TASK 3 reemplaza por `<DimensionCard/>`**. Hoy el "Explorar" linkea a `/eventos` |
| 7 | Tu actividad → Racha (heatmap) | `StreakHeatmap` | `apiGetMeWidgets()` → `streak` | **real** | OK (lazy) |
| 8 | Tu actividad → Tiempo por semana | `WeeklyMinutesBar` | `apiGetMeWidgets()` → `weekly_minutes` | **real** | OK (lazy) |
| 9 | Tu actividad → Progreso por path | `ProgressRingsByPath` | `data.active_enrollments` + `pillar_completion_rates` | **real** | OK (lazy) |
| 10 | Actividad reciente | inline lista | `apiGetHomeDashboard()` → `recent_activity` | **real** | OK. Cada item linkea a `/eventos/{slug}` |

## Conclusión para TASK 3

- **No hay widgets 100% mock en Inicio.** La única pieza sin data real es `AISoonBadge`
  (placeholder AI deliberado). La regla "esconder widgets 100% mock" prácticamente no
  aplica: sólo hay que decidir si se mantiene el placeholder AI (recomiendo mantenerlo,
  es intencional del Sprint UI anterior).
- El widget #6 (grid de dimensiones) es el que se reescribe con `<DimensionCard/>`
  compartido (TASK 3 ↔ TASK 4). Hoy usa `PILLARS` (P1–P6) + `PillarStatesGrid`.
- Los demás componentes de `components/widgets/*` (`AdoptionCurve`, `InactivityFunnel`,
  `MonthlyWatchBar`, `OnboardingFunnelChart`, `TeamActivityHeatmap`) **no** se usan en
  Inicio — son de las secciones de Org/Team admin. No entran en este sprint.

## Reordenamiento propuesto (TASK 3)

1. Hero (copy nuevo de Andy)
2. **Cards de dimensión** (`<DimensionCard/>`, grid completo 6) ← sube desde #6
3. Continuar donde dejaste (= "Próximo paso" #3)
4. Stats trio (#2)
5. Tu actividad (#7–9, lazy) + Actividad reciente (#10)
6. (opcional) placeholder AI

> Todo lo de Inicio consume data real hoy; el reorden es visual, no cambia fuentes.
