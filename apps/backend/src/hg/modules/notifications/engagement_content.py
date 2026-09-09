"""Contenido de los recordatorios de engagement (inactividad + due dates).

Templates cortos escritos a mano — igual que `dimension-states.json` del
frontend, esto es una capa de contenido aislada para poder editarla sin tocar
la lógica de envío (`hg.modules.notifications.tasks`). Generales y no
dimension-specific a propósito: el recordatorio no sabe en qué dimensión anda
la persona, solo que dejó de volver.
"""
from __future__ import annotations

# Por qué seguir: la razón detrás de la insistencia, no solo "volvé a entrar".
# Rota por hash del user_id, así la misma persona no ve siempre el mismo texto
# en corridas sucesivas, pero es determinístico dentro de una corrida.
WHY_KEEP_LEARNING: list[str] = [
    "El conocimiento que no se refuerza se diluye rápido: la curva del olvido "
    "cae más en los primeros días que después. Volver ahora cuesta menos que "
    "volver en un mes.",
    "El crecimiento no es lineal, pero sí es acumulativo: cada módulo construye "
    "sobre el anterior. Una pausa larga no borra lo que ya avanzaste, pero sí "
    "hace más difícil retomar el hilo.",
    "Los hábitos se sostienen con repetición, no con intensidad. Cinco minutos "
    "hoy valen más que una sesión larga dentro de dos semanas.",
    "Tu ruta está armada en el orden que más te sirve a vos — no es una lista "
    "genérica. Cada paso que dejás pendiente es una decisión tuya postergada.",
    "El progreso te lo llevás vos: no es un curso que se vence, es una insignia "
    "que ya empezaste a ganar y que sigue esperando que la termines.",
]

INACTIVITY_HEADLINE: dict[str, str] = {
    "inactivity_7d": "Van {days} días sin pasar por acá",
    "inactivity_21d": "Hace {days} días que no volvés",
}

INACTIVITY_SUBTEXT: dict[str, str] = {
    "inactivity_7d": "Nada grave — pasa. Un módulo de pocos minutos alcanza para no perder el ritmo.",
    "inactivity_21d": "Sabemos que las semanas se llenan. Tu ruta sigue exactamente donde la dejaste.",
}


def why_keep_learning(seed: str) -> str:
    """Selección determinística (por seed, típicamente el user_id) entre los
    insights — misma corrida, mismo texto; corridas distintas, rota."""
    idx = sum(ord(c) for c in seed) % len(WHY_KEEP_LEARNING)
    return WHY_KEEP_LEARNING[idx]


def inactivity_headline(kind: str, days: int) -> str:
    return INACTIVITY_HEADLINE[kind].format(days=days)


def inactivity_subtext(kind: str) -> str:
    return INACTIVITY_SUBTEXT[kind]


def due_headline(kind: str, unit_title: str) -> str:
    if kind == "assignment_due_today":
        return f"“{unit_title}” vence hoy"
    return f"“{unit_title}” vence en unos días"


def due_subtext(kind: str) -> str:
    if kind == "assignment_due_today":
        return "Todavía estás a tiempo de completarlo hoy."
    return "Te lo asignó tu manager — vale la pena resolverlo antes de la fecha."
