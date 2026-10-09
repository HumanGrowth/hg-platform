"""PF-03 Contenido validado: comportamientos y tips por pilar + skill primario

Reemplaza los placeholders de PF-02 y el borrador de CE-10 con el texto validado
(``HG/Docs/HG_Tips_Coaching_por_Pilar_BORRADOR.md``, ya aprobado por contenido):

- ``pillar_coaching_tips.collaborator_text`` (nuevo): versión del tip para el
  colaborador (micro-acción). ``text`` sigue siendo la versión del manager.
- ``pillar_coaching_tips``: se borran los ``[Placeholder]`` de CP y se cargan los
  tips validados de P1..P5 + AI (8 por pilar).
- ``pillar_behaviors``: los comportamientos del borrador CE-10 se actualizan EN
  SITIO por (pilar, orden) —``behavior_evaluations`` cuelga de su id con
  ON DELETE CASCADE, borrar/reinsertar perdería las calificaciones—, solo si el
  texto sigue siendo el del borrador (ediciones manuales de superadmin se
  respetan). Los comportamientos adicionales se insertan; AI es nuevo.
- ``learning_units.keywords``: el skill primario de la currícula
  (``T1_unidades_v3.csv``) alimenta el filtro por Skill del catálogo de módulos.
  Se empareja por título normalizado dentro de la dimensión CP; las units sin
  match no se tocan.

Idempotente. El downgrade solo quita la columna nueva: el contenido cargado no se
revierte (los placeholders no son contenido válido).

Revision ID: pf03pillarcontent1
Revises: e7f8a9b0c1d2
Create Date: 2026-10-09 00:00:00.000000
"""
from __future__ import annotations

import logging
import re
import unicodedata
import uuid
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "pf03pillarcontent1"
down_revision: str | None = "e7f8a9b0c1d2"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

log = logging.getLogger("alembic.runtime.migration")

_DIM = "CP"

# Texto del borrador CE-10 por (pilar, orden): solo se pisa si sigue igual.
_OLD_DRAFT = {
    "P1": [
        "Busca activamente feedback sobre su desempeño y lo aplica en su siguiente entrega.",
        "Identifica sus brechas de habilidades y arma un plan concreto para cerrarlas.",
        "Prueba nuevas herramientas o métodos de trabajo sin esperar a que se los indiquen.",
    ],
    "P2": [
        "Cumple sus compromisos y plazos de forma consistente.",
        "Colabora proactivamente con otros equipos/áreas para destrabar el trabajo en común.",
        "Documenta y comparte su conocimiento para que el equipo no dependa de una sola persona.",
    ],
    "P3": [
        "Aporta una mirada estratégica al analizar un problema, no solo la solución inmediata.",
        "Se mantiene actualizado en su especialidad y lo demuestra en su trabajo diario.",
        "Anticipa riesgos o consecuencias de una decisión antes de que ocurran.",
    ],
    "P4": [
        "Comunica sus ideas de forma clara y adaptada a la audiencia (técnica o no técnica).",
        "Influye y genera acuerdo en el equipo sin necesidad de imponer su posición.",
        "Da feedback constructivo a pares de forma oportuna y respetuosa.",
    ],
    "P5": [
        "Regula sus reacciones emocionales incluso bajo presión o desacuerdo.",
        "Muestra empatía genuina ante las dificultades de sus compañeros.",
        "Construye relaciones de confianza dentro y fuera de su equipo directo.",
    ],
}

