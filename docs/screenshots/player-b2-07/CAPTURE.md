# Player B2-07 — screenshots

Capturadas con Playwright + Chromium contra el stack local (frontend `next dev`
:3000 + backend host :8000 + DB seedeada), login `collab1@acme.test`, curso
`l1-c1-l1-p1-001` (HLS real desde `cdn.humangrowth.io`).

| Archivo | Pantalla |
|---|---|
| `01-course-detail-fresh.png` | Detalle del curso, player en pausa con poster |
| `02-course-detail-playing.png` | Reproduciendo (frame HLS real) |
| `03-resume-dialog.png` | Diálogo "¿Dónde querés seguir?" (progreso a 0:40) |
| `04-course-completed-toast.png` | Al cruzar 80%: toast "¡Lo terminaste!" + ✓ Completado |
| `05-mobile-player.png` | Vista mobile (390px) con controles compactos |

Regenerar: levantar el stack (backend con código B2-07 + frontend dev), limpiar
`course_progress` del usuario de prueba, y correr el script de captura.
