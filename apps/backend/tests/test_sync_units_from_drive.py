"""Tests de parsers puros del bulk import (TASK lu-refine-A-11).

Cubre lo que no toca DB ni I/O de red: extracción del JSON del Doc, parseo del
nombre de folder, armado de video_blocks y el fixup de posiciones. Los tests
DB-backed de ``upsert_unit_from_dict`` viven en ``test_learning_units_services``.
"""
from __future__ import annotations

from pathlib import Path

import pytest

from hg.modules.learning_units.services import UnitDictError
from hg.modules.learning_units.unit_code import UnitCode
from hg.scripts.sync_units_from_drive import (
    assemble_unit_dict,
    build_video_blocks,
    code_from_unit_json,
    derive_unit_code,
    extract_json_from_doc_text,
    parse_folder_name,
    parse_unit_json_text,
    run,
    sanitize_unit_json,
)

_FIXTURE = Path(__file__).parent / "fixtures" / "drive_doc_sample.txt"


# ─────────────────────────── parse_folder_name ───────────────────────────


@pytest.mark.parametrize(
    "name,expected",
    [
        ("CP-L1-P1-001", UnitCode("CP", 1, "P1", 1)),
        ("CP-L1-P4-004", UnitCode("CP", 1, "P4", 4)),
        ("CP-L2-P3-012 - descripción extra", UnitCode("CP", 2, "P3", 12)),
        # TASK 1: ya NO hardcodea CP — cualquier dimensión de 2-3 letras.
        ("PR-L1-P2-003", UnitCode("PR", 1, "P2", 3)),
        # CE-07: pilar nombrado (Inteligencia Artificial); IA→AI.
        ("CP-L1-IA-015", UnitCode("CP", 1, "AI", 15)),
    ],
)
def test_parse_folder_name_ok(name: str, expected: UnitCode) -> None:
    assert parse_folder_name(name) == expected


@pytest.mark.parametrize("bad", ["random-folder", "P1-L1-001", "CP-X1-P1-001", ""])
def test_parse_folder_name_rejects_bad(bad: str) -> None:
    # Fuera de convención → None (el sync lo reporta y saltea, no revienta).
    assert parse_folder_name(bad) is None


# ─────────────────────────── derive_unit_code ───────────────────────────


def test_derive_unit_code_from_folder_name() -> None:
    # Carrera: el folder ya trae el código (el MP4 no importa).
    assert derive_unit_code("CP-L1-P5-003", ["cualquier.mp4"]) == UnitCode("CP", 1, "P5", 3)


def test_derive_unit_code_from_mp4_when_folder_lacks_code() -> None:
    # Propósito/Relaciones: folder `V0-001` sin código; el MP4 sí lo trae.
    assert derive_unit_code("V0-001", ["PR-L1-V0-001.mp4"]) == UnitCode("PR", 1, "V0", 1)


def test_derive_unit_code_strips_vid_suffix_from_mp4() -> None:
    # El MP4 suele traer sufijo ` - VID1`; se recorta antes de parsear.
    assert derive_unit_code("V1-002", ["RE-L1-V1-002 - VID1.mp4"]) == UnitCode("RE", 1, "V1", 2)


def test_derive_unit_code_none_when_no_source_parses() -> None:
    assert derive_unit_code("V0-001", ["sin-codigo.mp4"]) is None
    assert derive_unit_code("carpeta-rara", []) is None


# ─────────────────────────── extract_json_from_doc_text ───────────────────────────


def test_extract_json_from_real_doc_fixture() -> None:
    doc_text = _FIXTURE.read_text(encoding="utf-8")
    unit = extract_json_from_doc_text(doc_text)

    assert unit["slug"] == "hg-p2-l1-002-proposito-diario"
    # El extract devuelve el JSON crudo del Doc, cuya clave legacy es `pillar_code`
    # (dato externo de Jorge). El override a `dimension_code` ocurre después, en
    # build_unit_from_folder — no acá.
    assert unit["pillar_code"] == "P2"
    assert len(unit["blocks"]) == 5
    # Prosa antes y después del JSON ignorada; nada se coló en el dict.
    assert set(unit) >= {"slug", "title", "pillar_code", "level_code", "blocks"}