# Comportamientos validados por pilar (orden = order_index).
_BEHAVIORS: dict[str, list[str]] = {'P1': ['Convierte un error o resultado inesperado en una acción escrita («cuando pase X, hago Y») '
        'antes de seguir con la siguiente tarea.',
        'Recibe feedback correctivo sin reaccionar de inmediato: separa lo que le dijeron de lo '
        'que sintió que le dijeron, y decide si actúa, lo deja pendiente o no actúa —con el motivo '
        'escrito—.',
        'Busca información que nadie le va a dar: pregunta el «por qué» de lo que ejecuta, escanea '
        'cambios de su entorno y pide feedback específico a más de una fuente.',
        'Ante un cambio de método o proceso, entiende el razonamiento, lo aplica sin bajar sus '
        'estándares y puede explicárselo a un colega.'],
 'P2': ['Prioriza con intención: define sus «3 de Hoy», protege la tarea importante no urgente con '
        'un bloque en el calendario y, cuando entra algo nuevo, nombra qué se mueve.',
        'Se hace cargo de la calidad y de los riesgos antes de que otros los vean: revisa sus '
        'entregas con estándar propio, alerta riesgos con probabilidad y propuesta, y pregunta uso '
        'final y decisión que activa antes de ejecutar un pedido grande.',
        'Gestiona sus compromisos: se compromete a una fecha sostenible, avisa temprano de los '
        'obstáculos, confirma al entregar y verifica las dependencias antes de comprometer fechas '
        'que dependen de otros.',
        'Lleva el trabajo conjunto hacia decisiones: pregunta «¿qué estamos decidiendo?», cierra '
        'las reuniones con acción, responsable y fecha, y coordina con otras áreas con pedidos que '
        'ofrecen valor mutuo.'],
 'P3': ['Entrega con estándar verificable: se hace las preguntas del estándar antes de enviar, '
        'ajusta si la respuesta es «no sé» y lleva su propia lista de correcciones más repetidas.',
        'Valida la fuente y el sesgo antes de concluir: puede decir de dónde salió el dato que más '
        'pesa en su conclusión.',
        'Convierte datos en decisión: cada número lleva una comparación y los reportes dicen qué '
        'significa para el negocio y qué acción recomienda.',
        'Estructura los problemas y propone: describe el problema en partes antes de arreglarlo o '
        'pedir ayuda, busca una segunda opción y, cuando escala, lo hace con opciones evaluadas y '
        'una recomendación.',
        'Aprende de quien ya sabe: identifica los puntos ciegos de su dominio y busca a quien ya '
        'lo resolvió antes de buscar en internet.'],
 'P4': ['Se asegura de ser entendido: cierra el loop de pedidos y compromisos, escribe mensajes '
        'con contexto, pedido y por qué ahora, y adapta el registro a su interlocutor (incluida '
        'otra cultura).',
        'Escucha antes de opinar: parafrasea lo entendido, distingue desahogo de pedido y detecta '
        'las palabras que frenan un acuerdo.',
        'Se hace visible y participa: interviene en reuniones donde antes callaba, publica su '
        'estado y bloqueos en el canal compartido y mantiene informados a stakeholders más allá de '
        'su manager.',
        'Influye y negocia sin imponer: responde con lo que sí puede, renegocia plazos o alcance '
        'con acuerdo explícito y pide a otros equipos con valor mutuo.',
        'Persuade con claridad: sus presentaciones terminan en una acción acordada, usa casos '
        'concretos y traduce lo técnico al lenguaje de quien decide.'],
 'P5': ['Regula su reacción bajo presión: hace una pausa antes de responder, no envía mensajes '
        'escritos molesto sin releerlos y sostiene un desacuerdo con datos, sin atacar.',
        'Se recupera de los tropiezos: describe lo que pasó sin adjetivos, separa el hecho de '
        'quién es, define una acción de 24 horas y vigila su carga para ajustar antes de agotarse.',
        'Lee y atiende a las personas: detecta señales de fricción o presión, traduce esa lectura '
        'en una acción concreta y elige el momento adecuado para pedir o proponer.',
        'Contrasta sus supuestos sobre otros: hace el chequeo con colegas distintos a él y nombra '
        'los supuestos que resultaron falsos.',
        'Crea seguridad psicológica: es el primero en decir «no entendí», nombra sus errores y '
        'reconoce con precisión lo que otros hacen bien.'],
 'AI': ['Verifica antes de usar: escribe cómo va a comprobar el resultado de la IA, nombra la '
        'fuente externa contra la que lo comprobó y marca qué quedó sin comprobar.',
        'Pide con precisión: parte del entregable (qué, cuántos, para quién, de qué extensión), '
        'agrega restricciones y describe en qué cambió el resultado.',
        'Decide con criterio qué tareas van a la IA: distingue las que requieren revisión de '
        'alguien con más contexto y puede nombrar las tareas donde la usa de forma sistemática y '
        'por qué.',
        'Protege la información y declara el uso: quita identificadores antes de pegar datos, sabe '
        'a quién consultar, usa el canal correcto y declara el uso de IA cuando corresponde.',
        'Se hace responsable del impacto en personas: revisa antes de aplicar un resultado que '
        'toca a alguien y, ante un error propio o una práctica dudosa, actúa antes de que otro lo '
        'descubra.']}

