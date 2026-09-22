import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { BlockRenderer } from "../BlockRenderer";
import { isPillarMarkBlock } from "../blocks/pillar-mark-context";
import { SegmentedProgress } from "../SegmentedProgress";
import { UnitBackToBackPlayer } from "../UnitBackToBackPlayer";
import { UnitOpeningScreen } from "../UnitOpeningScreen";
import { UnitStoriesPlayer } from "../UnitStoriesPlayer";
import type { Block, LearningUnitAttempt, LearningUnitDetail } from "@/lib/types";

vi.mock("@/lib/motion/useShouldAnimate", () => ({ useShouldAnimate: () => false }));

const video = (id: string): Block => ({
  id, position: 1, required: false, block_type: "video_intro", video_url: "https://x/v.mp4",
  poster_url: null, duration_seconds: 5, subtitle_url: null, transcript_text: null, eyebrow_label: "V", chapters: null,
});
const textBlock = (id: string, eyebrow: string): Block => ({
  id, position: 2, required: false, block_type: "text_context", variant: "context", eyebrow, body: "Cuerpo.",
  citation: null, applies_to: null, requires_evidence_block_id: null, hero_stat: null, checklist_items: null,
});
const blocks: Block[] = [video("v"), textBlock("t1", "PRIMERO"), textBlock("t2", "SEGUNDO")];

const unit: LearningUnitDetail = {
  id: "u", slug: "u", title: "Unidad", dimension_code: "CP", pillar_code: null, unit_number: 1, competency_code: null,
  level_code: "L1", mentor_id: null, published_at: null, estimated_duration_seconds: 300, narrative_tone: null,
  keywords: null, blocks,
};
const done = blocks.map((b) => ({ unit_block_id: b.id, status: "completed" as const, submitted_at: null }));
const attempt: LearningUnitAttempt = { id: "a", unit_id: "u", started_at: null, completed_at: null, block_progress: done };

const handlers = {
  isCompleted: true,
  onCompleteBlock: vi.fn(async () => {}),
  onSubmitQuiz: vi.fn(async () => ({ results: [], block_completed: true })),
  onSubmitReflection: vi.fn(async () => {}),
};

// El header decorativo grande es el único SVG hijo directo de un span aria-hidden.shrink-0
const pillarMark = (c: HTMLElement) => c.querySelector("span[aria-hidden].shrink-0 > svg");

describe("Fase 5 · un solo nivel de encabezado (metáfora del pilar sólo en el primer bloque)", () => {
  it("BlockRenderer: por defecto muestra la metáfora (comportamiento histórico)", () => {
    const { container } = render(<BlockRenderer block={blocks[1]} dimensionCode="CP" {...handlers} />);
    expect(pillarMark(container)).not.toBeNull();
  });

  it("BlockRenderer con showPillarMark=false la oculta y conserva el eyebrow del bloque", () => {
    const { container } = render(
      <BlockRenderer block={blocks[2]} dimensionCode="CP" showPillarMark={false} {...handlers} />,
    );
    expect(pillarMark(container)).toBeNull();
    expect(screen.getByText("SEGUNDO")).toBeTruthy();
  });

  it("isPillarMarkBlock: el primero que NO es video; sin bloques de pantalla → sí", () => {
    expect(isPillarMarkBlock(blocks, 0)).toBe(false); // video
    expect(isPillarMarkBlock(blocks, 1)).toBe(true);
    expect(isPillarMarkBlock(blocks, 2)).toBe(false);
    expect(isPillarMarkBlock([video("v")], 0)).toBe(true);
  });

  it("player mobile: 1º bloque de pantalla con metáfora, el siguiente sin ella", () => {
    const { container } = render(<UnitStoriesPlayer unit={{ ...unit, blocks: blocks.slice(1) }} attempt={attempt} onClose={() => {}} />);
    expect(screen.getByText("PRIMERO")).toBeTruthy();
    expect(pillarMark(container)).not.toBeNull();
    fireEvent.click(screen.getByLabelText("Siguiente bloque"));
    expect(screen.getByText("SEGUNDO")).toBeTruthy();
    expect(pillarMark(container)).toBeNull();
  });

  it("player desktop: idem", () => {
    const { container } = render(<UnitBackToBackPlayer unit={{ ...unit, blocks: blocks.slice(1) }} attempt={attempt} onClose={() => {}} />);
    expect(pillarMark(container)).not.toBeNull();
    fireEvent.click(screen.getByText(/Siguiente/));
    expect(pillarMark(container)).toBeNull();
  });
});

describe("Fases 1-4 · chrome glass de los players", () => {
  it("SegmentedProgress: mismo alto y lógica de activo en ambos players (track .glass-track, h-1.5)", () => {
    const { container } = render(<SegmentedProgress blocks={blocks} blockProgress={[done[0]]} currentIndex={1} />);
    const tracks = container.querySelectorAll(".glass-track");
    expect(tracks).toHaveLength(3);
    tracks.forEach((t) => expect(t.className).toContain("h-1.5"));
    const fills = [...tracks].map((t) => t.firstElementChild!.className);
    expect(fills[0]).toContain("w-full");
    expect(fills[1]).toContain("w-1/2");
    expect(fills[1]).not.toContain("opacity"); // el activo ya no baja la opacidad en desktop
    expect(fills[2]).toContain("w-0");
  });

  it("player mobile: fondo ambiental (sin bg-bg plano) y X como chip glass", () => {
    const { container } = render(<UnitStoriesPlayer unit={unit} attempt={attempt} onClose={() => {}} />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain("glass-ambient");
    expect(root.className).not.toContain("bg-bg");
    const close = screen.getByLabelText("Cerrar");
    expect(close.className).toContain("glass-fill");
    expect(close.className).not.toContain("hover:bg-bg-sunken");
  });

  it("player desktop: nav en superficie strong, fila activa glass-inset con text-fg, chips glass", () => {
    render(<UnitBackToBackPlayer unit={unit} attempt={attempt} onClose={() => {}} />);
    const nav = screen.getByLabelText("Índice de bloques");
    expect(nav.className).toContain("glass-surface-strong");
    const active = nav.querySelector("[aria-current='step']") as HTMLElement;
    expect(active.className).toContain("glass-inset");
    expect(active.className).toContain("text-fg");
    expect(active.className).not.toContain("bg-hg-green-100");
    expect(screen.getByLabelText("Modo foco").className).toContain("glass-fill");
  });

  it("modo foco desktop: fondo ambiental en vez de bg-bg", () => {
    const { container } = render(<UnitBackToBackPlayer unit={unit} attempt={attempt} onClose={() => {}} />);
    fireEvent.click(screen.getByLabelText("Modo foco"));
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain("glass-ambient");
    expect(root.className).not.toContain("bg-bg");
    expect(screen.getByText("Cerrar").className).toContain("glass-fill");
  });

  it("apertura: fondo ambiental y contenido dentro de glass-surface-strong", () => {
    const { container } = render(<UnitOpeningScreen unit={unit} onStart={() => {}} />);
    expect((container.firstElementChild as HTMLElement).className).toContain("glass-ambient");
    expect(container.querySelector(".glass-surface-strong")).not.toBeNull();
    expect(screen.getByRole("heading", { name: "Unidad" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Comenzar" })).toBeTruthy();
  });
});