def test_extract_json_cleans_markdown_escapes() -> None:
    unit = extract_json_from_doc_text(_FIXTURE.read_text(encoding="utf-8"))
    evidence = next(b for b in unit["blocks"] if b["type"] == "text_evidence")
    # `implementation\_intentions` y `\[1\]` quedaron desescapados.
    assert "implementation_intentions" in evidence["body"]
    assert "\\_" not in evidence["body"]
    assert "[1]" in evidence["body"] and "\\[" not in evidence["body"]
    solution = next(b for b in unit["blocks"] if b["type"] == "text_solution")
    assert "logro ___" in solution["body"]


def test_extract_json_ignores_trailing_prose() -> None:
    text = '{"slug": "hg-p1-l1-001-x", "title": "X"} ¿y después? basura extra {no json}'
    assert extract_json_from_doc_text(text)["slug"] == "hg-p1-l1-001-x"


def test_extract_json_raises_without_json() -> None:
    with pytest.raises(UnitDictError):
        extract_json_from_doc_text("un documento sin ningún objeto json adentro")


def test_extract_json_raises_without_slug() -> None:
    with pytest.raises(UnitDictError):
        extract_json_from_doc_text('{"title": "sin slug"}')


# ─────────────────────────── build_video_blocks + assemble ───────────────────────────


def test_build_video_blocks_first_is_intro() -> None:
    blocks = build_video_blocks(["https://cdn/x/VID1.mp4", "https://cdn/x/VID2.mp4"])
    assert [b["type"] for b in blocks] == ["video_intro", "video_teaching"]
    assert [b["eyebrow_label"] for b in blocks] == ["VIDEO 1", "VIDEO 2"]
    assert all(b["required"] and b["duration_seconds"] > 0 for b in blocks)


def test_build_video_blocks_empty() -> None:
    assert build_video_blocks([]) == []


def test_assemble_unit_dict_prepends_videos_and_fixes_evidence_position() -> None:
    unit_json = {
        "slug": "hg-p2-l1-002-proposito-diario",
        "blocks": [
            {"type": "text_context", "body": "c"},
            {"type": "text_evidence", "body": "e", "citation": {}},          # pos 2 pre-video
            {"type": "text_solution", "body": "s", "requires_evidence_position": 2},
        ],
    }
    assembled = assemble_unit_dict(unit_json, ["https://cdn/x/VID1.mp4"])
    types = [b["type"] for b in assembled["blocks"]]
    assert types == ["video_intro", "text_context", "text_evidence", "text_solution"]
    # La evidence pasó de posición 2 a 3 (1 video prepend) → el solution la sigue.
    solution = assembled["blocks"][3]
    assert solution["requires_evidence_position"] == 3


def test_assemble_unit_dict_no_videos_leaves_positions() -> None:
    unit_json = {
        "slug": "x",
        "blocks": [
            {"type": "text_evidence", "body": "e", "citation": {}},
            {"type": "text_solution", "body": "s", "requires_evidence_position": 1},
        ],
    }
    assembled = assemble_unit_dict(unit_json, [])
    assert assembled["blocks"][1]["requires_evidence_position"] == 1


def _family_a_json() -> dict[str, object]:
    """Forma real de los Docs de Jorge (familia A): 3 slots de video en sus
    posiciones, requires_evidence_position apuntando al índice real (=4)."""
    return {
        "slug": "hg-p3-l1-003-el-que-ya-lo-sabe",
        "blocks": [
            {"type": "video_intro", "required": True, "duration_seconds": 15,
             "eyebrow_label": "GANCHO", "video_id": "hook"},
            {"type": "text_context", "body": "c"},
            {"type": "video_teaching", "required": True, "duration_seconds": 53},
            {"type": "text_evidence", "body": "e", "citation": {}},
            {"type": "text_solution", "body": "s", "requires_evidence_position": 4},
            {"type": "quiz_recall", "questions": []},
            {"type": "video_closing", "required": False, "duration_seconds": 18},
            {"type": "reflection_write", "prompt": "r"},
        ],
    }