# Tips validados por pilar: (texto manager, texto colaborador). Orden = order_index.
_TIPS: dict[str, list[tuple[str, str]]] = {'P1': [('Pídele ver su último Debrief o Post-Mortem. Lo que importa no es el error sino la acción '
         'escrita que dejó («cuando pase X, hago Y»). Si no existe, háganlo juntos después del '
         'próximo error, antes de pasar a la siguiente tarea.',
         'Después de tu próximo error, y antes de seguir con la siguiente tarea, responde por '
         'escrito las tres preguntas del Debrief y deja una acción con la forma «cuando pase X, '
         'hago Y».'),
        ('Cuando le des feedback correctivo, observa su primera reacción. Si responde de inmediato '
         'o se defiende, ayúdalo a separar «lo que dije» de «lo que sintió que dije» y pídele que '
         'lo escriba antes de contestar.',
         'Ante el próximo comentario correctivo, haz una pausa antes de responder y escribe dos '
         'líneas: «Lo que me dijeron: …» y «Lo que sentí que me dijeron: …».'),
        ('Pregúntale cómo decide qué feedback atender: ¿quién lo da, qué trae, cuándo llegó? Si '
         'descarta algo, debe poder decir por qué. Descartar con motivo es un filtro; descartar '
         'sin motivo es un escudo.',
         'Ante tus próximos tres comentarios sobre tu trabajo, anota quién lo da, qué trae y '
         'cuándo llegó, y decide: ahora, pendiente o no actuar (con el motivo escrito).'),
        ('Pídele una pregunta de fondo por semana —«¿por qué es así?»— sobre un paso que ejecuta '
         'sin entender del todo, y que traiga la respuesta anotada a tu 1:1.',
         'Elige un paso de tu trabajo que ejecutas sin entender del todo y pregúntale a quien sabe '
         'por qué es así. Anota la respuesta en una línea.'),
        ('En tu 1:1 pregunta qué cambió en su entorno esta semana (anuncios, procesos, '
         'herramientas) y cuál le afecta. Si no vio nada, probablemente no está escaneando.',
         'Antes de tu próxima tarea recurrente, haz el Escaneo de 2 minutos y registra qué '
         'encontraste: un anuncio relevante, uno irrelevante o ninguno.'),
        ('Ante un cambio de proceso no pidas solo que lo aplique: pídele que explique qué problema '
         'resuelve, dónde no aplica y cómo sabrán en 30 días si funciona. Quien lo entiende puede '
         'explicárselo a otro.',
         'Ante el próximo cambio de proceso, pregunta a tu manager qué problema resuelve, cuándo '
         'consultar antes de aplicarlo y cómo sabrán que funciona. Anota los tres puntos.'),
        ('Si ya domina su tarea, pregúntale qué práctica hace en piloto automático y qué condición '
         'podría subirle para exigirse más. Pídele que solicite observación sobre ese punto.',
         'Elige dos tareas que ya te salen solas, sube una condición a cada una y pide una '
         'observación sobre ese punto. Anota una cosa que haces distinto después.'),
        ('Cuando transfiera una tarea a alguien, pacten fechas de revisión desde el primer día. En '
         'cada una responde con preguntas o pistas, sin rehacer el trabajo, y pregunta qué decidió '
         'la persona sola.',
         'Al transferir una tarea, deja pactadas ese mismo día dos o tres fechas de revisión y en '
         'cada una pregunta primero qué decidió la persona y por qué.')],
 'P2': [('Empieza el 1:1 pidiendo ver sus «3 de Hoy» (o las de la semana). Observa si la primera '
         'es la de mayor riesgo de no hacerse, no la más cómoda.',
         'Cada mañana, antes de abrir el correo, escribe tus 3 de Hoy y empieza por la que tiene '
         'más riesgo de no hacerse.'),
        ('Pregúntale qué tarea importante-no-urgente protegió esta semana y en qué hora de su '
         'calendario está. Si no hay bloque, ayúdale a ponerlo antes de la primera reunión del '
         'día.',
         'El lunes, antes de abrir el correo, elige la tarea importante de la semana y ponle un '
         'bloque con día y hora en el calendario: no «cuando pueda».'),
        ('Al encargarle algo de más de 2 horas, espera que haga tres preguntas antes de abrir el '
         'archivo: uso final, decisión que activa y contexto crítico. Si hubo retrabajo, revisen '
         'cuál de las tres no se hizo.',
         'Antes de abrir el archivo de un pedido de más de dos horas, responde en 90 segundos: ¿a '
         'dónde va?, ¿qué decisión activa?, ¿qué contexto me falta?'),
        ('Reconoce cuando alerte un riesgo, aunque la propuesta sea imperfecta. El formato '
         'esperado es riesgo + probabilidad + propuesta; si solo trae el problema, devuélvelo con '
         '«¿y qué propones?».',
         'La próxima vez que veas algo que no cuadra, di el riesgo, la probabilidad y una '
         'propuesta, aunque sea imperfecta.'),
        ('Pregúntale por su compromiso más próximo: ¿qué fecha puede sostener aunque algo se '
         'complique? Verifica que avisó a tiempo de los obstáculos; si te enteras tú por un '
         'tercero, trabajen el aviso temprano.',
         'Elige un compromiso con fecha. Compromete la fecha que puedes sostener aunque se '
         'complique, avisa temprano si aparece un obstáculo y confirma cuando entregues.'),
        ('Pídele que cuente qué cambió o qué notó al hacerse la «Firma Invisible» antes de enviar '
         'tres entregas. Pregunta qué ajuste hizo por lo que escuchó después de entregar.',
         'Antes de enviar, revisa tu entrega como si llevara tu firma. Anota qué cambiaste o qué '
         'notaste, y agenda una pregunta de seguimiento a quien la recibió.'),
        ('Revisa si cierra sus reuniones con acción, responsable y fecha, y cuántos de esos '
         'compromisos se cumplieron en fecha. Pídele el dato, no la impresión. En conversaciones '
         'que dan vueltas, que pregunte «¿qué estamos decidiendo?».',
         'En la próxima reunión con cosas por hacer, espera el cierre, lista en voz alta lo que se '
         'acordó con acción, persona y fecha, y pide confirmación. Después mira cuántos se '
         'cumplieron.'),
        ('Cuando le asignes una prioridad nueva, espera que diga qué se mueve y a quién avisa. '
         'Antes de que convoque una reunión, pídele que justifique si hace falta y a quién '
         'invitar.',
         'Ante cada prioridad nueva, nombra qué se mueve, confírmalo con quien lo pidió y avisa '
         'ese mismo día a quien esperaba lo movido.')],
 'P3': [('Antes de que envíe un entregable pregúntale «¿está bien hecho?» y «¿qué te falta '
         'saber?». Si responde «no sé», pídele un ajuste antes de enviar. Revisa también su lista '
         'de las 3 correcciones más repetidas y si bajaron las devoluciones.',
         'Antes de cada entrega, aplica las 2 preguntas del estándar. Si alguna respuesta es «no» '
         'o «no sé», ajusta algo antes de enviar. Junta tus 3 correcciones más repetidas y '
         'búscalas por nombre antes de entregar.'),
        ('Señala el dato que más pesa en su conclusión y pregúntale «¿quién lo dice?». Debe poder '
         'escribir en una línea de dónde salió; si no puede, el dato todavía no está listo.',
         'Antes de cerrar un entregable, elige el dato que más pesa en la conclusión y escribe en '
         'una línea de dónde salió. Si no puedes escribirla, el dato no está listo.'),
        ('Pídele que cada número de un reporte venga con una comparación («¿comparado con qué?») y '
         'que cierre con qué significa para el negocio y qué acción recomienda. Mide si tuviste '
         'que pedirle más contexto.',
         'En tus próximos tres reportes, acompaña cada número con una comparación y cierra con qué '
         'significa para el negocio y qué recomiendas hacer.'),
        ('Cuando te traiga un problema, no lo resuelvas por él: pídele que lo describa en tres '
         'partes antes de probar arreglos o pedir ayuda. Después compara con la última '
         'conversación que no tuvo método.',
         'Ante un problema, escribe sus tres partes antes de probar arreglos o de pedir ayuda.'),
        ('Cuando traiga una solución, pregunta «¿cuál es la segunda forma?» o «¿y si esa '
         'restricción no existiera?». Espera al menos una opción nueva junto a las conocidas, con '
         'lo que cuesta cada una.',
         'En tres tareas, escribe la primera forma de resolverlo y una segunda antes de empezar. '
         'Elige con un criterio y anota cuál ganó.'),
        ('Cuando escale, exige opciones evaluadas y una recomendación. Un «tengo un problema» sin '
         'eso se devuelve con «inténtalo con lo que hay y vuelve con opciones».',
         'Ante el próximo problema, intenta resolverlo con lo que hay antes de moverlo. Si debes '
         'subirlo, súbelo con opciones evaluadas y una recomendación.'),
        ('Pregúntale qué área de su dominio todavía no entiende bien y qué paso dio esta semana '
         'para reducirla. Pregunta a quién consultó antes de buscar en internet.',
         'Hazte las 3 preguntas del Radar de Dominio y elige un hueco concreto para reducir. Antes '
         'de buscar en internet, identifica quién ya lo resolvió y pídele diez minutos.'),
        ('Con perfiles senior, pídeles que conviertan una decisión «porque sé que funciona» en una '
         'regla escrita para el equipo, y que nombren la decisión de negocio antes de arrancar un '
         'análisis.',
         'Antes de abrir un pedido de análisis, escribe en una línea qué decisión se va a tomar '
         'con el resultado y confírmalo con quien lo pidió. Convierte una decisión tácita en una '
         'regla que el equipo pueda aplicar.')],
 'P4': [('Al dar un encargo, pídele que lo repita en sus palabras y confirma si coincide. '
         'Pregúntale en cuántas interacciones de esta semana cerró el loop con «¿quedamos en lo '
         'mismo?».',
         'Antes de terminar una conversación con pedidos o compromisos, cierra el loop: «¿Quedamos '
         'en lo mismo?».'),
        ('Pídele un mail reciente y revisa si en tres líneas se entienden el contexto, el pedido y '
         'por qué ahora. Si falta información, reescríbanlo juntos.',
         'Antes del cuerpo del mail escribe tres líneas: contexto, pedido y por qué ahora.'),
        ('Si en las reuniones calla, acuerden una entrada concreta para la próxima. Después '
         'pregúntale qué dijo y qué le devolvió hacerlo, y reconoce el intento.',
         'Haz al menos una entrada en una reunión donde antes te habrías quedado en silencio. '
         'Anota qué dijiste y qué te devolvió.'),
        ('Pídele que practique devolver en una frase lo que entendió antes de opinar. Cuando '
         'alguien se queje, que pregunte «¿es para que se sepa o para hacer algo?» y que cuente '
         'cuántas veces fue cada cosa.',
         'En tres conversaciones de trabajo, antes de dar tu opinión, devuelve en una frase lo que '
         'entendiste y haz una pregunta. Anota si apareció algo que no habías registrado.'),
        ('Ayúdale a mapear de 3 a 6 stakeholders además de ti y revisa que cada dos semanas les '
         'mande una actualización de tres líneas: en qué trabaja, qué produce para quien lee y '
         'dónde se tocan.',
         'Haz tu Mapa de Stakeholders: ¿quién decide o influye?, ¿quién usa lo que produces?, '
         '¿quién podría ser aliado o bloqueador? Envía a cada uno una actualización de tres líneas '
         'cada dos semanas.'),
        ('Cuando no pueda con un pedido, espera «lo que sí puedo + lo que haría falta para el '
         'resto + qué le sirve al otro». Si solo dice no, ensayen la respuesta juntos. Revisa '
         'también cómo pide a otros equipos: ¿ofrece algo a cambio?',
         'Ante un pedido que no entra, responde con la parte que sí puedes, lo que haría falta '
         'para el resto y la pregunta de qué le sirve al otro.'),
        ('Antes de una presentación que busque una decisión, pídele la última parte primero: qué '
         'se pide y para cuándo. Después registra si terminó en decisión, en objeción concreta o '
         'en «lo revisamos».',
         'En tu próxima presentación que necesite una decisión, escribe primero la última parte: '
         'qué se pide y para cuándo. Añade un caso concreto después de la idea.'),
        ('Invítalo a darte feedback: pregúntale qué observación guarda sobre cómo trabajas juntos '
         'y recíbela sin defenderte. Con perfiles técnicos, pídeles la recomendación en cuatro '
         'frases sin una sola métrica técnica.',
         'Toma una observación que hoy te guardas sobre cómo trabaja tu manager, pásala por las '
         'dos preguntas del filtro y, si las pasa, escribe tres frases antes de la conversación.')],
 'P5': [('Pregúntale qué situaciones lo sacan de eje (un tipo de mensaje, un tipo de error, un '
         'tipo de reunión) y cómo suena su reacción automática. Conocer el disparador es el primer '
         'paso para la pausa.',
         'Piensa en las últimas tres situaciones en que sentiste que perdías el control. ¿Qué '
         'tenían en común? Anota el disparador y cómo suena tu reacción automática.'),
        ('Si a veces escribe molesto, acuerda con él la regla: escribir sin enviar, esperar, '
         'releer desde el lado del otro y quitar una frase. Pregúntale después qué frase sacó.',
         'En tus próximos dos mensajes escritos molesto: escríbelos sin enviar, espera, relee '
         'desde el lado del otro y anota qué frase sacaste.'),
        ('Después de un tropiezo no analices en caliente. Pídele una frase sin adjetivos, la '
         'diferencia entre lo que pasó y quién es, y una acción que pueda tildar en 24 horas. El '
         'análisis puede esperar a mañana.',
         'La próxima vez que algo salga mal: una frase sin adjetivos, la distinción entre lo que '
         'pasó y quién eres, y una acción que puedas tildar en las próximas 24 horas.'),
        ('Cada cierto tiempo pregúntale: ¿qué aprendiste?, ¿qué entregable es mejor que uno de '
         'hace tres meses?, ¿dónde aplicaste criterio propio? Ayuda a medir su progreso sin '
         'depender del reconocimiento externo. Pregunta también por su nivel de carga y qué ajuste '
         'preventivo hizo.',
         'El viernes al mediodía responde tres preguntas: qué aprendiste, qué entregable fue mejor '
         'que uno de hace tres meses y en qué situación aplicaste criterio propio. Lee tu estado '
         'de carga semanalmente y, si está en amarillo, ajusta esa misma semana.'),
        ('Pídele que te cuente una señal de presión que notó en alguien del equipo (errores '
         'repetidos, menos participación, mensajes más cortos) y qué hizo en las siguientes 24 '
         'horas: pregunta directa, oferta de recurso o reconocimiento de carga.',
         'Identifica una señal de presión en alguien del equipo y elige una de tres acciones '
         '—pregunta directa, oferta de un recurso o reconocimiento de carga— para hacerla dentro '
         'de las 24 horas.'),
        ('Antes de que ayude o proponga algo, pregúntale si ofreció dos opciones concretas y si '
         'evaluó que fuera el momento. Pídele un caso donde la respuesta fue distinta de lo que '
         'suponía.',
         'Antes de ayudar a alguien, ofrece dos ayudas concretas y deja que elija. Antes de pedir '
         'o proponer, haz las tres lecturas del momento; si dos no dan, pide otro momento.'),
        ('Anímalo a ser el primero en decir «no entendí» en una reunión de pares y a nombrar un '
         'error propio terminando en qué cambió. Después fíjate si otros se animaron a preguntar. '
         'Modela tú el primero.',
         'En una reunión de pares, sé el primero en plantear una duda o un error concreto. Después '
         'registra si alguien más preguntó algo en esa misma reunión.'),
        ('Pídele que reconozca con precisión: qué hizo la persona, qué efecto tuvo y por qué '
         'importa. Y que contraste sus supuestos con colegas distintos a él: ¿qué supuesto resultó '
         'falso?',
         'Reconoce a alguien con tres partes: qué hizo, qué efecto tuvo y por qué importa. Haz el '
         'chequeo con dos colegas de edad distinta a la tuya y anota un supuesto que resultó '
         'falso.')],
 'AI': [('Antes de aprobar una entrega hecha con IA pregunta: «¿cómo lo comprobaste y contra '
         'qué?». Si la respuesta es otra IA o «se veía bien», pídele la fuente concreta (un '
         'documento, un sistema, una persona).',
         'Ante el próximo dato de IA que vaya a salir en una entrega, escribe al lado el '
         'documento, sistema o persona contra el que lo comprobaste. Si el campo queda vacío, el '
         'dato no está listo.'),
        ('Pide que sus entregas con IA lleven tres líneas arriba: qué se comprobó, contra qué y '
         'qué quedó sin comprobar. Si recibes trabajo ajeno hecho con IA, comprueba al menos una '
         'línea contra su fuente antes de aprobar.',
         'En tu próxima entrega hecha con IA, agrega arriba tres líneas: qué comprobaste, contra '
         'qué y qué quedó sin comprobar. Toma un minuto.'),
        ('Revisa que sus pedidos a la IA empiecen por el entregable —qué, cuántos, para quién, de '
         'qué extensión— y no por el tema. Pídele que te muestre cómo cambió el resultado al '
         'agregar destinatario y extensión.',
         'Antes de mandar un prompt, completa la frase «lo que necesito es un…». Si no puedes '
         'terminarla con un sustantivo concreto, todavía es un tema. Agrega destinatario y '
         'extensión.'),
        ('Pregúntale cuáles de sus pendientes son «zona 2» —los que necesitan contexto que todavía '
         'no tiene— y pídele que te los muestre para revisión antes de que salgan.',
         'Reparte los pendientes de un día en las tres zonas de tarea. Cuenta cuántos caen en la '
         'zona 2: ese número es el mapa de lo que todavía no tienes contexto para cerrar solo.'),
        ('Recuérdale quitar nombres e identificadores antes de pegar información en una IA, y '
         'pregúntale a quién preguntaría en la organización si necesitara el dato personal. Es '
         'mejor tener ese nombre antes de necesitarlo.',
         'Antes de pegar un bloque de información en una IA, borra las columnas de identificación '
         'y comprueba que el resultado sale igual. Averigua quién responde en tu organización '
         'sobre uso de herramientas con información personal.'),
        ('Conversen de cuándo declarar el uso de IA: pídele un caso donde lo declaró, uno donde no '
         'correspondía y por qué la diferencia. Reacciona bien a la declaración: lo que se castiga '
         'no se declara.',
         'Identifica tu próxima entrega que quede por encima del umbral y declara el uso de IA, '
         'con una línea sobre lo que comprobaste. Registra cómo reaccionó quien la recibió.'),
        ('Cuando el resultado de la IA toque a una persona (una evaluación, una priorización, una '
         'asignación), exige que lo revise antes de aplicarlo, aunque se vea correcto. Pregúntale '
         'qué parte cerró él mismo.',
         'Revisa tus pendientes de la semana y marca cuáles tienen una persona identificable del '
         'otro lado. En esos, mira el resultado antes de aplicarlo, aunque se vea correcto.'),
        ('Ante un error suyo, valora que lo nombre antes de que otro lo descubra. Y no delegues a '
         'la IA las tareas que forman criterio en otra persona: asígnalas con la revisión agendada '
         'junto con ellas.',
         'Ante tu próximo error, aplica la Fórmula del Momento antes de que alguien más lo '
         'descubra: nombrar, tomar ownership y proponer la solución con hora.')]}

