import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { BlockRenderer } from "../BlockRenderer";
import type { Block } from "@/lib/types";

const noop = vi.fn(async () => {});
const noopQuiz = vi.fn(async () => ({ results: [], block_completed: true }));
const noopReflection = vi.fn(async () => {});

const handlers = {
  isCompleted: false,
  onCompleteBlock: noop,
  onSubmitQuiz: noopQuiz,
  onSubmitReflection: noopReflection,
};

const videoBlock: Block = {
  id: "b1",
  position: 1,
  required: true,
  block_type: "video_intro",
  video_url: "https://cdn.example.com/v.mp4",
  poster_url: null,
  duration_seconds: 10,
  subtitle_url: null,
  transcript_text: null,
  eyebrow_label: "INTRO",
};

const textBlock: Block = {
  id: "b2",
  position: 2,
  required: true,
  block_type: "text_context",
  variant: "context",
  eyebrow: "SITUACIÓN",
  body: "Cuerpo del bloque de texto.",
  citation: null,
  applies_to: null,
  requires_evidence_block_id: null,
};

const quizBlock: Block = {
  id: "b3",
  position: 3,
  required: true,
  block_type: "quiz_recall",
  eyebrow: "COMPROBÁ TU COMPRENSIÓN",
  questions: [
    {
      id: "q1",
      position: 1,
      prompt: "¿Pregunta?",
      question_type: "single_choice",
      options: [
        { id: "o1", position: 1, text: "a" },
        { id: "o2", position: 2, text: "b" },
      ],
    },
  ],
};

const reflectionBlock: Block = {
  id: "b4",
  position: 4,
  required: true,
  block_type: "reflection_write",
  eyebrow: "APLICALO",
  prompt: "¿Qué vas a hacer?",
  min_chars: 10,
  max_chars: 500,
  example: null,
};

describe("BlockRenderer", () => {
  it("renders VideoBlockView for video_intro/video_teaching/video_closing as a native <video>, not <iframe>", () => {
    render(<BlockRenderer block={videoBlock} {...handlers} />);
    const video = screen.getByTitle("Video del módulo");
    expect(video.tagName).toBe("VIDEO");
    expect(video.getAttribute("src")).toBe("https://cdn.example.com/v.mp4");
    expect(document.querySelector("iframe")).toBeNull();
    // Player full-bleed (player-01): controles custom, sin botón "Ya lo vi" ni controls nativos.
    expect(video.hasAttribute("controls")).toBe(false);
    expect(screen.queryByText("Ya lo vi")).toBeNull();
  });

  it("renders TextBlockView for text_context/text_evidence/text_solution", () => {
    render(<BlockRenderer block={textBlock} {...handlers} />);
    expect(screen.getByText("Cuerpo del bloque de texto.")).toBeTruthy();
    expect(screen.getByText("SITUACIÓN")).toBeTruthy();
  });

  it("renders QuizBlockView for quiz_recall", () => {
    render(<BlockRenderer block={quizBlock} {...handlers} />);
    expect(screen.getByText("¿Pregunta?")).toBeTruthy();
  });

  it("renders ReflectionBlockView for reflection_write", () => {
    render(<BlockRenderer block={reflectionBlock} {...handlers} />);
    expect(screen.getByText("¿Qué vas a hacer?")).toBeTruthy();
    expect(screen.getByPlaceholderText("Escribí tu reflexión…")).toBeTruthy();
  });
});