def test_assemble_family_a_fills_slots_drops_unfilled_closing() -> None:
    # 2 MP4 · 3 slots → intro+teaching se rellenan, closing se descarta.
    assembled = assemble_unit_dict(_family_a_json(), ["https://cdn/x/VID1.mp4", "https://cdn/x/VID2.mp4"])
    types = [b["type"] for b in assembled["blocks"]]
    assert types == [
        "video_intro", "text_context", "video_teaching",
        "text_evidence", "text_solution", "quiz_recall", "reflection_write",
    ]  # video_closing dropped
    intro = assembled["blocks"][0]
    assert intro["video_url"] == "https://cdn/x/VID1.mp4"
    assert intro["duration_seconds"] == 15  # duración real del slot, no el placeholder
    assert intro["eyebrow_label"] == "GANCHO"
    assert "video_id" not in intro  # campo placeholder descartado
    teaching = assembled["blocks"][2]
    assert teaching["video_url"] == "https://cdn/x/VID2.mp4"
    # evidence quedó en el mismo índice (4) → el solution la sigue apuntando.
    solution = next(b for b in assembled["blocks"] if b["type"] == "text_solution")
    assert solution["requires_evidence_position"] == 4


def test_assemble_family_a_no_mp4_drops_all_slots() -> None:
    # 0 MP4 · 3 slots → todos los slots se descartan; evidence pasa de 4 a 2.
    assembled = assemble_unit_dict(_family_a_json(), [])
    types = [b["type"] for b in assembled["blocks"]]
    assert not any(t.startswith("video") for t in types)
    solution = next(b for b in assembled["blocks"] if b["type"] == "text_solution")
    evidence_idx = types.index("text_evidence") + 1
    assert solution["requires_evidence_position"] == evidence_idx == 2


def test_assemble_family_a_one_mp4_fills_intro_keeps_evidence_link() -> None:
    # 1 MP4 · 3 slots → sólo intro; teaching (antes de evidence) y closing se
    # descartan, así que evidence se corre y el link se recalcula.
    assembled = assemble_unit_dict(_family_a_json(), ["https://cdn/x/VID1.mp4"])
    types = [b["type"] for b in assembled["blocks"]]
    assert types == [
        "video_intro", "text_context", "text_evidence",
        "text_solution", "quiz_recall", "reflection_write",
    ]
    solution = next(b for b in assembled["blocks"] if b["type"] == "text_solution")
    assert solution["requires_evidence_position"] == 3  # evidence ahora en índice 3


def test_sanitize_unit_json_fills_missing_doi_and_maps_bad_tier() -> None:
    from hg.modules.learning_units.schemas import CitationOut

    unit_json = {
        "slug": "x",
        "blocks": [
            {"type": "text_context", "body": "c"},
            # citación sin doi_or_url y con tier fuera del enum (como los Docs reales)
            {"type": "text_evidence", "body": "e",
             "citation": {"text": "Nass & Byron (2015)", "source": "X", "year": 2015,
                          "tier": "neuroscience"}},
        ],
    }
    out = sanitize_unit_json(unit_json)
    cit = out["blocks"][1]["citation"]
    assert cit["doi_or_url"] == ""            # completado
    assert cit["tier"] == "expert_opinion"    # mapeado desde 'neuroscience'
    assert cit["text"] == "Nass & Byron (2015)"  # conservado
    # y ahora es construible por el schema estricto (antes tiraba ValidationError):
    assert CitationOut(**cit).tier == "expert_opinion"