# Skill primario por título normalizado (T1_unidades_v3.csv).
_SKILL_BY_TITLE: dict[str, str] = {'lo que la ia hace cuando responde': 'Alfabetización en IA',
 'por que se equivoca con seguridad': 'Alfabetización en IA',
 'lo que se comprime y lo que sube de valor': 'Alfabetización en IA',
 'puedo comprobar esto': 'Alfabetización en IA',
 'tres zonas de tarea': 'Alfabetización en IA',
 'el resultado exacto no la tarea general': 'Alfabetización en IA',
 'el formato manda': 'Alfabetización en IA',
 'lo que la ia no debe inventar': 'Alfabetización en IA',
 'verificar contra la fuente no contra otra ia': 'Alfabetización en IA',
 'el experimento entrega evidencia': 'Alfabetización en IA',
 'primero quitarle el nombre': 'Criterio ético',
 'cuando si hace falta el nombre': 'Criterio ético',
 'lo que hay que decir': 'Criterio ético',
 'cuando el output decide sobre una persona': 'Criterio ético',
 'lo que no se delega': 'Criterio',
 'velocidad con criterio': 'Aprendizaje continuo',
 'mi carrera mi propuesta': 'Aprendizaje continuo',
 'multiplicando impacto': 'Alfabetización en IA',
 'momentos que definen': 'Ownership',
 'territorio sin mapa': 'Criterio ético',
 'antes de seguir': 'Aprendizaje continuo',
 'lo que escuchaste': 'Inteligencia emocional',
 'nadie te va a avisar': 'Adaptabilidad',
 'la pregunta que no hiciste': 'Aprendizaje continuo',
 'aprender no es repasar': 'Aprendizaje continuo',
 'no todo a la vez': 'Adaptabilidad',
 'el feedback que si sirve': 'Aprendizaje continuo',
 'filtrar antes de reaccionar': 'Criterio',
 'el proceso por dentro': 'Pensamiento analítico',
 'tres cosas': 'Excelencia operativa',
 'antes de que pregunten': 'Ownership',
 'antes de que pase': 'Ownership',
 'el archivo no habla': 'Ownership',
 'tu nombre no esta pero estas vos': 'Ownership',
 'el activo invisible': 'Ownership',
 'que estamos decidiendo': 'Liderazgo e influencia social',
 'que mas deberia saber': 'Aprendizaje continuo',
 'esto esta bien hecho': 'Excelencia operativa',
 'el que ya lo sabe': 'Aprendizaje continuo',
 'quien lo dice': 'Pensamiento analítico',
 'la primera no es la unica': 'Creatividad',
 'comparado con que': 'Pensamiento analítico',
 'el problema en tres partes': 'Pensamiento analítico',
 'no es lo que dijiste es lo que entendieron': 'Comunicación y persuasión',
 'el que no habla no existe': 'Comunicación y persuasión',
 'lo que no se dice en el mail': 'Comunicación y persuasión',
 'lo que no pasa en el chat': 'Inteligencia social',
 'escuchar no es esperar tu turno': 'Inteligencia social',
 'presente sin estar': 'Colaboración',
 'como te escriben': 'Colaboración',
 'lo que si puedo': 'Liderazgo e influencia social',
 'con un caso': 'Comunicación y persuasión',
 'lo que siento antes de pensar': 'Inteligencia emocional',
 'cuando todo pesa al mismo tiempo': 'Adaptabilidad',
 'el equipo que no elegiste': 'Inteligencia social',
 'la friccion invisible': 'Inteligencia social',
 'cuando sale mal': 'Adaptabilidad',
 'el colega que no piensa como vos': 'Inteligencia social',
 'la ayuda que no pidieron': 'Inteligencia social',
 'lo que cambia cuando ya sabe usarla': 'Alfabetización en IA',
 'la ia no discute el encuadre': 'Alfabetización en IA',
 'desde que silla responde': 'Alfabetización en IA',
 'cuando todos preguntan igual': 'Alfabetización en IA',
 'mismo pedido otro dia otro resultado': 'Alfabetización en IA',
 'las tres tareas': 'Alfabetización en IA',
 'que no dependa de quien lo haga': 'Alfabetización en IA',
 'medir lo que ya no diferencia': 'Alfabetización en IA',
 'no todo se verifica igual': 'Alfabetización en IA',
 'lo que sube una tarea de nivel': 'Criterio',
 'cuando el insumo viene de otro': 'Alfabetización en IA',
 'quien necesita saber esto': 'Criterio ético',
 'cuando le piden el dato': 'Criterio ético',
 'el dato correcto por el canal equivocado': 'Criterio ético',
 'a la ia o a una persona': 'Criterio',
 'lo que tus mejores semanas tienen en comun': 'Inteligencia emocional',
 'la transicion que no ocurre sola': 'Aprendizaje continuo',
 'los tres filtros': 'Criterio ético',
 'buscando en el mapa': 'Aprendizaje continuo',
 'agilidad para cambiar': 'Adaptabilidad',
 'calibrando poco a poco': 'Aprendizaje continuo',
 'el guia emergente': 'Liderazgo e influencia social',
 'lo que ya no sirve': 'Adaptabilidad',
 'urgente importante': 'Excelencia operativa',
 'mover sin presionar': 'Liderazgo e influencia social',
 'del silencio al criterio': 'Comunicación y persuasión',
 'verificar antes de ejecutar': 'Ownership',
 'cerrar con accion': 'Liderazgo e influencia social',
 'entregado no es terminado': 'Ownership',
 'del dato al resultado': 'Pensamiento analítico',
 'el dato que decide': 'Pensamiento analítico',
 'del silencio a la propuesta': 'Pensamiento analítico',
 'el atajo que te engana': 'Pensamiento analítico',
 'el problema que resolvemos entre todos': 'Pensamiento analítico',
 'mas alla de mi proceso': 'Pensamiento analítico',
 'lo que siempre se escapa': 'Excelencia operativa',
 'y si no existiera': 'Creatividad',
 'mas alla del manager': 'Comunicación y persuasión',
 'el pedido que funciona': 'Liderazgo e influencia social',
 'del reporte a la accion': 'Comunicación y persuasión',
 'el acuerdo no la batalla': 'Liderazgo e influencia social',
 'el mensaje no viaja igual': 'Colaboración',
 'mas alla de los datos': 'Comunicación y persuasión',
 'el equipo no te ve si no lo mostras': 'Colaboración',
 'desahogo o pedido': 'Inteligencia social',
 'la pausa que decide': 'Adaptabilidad',
 'medir desde adentro': 'Inteligencia emocional',
 'la empatia que se nota': 'Inteligencia social',
 'la senal que ignoraste': 'Colaboración',
 'el tanque de energia': 'Adaptabilidad',
 'el primero en decir no entendi': 'Inteligencia social',
 'el mensaje que sale caliente': 'Inteligencia emocional',
 'no era el momento': 'Inteligencia social',
 'probar una linea': 'Alfabetización en IA',
 'el proyecto que nadie mas va a salvar': 'Ownership',
 'lo que sabes que nadie mas sabe que sabes': 'Liderazgo e influencia social',
 'la bifurcacion que ya no puede esperar': 'Inteligencia emocional',
 'lo que no es tuyo y si te toca': 'Criterio ético',
 'del saber al mostrar': 'Liderazgo e influencia social',
 'adaptarse sin perder el nivel': 'Adaptabilidad',
 'cuando ya sale solo': 'Aprendizaje continuo',
 'mas alla de mi parte': 'Ownership',
 'tres comportamientos que cambian el equipo': 'Liderazgo e influencia social',
 'el mapa antes del problema': 'Pensamiento analítico',
 'antes de convocar': 'Liderazgo e influencia social',
 'conducir para decidir': 'Liderazgo e influencia social',
 'un si que depende de otros': 'Ownership',
 'lo que sale para que algo entre': 'Excelencia operativa',
 'ver el sistema completo': 'Pensamiento analítico',
 'criterio que se puede ensenar': 'Criterio',
 'decidir con informacion parcial': 'Pensamiento analítico',
 'la pregunta de negocio': 'Pensamiento analítico',
 'escalo o resuelvo': 'Pensamiento analítico',
 'mas de una respuesta correcta': 'Creatividad',
 'terminado para que': 'Excelencia operativa',
 'el filtro del stakeholder': 'Comunicación y persuasión',
 'el tecnico que convence': 'Comunicación y persuasión',
 'cuando todos tienen razon': 'Liderazgo e influencia social',
 'negociar con el cliente': 'Liderazgo e influencia social',
 'el contraste que no se apaga': 'Comunicación y persuasión',
 'el pedido que el equipo de datos si puede resolver': 'Pensamiento analítico',
 'feedback hacia arriba': 'Comunicación y persuasión',
 'el mapa informal': 'Inteligencia social',
 'las palabras que frenan': 'Inteligencia social',
 'el mapa como punto de partida': 'Colaboración',
 'el protocolo del desacuerdo': 'Inteligencia emocional',
 'el reconocimiento que multiplica': 'Inteligencia social',
 'el roce que cruza areas': 'Colaboración',
 'la verdad que cuesta decir': 'Inteligencia social',
 'lo que cambia para el otro': 'Inteligencia social',
 'lo que depende de mi esta semana': 'Adaptabilidad',
 'te puedo decir algo': 'Asertividad',
 'cerca pero no encima': 'Enseñanza'}


