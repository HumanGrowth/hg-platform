# ADR-0018 · Sistema de notificaciones

- **Estado:** propuesto
- **Fecha:** 2026-11-19
- **Autores:** Andrés (decisiones), Claude (redacción)

## Contexto

Hechos verificados en el código (rama `main`, 2026-11-19):

- Hoy las notificaciones son **solo correo** (Resend). No hay canal dentro de la app, ni push, ni WhatsApp.
- `EmailService` (`modules/notifications/email_service.py`) envía con reintentos, nunca levanta excepción y se
  apaga con el flag `emails_enabled`.
- Los recordatorios de engagement (`notifications/tasks.py`, Celery beat 09:00 hora de Costa Rica) cubren
  inactividad a 7 y 21 días, vencimiento de asignaciones (3 días antes y el mismo día) y "ya tenés módulos
  asignados" (cada 15 min). El registro y la deduplicación viven en `engagement_reminders`.
- **No existe ninguna preferencia del usuario**: nadie puede apagar un aviso. Tampoco hay tope de frecuencia
  entre tipos de aviso: una misma persona podía recibir inactividad y vencimiento el mismo día.
- Los recordatorios filtran solo por `users.is_active`. **No miran `companies.status`**: una empresa en gracia,
  suspendida o terminada (ADR-0016) seguiría recibiendo "Seguí aprendiendo" aunque el contenido esté bloqueado.
- El Resumen Ejecutivo (4.5) promete al líder alertas de inactividad y avisos por pilar completado. Hoy no existe
  nada de eso hacia el líder.
- `consent_change_log` (append-only) y `user_privacy_consent` ya modelan consentimiento granular
  (`None` pendiente / `True` / `False`) para la visibilidad hacia jefe y RRHH.
- `CLAUDE.md` raíz: cuota de Resend no confirmada, no asumir que el envío transaccional escala.

## Decisión

Decisiones de Andrés (2026-11-19):

1. **Canales: solo correo por ahora.** Push y WhatsApp quedan descartados. Un centro de notificaciones dentro
   de la app es la siguiente fase (ver plan), no parte de este ADR.
2. **Tope: 1 aviso de aprendizaje por persona cada 7 días**, contando todos los tipos.
3. **El líder recibe solo un resumen semanal**, nunca avisos por evento.
4. **El consentimiento y las preferencias de notificación viven en el Perfil** de la persona.

Decisiones de diseño derivadas:

5. **Categorías.** (a) *Transaccional*: invitación, contraseña, soporte, licencias. Se envía siempre, no pasa por la
   compuerta ni se puede apagar. (b) *Aprendizaje*: inactividad, vencimientos, módulos asignados. Apagable, con el
   tope semanal. (c) *Resumen del líder*: apagable, una vez por semana. Comunidad/eventos: no se implementa aún.
6. **Una sola compuerta** (`notifications/service.py::NotificationGate`) decide si un aviso de las categorías (b)
   y (c) sale. Orden de las reglas: estado de la empresa → preferencia de la persona → tope semanal. Devuelve el
   motivo de omisión para loguearlo. Nada de las categorías (b) y (c) se envía sin pasar por ella.
7. **Estado de la empresa.** Solo `trial` y `active` reciben avisos de aprendizaje y resumen. En `grace`,
   `suspended` y `terminated` no sale ninguno (el contenido no está disponible). Fallo cerrado: si no se puede
   resolver el estado, no se envía.
8. **Preferencias** en la tabla `notification_preferences` (una fila por persona, con RLS):
   `learning_reminders` y `leader_digest`, ambos `bool | None` con la misma semántica que el consentimiento
   existente (`None` = nunca decidió). **Hoy `None` se trata como permitido**: la plataforma es el canal de
   desarrollo que contrató su empresa, y la persona puede apagar los avisos desde el Perfil. Esa decisión vive en
   dos funciones (`_allows_learning`, `_allows_digest`); pasar a opt-in explícito es cambiarlas. **Pendiente de
   criterio legal** (Ley 8968), junto con el texto del consentimiento.