def test_sanitize_unit_json_nulls_invalid_competency_code() -> None:
    out = sanitize_unit_json({"slug": "x", "competency_code": "Expertise", "blocks": []})
    assert out["competency_code"] is None


def test_sanitize_unit_json_keeps_valid_competency_code() -> None:
    out = sanitize_unit_json({"slug": "x", "competency_code": "C3", "blocks": []})
    assert out["competency_code"] == "C3"


def test_sanitize_unit_json_keeps_valid_citation_untouched() -> None:
    unit_json = {
        "slug": "x",
        "blocks": [
            {"type": "text_evidence", "body": "e",
             "citation": {"text": "T", "source": "S", "year": 2020,
                          "doi_or_url": "https://doi.org/10.1/x", "tier": "rct"}},
        ],
    }
    cit = sanitize_unit_json(unit_json)["blocks"][0]["citation"]
    assert cit["tier"] == "rct" and cit["doi_or_url"] == "https://doi.org/10.1/x"


def test_vid_sort_key_orders_by_vid_number_despite_prefix_typo() -> None:
    from hg.scripts.sync_units_from_drive import _vid_sort_key

    names = ["CP-L1-P3-003 - VID2.mp4", "CP-P1-P3-003 - VID1.mp4"]  # VID1 mal prefijado
    assert sorted(names, key=_vid_sort_key) == [
        "CP-P1-P3-003 - VID1.mp4", "CP-L1-P3-003 - VID2.mp4",
    ]


# ─────────────────────────── dry-run local (sin DB ni R2) ───────────────────────────


def test_run_local_dry_run_counts_units(tmp_path: Path) -> None:
    sub = tmp_path / "CP-L1-P2-002"
    sub.mkdir()
    (sub / "doc.txt").write_text(_FIXTURE.read_text(encoding="utf-8"), encoding="utf-8")
    (sub / "CP-L1-P2-002 - VID1.mp4").write_bytes(b"\x00" * 1024)
    # sub-folder que no matchea el naming → ignorado
    (tmp_path / "no-una-unit").mkdir()

    import argparse

    args = argparse.Namespace(
        root_folder_id="x", only=None, dry_run=True,
        local_folder=str(tmp_path), skip_drive_download=True, no_publish=False,
        skip_upload=False, skip_existing=False, update_existing=False,
    )
    stats = run(args)
    assert stats.folders == 1
    assert stats.mp4s == 1
    assert stats.published == 0 and stats.drafts == 0 and stats.failed == 0


# ─────────────────── unit.json como fuente de verdad (D3-D6) ───────────────────


def test_parse_unit_json_text_ok_and_tolerates_bom() -> None:
    assert parse_unit_json_text('\ufeff{"slug": "hg-rc-001-x"}')["slug"] == "hg-rc-001-x"


@pytest.mark.parametrize("bad", ["no es json", "[1, 2]", '{"title": "sin slug"}'])
def test_parse_unit_json_text_rejects_bad(bad: str) -> None:
    with pytest.raises(UnitDictError):
        parse_unit_json_text(bad)


def test_code_from_unit_json_general_level_and_null_pillar() -> None:
    # D3: dimension_code poblado, pillar null, level GENERAL → L1; RC → RE.
    code = code_from_unit_json({
        "slug": "hg-rc-004-escribir-sin-motivo", "dimension_code": "RC",
        "pillar_code": None, "level_code": "GENERAL",
    })
    assert code == UnitCode("RE", 1, None, 4)


@pytest.mark.parametrize(
    "dim,expected", [("SB", "SA"), ("PI", "PI"), ("EM", "ES"), ("PR", "PR")]
)
def test_code_from_unit_json_normalizes_dimensions(dim: str, expected: str) -> None:
    code = code_from_unit_json({
        "slug": f"hg-{dim.lower()}-002-x", "dimension_code": dim, "level_code": "GENERAL",
    })
    assert code.dimension == expected


