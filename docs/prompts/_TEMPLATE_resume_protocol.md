# Bloque a copiar al INICIO de cada prompt de Claude Code

> Usar este bloque al tope de cualquier prompt nuevo. Hace que la sesión
> sobreviva `/compact` (compactación de contexto) sin perder estado.

---

## ⚙️ Resume protocol — leer ANTES de tocar código

Tu trabajo en este repo SIEMPRE debe ser recuperable tras una compactación
de contexto. Antes de empezar y después de cada `/compact`:

1. **Releé este prompt entero** (vivís en `docs/prompts/<archivo>.md`).
2. Verificá el estado real del repo:
   ```bash
   git status
   git log --oneline -10
   make test-backend 2>&1 | tail -20    # si aplica
   docker compose exec backend uv run alembic current
   ```
3. Releé el bloque "## 📌 Estado al iniciar" abajo — refleja el commit base.
4. Buscá las TASKs marcadas `🟧 IN PROGRESS` y reanudá desde el último
   criterio sin tildar.

## 🧱 Reglas duras de la sesión

- **Un commit por TASK.** Nunca mezcles TASKs en un commit.
- **Conventional Commits con prefijo Kanban:** `feat(B1-XX): ...`,
  `fix(B2-YY): ...`, `chore(...)`, `docs(...)`.
- **Sub-commits intermedios obligatorios** si una TASK supera ~25 min de
  trabajo o ~10 archivos tocados:
  `wip(B1-XX): partial — <qué se hizo>` — esto es tu checkpoint.
- **Editá ESTE archivo al avanzar.** Marcá `[ ]` → `[x]` en cada criterio
  de aceptación cumplido. Marcá la TASK como `🟧 IN PROGRESS` cuando empezás
  y `✅ DONE` cuando terminás. Commiteá ese cambio junto con el código.
- **No avances a la siguiente TASK** si la actual no está `✅ DONE` con todos
  los criterios tildados, tests pasando y commit hecho.
- **Si te bloqueás**, agregá una nota debajo de la TASK con el bloqueo y
  pasá a la siguiente. NO inventés decisiones de producto — preguntá al
  user en el reporte final.

## 🛟 Comportamiento ante compact

Si recibís `/compact` mid-sesión:
1. Antes de avanzar, releé este archivo COMPLETO.
2. Corré los 3 comandos del paso 2 del Resume protocol.
3. Identificá la TASK marcada `🟧 IN PROGRESS` y su último `[x]`.
4. Continuá desde ahí. NO empieces TASKs desde cero.

## 📌 Estado al iniciar (actualizar antes de cada run nuevo)

- Último commit firme: `<SHA — describí>`
- Tablas DB activas: `<lista>`
- Migraciones aplicadas: `<lista>`
- Tests pasando: `<X/Y>`
- TASKs completas en este prompt: `<lista IDs>`
- Decisión de producto pendiente: `<si aplica>`

---
