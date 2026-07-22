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
      video_url: "https://cdn.example.com/v.mp4", poster_url: null, duration_seconds: 45,
      subtitle_url: null, transcript_text: null, eyebrow_label: null,
    },
    {
      id: "block-b", position: 2, required: true, block_type: "video_closing",
      video_url: "https://cdn.example.com/v.mp4", poster_url: null, duration_seconds: 45,
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

// El player full-bleed (player-01) completa el bloque de video on `ended`
// (sin botón "Ya lo vi"). Los tests usan los args de completeBlock (block-a /
// block-b) como fuente de verdad de en qué bloque estamos.
function endVideo() {
  fireEvent.ended(screen.getByTitle("Video del módulo"));
}

describe("UnitStoriesPlayer navigation", () => {
  it("blocks advancing past a required block until it's completed", async () => {
    completeBlock.mockResolvedValue({ unit_block_id: "block-a", status: "completed", submitted_at: null });
    render(<UnitStoriesPlayer unit={unit} attempt={attempt} onComplete={vi.fn()} onClose={vi.fn()} />);

    // Bloque A activo (required, sin completar): tap-next no debe avanzar. Si
    // avanzara, el ended siguiente completaría block-b — al completar block-a
    // confirmamos que seguimos en A.
    fireEvent.click(screen.getByLabelText("Siguiente bloque"));
    endVideo();
    await waitFor(() => expect(completeBlock).toHaveBeenCalledWith("test-unit", "block-a"));
    expect(completeBlock).not.toHaveBeenCalledWith("test-unit", "block-b");

    // Ahora sí avanza a B; completarlo dispara completeBlock con el nuevo id.
    fireEvent.click(screen.getByLabelText("Siguiente bloque"));
    endVideo();
    await waitFor(() => expect(completeBlock).toHaveBeenCalledWith("test-unit", "block-b"));
  });

  it("shows UnitCompletionCard after completing the last required block", async () => {
    completeBlock.mockImplementation(async (_slug: string, blockId: string) => ({
      unit_block_id: blockId, status: "completed", submitted_at: null,
    }));
    render(<UnitStoriesPlayer unit={unit} attempt={attempt} onComplete={vi.fn()} onClose={vi.fn()} />);

    endVideo();
    await waitFor(() => expect(completeBlock).toHaveBeenCalledWith("test-unit", "block-a"));
    fireEvent.click(screen.getByLabelText("Siguiente bloque"));

    endVideo();
    await waitFor(() => expect(completeBlock).toHaveBeenCalledWith("test-unit", "block-b"));
    fireEvent.click(screen.getByLabelText("Siguiente bloque"));

    await screen.findByText("Módulo completado");
    expect(screen.getByText("2/2 pasos · ~1 min")).toBeTruthy();
  });

  it("goPrev navigates back to the previous block", async () => {
    completeBlock.mockResolvedValue({ unit_block_id: "block-a", status: "completed", submitted_at: null });
    render(<UnitStoriesPlayer unit={unit} attempt={attempt} onComplete={vi.fn()} onClose={vi.fn()} />);

    endVideo();
    await waitFor(() => expect(completeBlock).toHaveBeenCalledWith("test-unit", "block-a"));
    fireEvent.click(screen.getByLabelText("Siguiente bloque")); // → bloque B

    fireEvent.click(screen.getByLabelText("Bloque anterior")); // ← vuelta a A
    // De vuelta en A (ya completado): un `ended` no vuelve a llamar a
    // completeBlock (isCompleted), y nunca se completó block-b.
    endVideo();
    await Promise.resolve();
    expect(completeBlock).toHaveBeenCalledTimes(1);
    expect(completeBlock).not.toHaveBeenCalledWith("test-unit", "block-b");
  });
});