def test_code_from_unit_json_number_from_slug_zero_and_state_slug() -> None:
    assert code_from_unit_json(
        {"slug": "hg-sb-000-el-caso", "dimension_code": "SB", "level_code": "GENERAL"}
    ).number == 0
    assert code_from_unit_json(
        {"slug": "hg-pr-v0-001-x", "dimension_code": "PR", "level_code": "L1"}
    ).number == 1


def test_code_from_unit_json_explicit_unit_number_wins() -> None:
    code = code_from_unit_json(
        {"slug": "hg-rc-001-x", "dimension_code": "RC", "level_code": "GENERAL", "unit_number": 7}
    )
    assert code.number == 7


@pytest.mark.parametrize(
    "js",
    [
        {"slug": "hg-rc-001-x", "level_code": "GENERAL"},  # sin dimension_code
        {"slug": "hg-rc-001-x", "dimension_code": "RC", "level_code": "V0"},  # nivel no normalizable
        {"slug": "hg-rc-001-x", "dimension_code": "RC"},  # sin level_code
        {"slug": "sin-numero", "dimension_code": "RC", "level_code": "GENERAL"},
    ],
)
def test_code_from_unit_json_rejects_insufficient(js: dict) -> None:
    with pytest.raises(UnitDictError):
        code_from_unit_json(js)


def test_run_local_dry_run_reads_unit_json_for_general_dimension(tmp_path: Path) -> None:
    import argparse
    import json

    # Carpeta sin código en el nombre ni en el MP4; sólo unit.json + MP4.
    folder = tmp_path / "hg-rc-001-un-vinculo"
    folder.mkdir()
    (folder / "unit.json").write_text(json.dumps({
        "slug": "hg-rc-001-un-vinculo", "title": "T", "dimension_code": "RC",
        "pillar_code": None, "level_code": "GENERAL", "blocks": [],
    }))
    (folder / "video.mp4").write_bytes(b"x")
    stats = run(argparse.Namespace(
        root_folder_id="x", only=None, dry_run=True, local_folder=str(tmp_path),
        skip_drive_download=True, no_publish=False, skip_upload=False, skip_existing=False, update_existing=False,
    ))
    assert (stats.folders, stats.failed, stats.mp4s) == (1, 0, 1)


def test_run_local_dry_run_update_existing_marks_new_unit_without_db_write(tmp_path: Path) -> None:
    import argparse
    import json

    folder = tmp_path / "hg-rc-777-solo-dry-run"
    folder.mkdir()
    (folder / "unit.json").write_text(json.dumps({
        "slug": "hg-rc-777-solo-dry-run", "title": "T", "dimension_code": "RC",
        "level_code": "GENERAL", "blocks": [],
    }))
    (folder / "video.mp4").write_bytes(b"x")
    stats = run(argparse.Namespace(
        root_folder_id="x", only=None, dry_run=True, local_folder=str(tmp_path),
        skip_drive_download=True, no_publish=False, skip_upload=False, skip_existing=False,
        update_existing=True,
    ))
    # unit nueva en dry-run: se reporta, no se actualiza ni se falla
    assert (stats.folders, stats.failed, stats.updated) == (1, 0, 0)


def test_run_skip_folder_excludes_named_folder(tmp_path: Path) -> None:
    import argparse
    import json

    for name, slug in [("hg-rc-771-a", "hg-rc-771-a"), ("hg-rc-772-b", "hg-rc-772-b")]:
        d = tmp_path / name
        d.mkdir()
        (d / "unit.json").write_text(json.dumps({
            "slug": slug, "title": "T", "dimension_code": "RC", "level_code": "GENERAL", "blocks": [],
        }))
        (d / "v.mp4").write_bytes(b"x")
    stats = run(argparse.Namespace(
        root_folder_id="x", only=None, dry_run=True, local_folder=str(tmp_path),
        skip_drive_download=True, no_publish=False, skip_upload=False, skip_existing=False,
        update_existing=False, skip_folder=["hg-rc-772-b"],
    ))
    assert (stats.folders, stats.skipped) == (1, 1)