def _norm(title: str) -> str:
    s = unicodedata.normalize("NFKD", title.lower())
    s = "".join(ch for ch in s if not unicodedata.combining(ch))
    return re.sub(r"[^a-z0-9]+", " ", s).strip()


def upgrade() -> None:
    bind = op.get_bind()

    # 1. Columna de la versión colaborador del tip.
    op.execute(
        "ALTER TABLE pillar_coaching_tips ADD COLUMN IF NOT EXISTS collaborator_text VARCHAR(500)"
    )

    # 2. Tips: fuera los placeholders, dentro los validados.
    bind.execute(
        sa.text(
            "DELETE FROM pillar_coaching_tips "
            "WHERE dimension_code = :dim AND text LIKE '[Placeholder]%'"
        ),
        {"dim": _DIM},
    )
    for pillar, tips in _TIPS.items():
        for idx, (manager_text, collab_text) in enumerate(tips):
            bind.execute(
                sa.text(
                    "INSERT INTO pillar_coaching_tips "
                    "(id, dimension_code, pillar_code, text, collaborator_text, order_index, is_active) "
                    "VALUES (:id, :dim, :pillar, :text, :collab, :idx, true) "
                    "ON CONFLICT (dimension_code, pillar_code, order_index) DO NOTHING"
                ),
                {
                    "id": uuid.uuid4(), "dim": _DIM, "pillar": pillar, "text": manager_text,
                    "collab": collab_text, "idx": idx,
                },
            )

    # 3. Comportamientos: actualizar en sitio el borrador; insertar el resto.
    for pillar, texts in _BEHAVIORS.items():
        old = _OLD_DRAFT.get(pillar, [])
        for idx, text in enumerate(texts):
            if idx < len(old):
                bind.execute(
                    sa.text(
                        "UPDATE pillar_behaviors SET text = :new "
                        "WHERE dimension_code = :dim AND pillar_code = :pillar "
                        "AND order_index = :idx AND text = :old"
                    ),
                    {"new": text, "dim": _DIM, "pillar": pillar, "idx": idx, "old": old[idx]},
                )
            bind.execute(
                sa.text(
                    "INSERT INTO pillar_behaviors "
                    "(id, dimension_code, pillar_code, text, order_index, is_active) "
                    "VALUES (:id, :dim, :pillar, :text, :idx, true) "
                    "ON CONFLICT (dimension_code, pillar_code, order_index) DO NOTHING"
                ),
                {"id": uuid.uuid4(), "dim": _DIM, "pillar": pillar, "text": text, "idx": idx},
            )

    # 4. Skill primario → learning_units.keywords (filtro por Skill de módulos).
    matched = 0
    units = bind.execute(
        sa.text("SELECT id, title FROM learning_units WHERE dimension_code = :dim"), {"dim": _DIM}
    ).all()
    for unit_id, title in units:
        # Match exacto; respaldo: título sin el subtítulo tras ":" ("X: de A a B" → "X").
        skill = _SKILL_BY_TITLE.get(_norm(title)) or _SKILL_BY_TITLE.get(_norm(title.split(":")[0]))
        if skill is None:
            continue
        bind.execute(
            sa.text("UPDATE learning_units SET keywords = CAST(:kw AS jsonb) WHERE id = :id"),
            {"kw": '["' + skill.replace('"', "") + '"]', "id": unit_id},
        )
        matched += 1
    log.info("PF-03: skill primario aplicado a %d de %d units CP", matched, len(units))


def downgrade() -> None:
    # El contenido cargado no se revierte (los placeholders no son contenido válido).
    op.drop_column("pillar_coaching_tips", "collaborator_text")
