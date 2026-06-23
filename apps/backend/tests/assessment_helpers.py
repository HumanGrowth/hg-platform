"""Helpers compartidos para los tests del motor de assessment (no es test_*)."""
from __future__ import annotations

from fastapi.testclient import TestClient


def _value_for(item: dict, answers: dict[str, int]) -> int:
    code = item["item_code"]
    if code in answers:
        return answers[code]
    if item["options"]:
        return item["options"][0]["value"]
    return item["scale_min"] if item["scale_min"] is not None else 0


def run_session(
    client: TestClient,
    headers: dict[str, str],
    kind: str,
    target_pillar: str | None = None,
    answers: dict[str, int] | None = None,
) -> dict:
    """Inicia, responde todos los items y finaliza una sesión. Devuelve el JSON
    del finalize ({session_id, results})."""
    answers = answers or {}
    payload: dict = {"kind": kind}
    if target_pillar:
        payload["target_pillar"] = target_pillar
    res = client.post("/api/v1/assessment/sessions", headers=headers, json=payload)
    assert res.status_code == 201, res.text
    session = res.json()
    session_id = session["id"]

    guard = 0
    while session["next_item"] is not None:
        guard += 1
        assert guard < 100, "loop de respuestas no termina"
        item = session["next_item"]
        res = client.post(
            f"/api/v1/assessment/sessions/{session_id}/respond",
            headers=headers,
            json={"item_id": item["id"], "response_value": _value_for(item, answers)},
        )
        assert res.status_code == 200, res.text
        session = res.json()

    res = client.post(f"/api/v1/assessment/sessions/{session_id}/finalize", headers=headers)
    assert res.status_code == 200, res.text
    return res.json()


# Respuestas P3 (detalle completo) que producen N3 (candidato a N4):
# soledad baja (A1-A3=1) + íntima y relacional altas (≥4).
P3_N3_ANSWERS = {
    "UCLA-A1": 1, "UCLA-A2": 1, "UCLA-A3": 1,
    "CAC-B1": 5, "CAC-B2": 5, "CAC-B3": 5, "CAC-B4": 5, "CAC-B5": 5,
}
