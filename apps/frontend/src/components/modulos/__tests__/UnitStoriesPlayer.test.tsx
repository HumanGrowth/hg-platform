import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { UnitStoriesPlayer } from "../UnitStoriesPlayer";
import type { LearningUnitAttempt, LearningUnitDetail } from "@/lib/types";

const { completeBlock, getModulosFeed } = vi.hoisted(() => ({
  completeBlock: vi.fn(),
  getModulosFeed: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  apiCompleteBlock: completeBlock,
  apiSubmitQuiz: vi.fn(),
  apiSubmitReflection: vi.fn(),
  apiGetModulosFeed: getModulosFeed,
}));

// duration_seconds >= 30 para que el auto-advance quede OFF por default y no
// interfiera con la navegación manual que dispara este test.
const unit: LearningUnitDetail = {
  id: "u1", slug: "test-unit", title: "Unit de prueba", pillar_code: "P1",
  competency_code: null, level_code: "L1", mentor_id: null, published_at: null,
  estimated_duration_seconds: 60,
  blocks: [
    {
      id: "block-a", position: 1, required: true, block_type: "video_intro",
      youtube_video_id: "dQw4w9WgXcQ", poster_url: null, duration_seconds: 45,
      subtitle_url: null, transcript_text: null, eyebrow_label: null,
    },
    {
      id: "block-b", position: 2, required: true, block_type: "video_closing",
      youtube_video_id: "dQw4w9WgXcQ", poster_url: null, duration_seconds: 45,
      subtitle_url: null, transcript_text: null, eyebrow_label: null,
    },
  ],
};

const attempt: LearningUnitAttempt = {
  id: "a1", unit_id: "u1", started_at: new Date().toISOString(), completed_at: null,
  block_progress: [],
};

beforeEach(() => {
  completeBlock.mockReset();
  getModulosFeed.mockReset();
  getModulosFeed.mockResolvedValue({ hero: null, next: [] });
});

describe("UnitStoriesPlayer navigation", () => {
  it("blocks advancing past a required block until it's completed", async () => {
    completeBlock.mockResolvedValue({ unit_block_id: "block-a", status: "completed", submitted_at: null });
    const onComplete = vi.fn();
    const onClose = vi.fn();
    render(<UnitStoriesPlayer unit={unit} attempt={attempt} onComplete={onComplete} onClose={onClose} />);

    // Bloque A activo: tap-next no debería avanzar (required, sin completar).
    fireEvent.click(screen.getByLabelText("Siguiente bloque"));
    expect(screen.getByText("Ya lo vi")).toBeTruthy(); // seguimos en el mismo bloque

    // Completar bloque A habilita avanzar.
    fireEvent.click(screen.getByText("Ya lo vi"));
    await waitFor(() => expect(completeBlock).toHaveBeenCalledWith("test-unit", "block-a"));

    fireEvent.click(screen.getByLabelText("Siguiente bloque"));
    // Seguimos viendo "Ya lo vi" (bloque B, video también) pero ahora es un
    // bloque distinto — confirmamos vía la llamada a completeBlock con el
    // nuevo id cuando lo marquemos.
    fireEvent.click(screen.getByText("Ya lo vi"));
    await waitFor(() => expect(completeBlock).toHaveBeenCalledWith("test-unit", "block-b"));
  });

  it("shows UnitCompletionCard after completing the last required block", async () => {
    completeBlock.mockImplementation(async (_slug: string, blockId: string) => ({
      unit_block_id: blockId, status: "completed", submitted_at: null,
    }));
    render(
      <UnitStoriesPlayer unit={unit} attempt={attempt} onComplete={vi.fn()} onClose={vi.fn()} />,
    );

    fireEvent.click(screen.getByText("Ya lo vi"));
    await waitFor(() => expect(completeBlock).toHaveBeenCalledWith("test-unit", "block-a"));
    fireEvent.click(screen.getByLabelText("Siguiente bloque"));

    fireEvent.click(screen.getByText("Ya lo vi"));
    await waitFor(() => expect(completeBlock).toHaveBeenCalledWith("test-unit", "block-b"));
    fireEvent.click(screen.getByLabelText("Siguiente bloque"));

    await screen.findByText("Módulo completado");
    expect(screen.getByText("2/2 pasos · ~1 min")).toBeTruthy();
  });

  it("goPrev navigates back to the previous block", async () => {
    completeBlock.mockResolvedValue({ unit_block_id: "block-a", status: "completed", submitted_at: null });
    render(<UnitStoriesPlayer unit={unit} attempt={attempt} onComplete={vi.fn()} onClose={vi.fn()} />);

    fireEvent.click(screen.getByText("Ya lo vi"));
    await waitFor(() => expect(completeBlock).toHaveBeenCalled());
    fireEvent.click(screen.getByLabelText("Siguiente bloque"));

    fireEvent.click(screen.getByLabelText("Bloque anterior"));
    // De vuelta en bloque A, ya completado → el botón "Ya lo vi" no vuelve a
    // aparecer (isCompleted true para ese bloque).
    expect(screen.getByText("Visto")).toBeTruthy();
  });
});