9. **Auditoría.** Cada cambio de preferencia se registra en `consent_change_log` (append-only) con los scopes
   `notif_learning` y `notif_digest`.
10. **Resumen del líder** (`notifications.send_leader_weekly_digest`, lunes 08:00 hora de Costa Rica): solo
    **totales** del equipo directo (cuántas personas tuvieron actividad en 7 días y cuántas llevan más de 21 días
    sin actividad), sin nombres, sin estados del assessment y sin datos de P4/P5. Mínimo 3 reportes directos para
    enviarlo (con menos, el total identificaría a una persona); el valor es una constante, pendiente de que Andrés
    lo confirme. El detalle por persona sigue en el dashboard, con sus reglas de consentimiento.
11. **Registro.** Se reutiliza `engagement_reminders` como registro de envíos de las categorías (b) y (c) (se
    agrega el `kind` `leader_weekly_digest`). Renombrarla a `notification_log` es deuda anotada, no urgente.
12. **Contenido.** Ningún asunto ni cuerpo puede mencionar datos sensibles (resultados del assessment, estados
    de P4 Salud o P5 Paz interior). El tono es el de la marca (voseo, sin culpa).
13. **Gracia y rutas.** `GET /me/notification-preferences` se permite en gracia (lectura de perfil, igual que
    `/me/consent`); `PUT` se deniega (escritura), conforme a ADR-0016.

## Alternativas consideradas

- **Push web y WhatsApp ahora.** Más alcance (WhatsApp es el canal dominante del ICP), pero costo por mensaje,
  plantillas aprobadas por Meta y consentimiento explícito. Sin preferencias, topes ni medición, más canales solo
  multiplican la probabilidad de que la persona apague todo. Descartadas por decisión de Andrés; se reevalúan con
  datos del piloto.
- **Un correo semanal consolidado para el colaborador** en vez de avisos por evento. Mejor experiencia en teoría,
  pero un aviso de "vence hoy" pierde sentido si llega el lunes. Se mantiene el modelo por evento con tope.
- **Avisos al líder por evento (pilar completado, inactividad de una persona).** Descartado: es vigilancia
  individual disfrazada de notificación y choca con el consentimiento por persona. Si se retoma, necesita su
  propio ADR.
- **Tabla de log nueva y genérica ya.** Más limpia, pero implica migrar datos y tocar dedupe existente para
  ningún beneficio inmediato. Diferida.

## Consecuencias

- Positivas: una sola regla verificable de "quién puede recibir qué"; el usuario tiene control; se corrige el
  envío a empresas que ya no tienen acceso; el líder recibe valor sin vigilancia individual.
- Negativas / riesgos:
  - El tope uniforme puede suprimir un "vence hoy" si ese mismo usuario recibió otro aviso en los 7 días
    previos. Mitigación disponible sin migración: `CAP_EXEMPT_KINDS` en `service.py` (vacío hoy). **Decisión de
    producto pendiente.**
  - `None = permitido` es una decisión provisional hasta el criterio legal.
  - La compuerta carga datos por lotes en memoria (preferencias, estado, últimos envíos) para todos los usuarios de
    una corrida. Bien para miles de usuarios; a escala país hay que paginar el recorrido y enviar por cola
    (un mensaje por tarea), lo que ya está previsto en el plan.
  - Sin seguimiento de entrega todavía (rebotes y quejas de Resend): Fase siguiente.
  - Las plantillas existentes de aprendizaje aún no muestran el enlace "Gestioná tus avisos"; el contexto ya envía
    `prefs_url`. Solo falta editar la plantilla (`engagement_reminder.html`).
- Seguimiento: pantalla de preferencias y consentimiento en Perfil (diseño en Claude Design); centro de
  notificaciones en la app; webhooks de Resend; renombrar `engagement_reminders`; contenido personalizado por
  pilar y ruta.

## Nota de numeración

ADR-0016 reserva el **ADR-0017** para retención y anonimización. Este es el 0018 para no pisarlo.
