import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { BlockRenderer } from "../../BlockRenderer";
import type { BlockPresentation, TextBlock } from "@/lib/types";

import { resolvePresentation } from "../style";

vi.mock("@/lib/motion/useShouldAnimate", () => ({ useShouldAnimate: () => false }));

const noop = vi.fn(async () => {});
const handlers = {
  isCompleted: false,
  onCompleteBlock: noop,
  onSubmitQuiz: vi.fn(async () => ({ results: [], block_completed: true })),
  onSubmitReflection: noop,
};

function text(overrides: Partial<TextBlock>, presentation?: BlockPresentation | null): TextBlock {
  return {
    id: "t-1",
    position: 2,
    required: false,
    block_type: "text_context",
    variant: "context",
    eyebrow: "EL DATO",
    body: "Cuerpo del bloque.",
    citation: null,
    applies_to: null,
    requires_evidence_block_id: null,
    hero_stat: null,
    checklist_items: null,
    ...(presentation !== undefined ? { presentation } : {}),
    ...overrides,
  };
}

const CITATION = { text: "t", source: "WEF 2025", year: 2025, doi_or_url: "https://wef.org/x", tier: "rct" as const };

function frame(container: HTMLElement) {
  return container.querySelector("[data-template]") as HTMLElement;
}

afterEach(() => vi.clearAllMocks());

describe("BlockRenderer · bloques CON presentation → plantilla social", () => {
  it("stat verde: fondo green, aspect 9:16, número gigante, eyebrow y fuente", () => {
    const block = text(
      {
        block_type: "text_evidence",
        variant: "evidence",
        body: ">> No se van por el sueldo. ==Era evitable==.",
        hero_stat: { value: "79%", label: "de las renuncias evitables", source: "WEF, 2025" },
      },
      { template: "stat", tone: "green" },
    );
    const { container } = render(<BlockRenderer block={block} dimensionCode="CP" {...handlers} />);
    const f = frame(container);
    expect(f.dataset.template).toBe("stat");
    expect(f.dataset.tone).toBe("green");
    expect(f.className).toContain("bg-hg-green");
    expect(f.className).toContain("aspect-[9/16]");
    expect(screen.getByLabelText("79% — de las renuncias evitables").className).toContain("font-display");
    expect(screen.getByText("EL DATO")).toBeTruthy();
    const headline = container.querySelector("p.font-display.uppercase"); // >> headline
    expect(headline?.textContent).toBe("No se van por el sueldo. Era evitable.");
    expect(screen.getByText("Era evitable").tagName).toBe("MARK");
    expect(screen.getByText(/Fuente: WEF, 2025/)).toBeTruthy();
    // sobre verde el accent auto es ámbar (no el verde del pilar, que no se vería)
    expect(screen.getByLabelText("79% — de las renuncias evitables").className).toContain("text-hg-amber");
  });

  it("quote: QuoteMark + pull_quote en display + atribución", () => {
    const block = text(
      { block_type: "text_evidence", variant: "evidence", body: "Contexto de la cita." },
      { template: "quote", pull_quote: { text: "Lo que se mide, se mejora.", attribution: "Peter Drucker" } },
    );
    const { container } = render(<BlockRenderer block={block} dimensionCode="PR" {...handlers} />);
    expect(frame(container).dataset.template).toBe("quote");
    expect(container.querySelector("svg[viewBox='0 0 100 64']")).not.toBeNull(); // QuoteMark
    expect(screen.getByText("Lo que se mide, se mejora.").className).toContain("font-display");
    expect(screen.getByText("— Peter Drucker")).toBeTruthy();
    expect(screen.getByText("Contexto de la cita.")).toBeTruthy();
  });

  it("quote auto-detectado desde `>` del cuerpo (sin pull_quote)", () => {
    const block = text(
      { block_type: "text_evidence", variant: "evidence", body: "> Frase textual del usuario.\n\nAtribución al pie." },
      { tone: "charcoal" },
    );
    const { container } = render(<BlockRenderer block={block} dimensionCode="CP" {...handlers} />);
    expect(frame(container).dataset.template).toBe("quote");
    expect(frame(container).className).toContain("bg-hg-charcoal");
    expect(screen.getByText("Frase textual del usuario.").className).toContain("font-display");
  });

  it("steps: numera checklist_items y auto-detecta la lista del cuerpo", () => {
    const explicit = text(
      { block_type: "text_solution", variant: "solution", checklist_items: [{ title: "Frená", detail: "Un minuto." }, { title: "Respirá", detail: null }] },
      { template: "steps" },
    );
    const { container, unmount } = render(<BlockRenderer block={explicit} dimensionCode="SA" {...handlers} />);
    expect(container.querySelectorAll("ol > li")).toHaveLength(2);
    expect(screen.getByText("Un minuto.")).toBeTruthy();
    unmount();

    const detected = text(
      { block_type: "text_solution", variant: "solution", body: "Antes de reaccionar:\n\n1. Frená\n2. Respirá\n3. Elegí" },
      { tone: "cream" },
    );
    const r2 = render(<BlockRenderer block={detected} dimensionCode="SA" {...handlers} />);
    expect(frame(r2.container).dataset.template).toBe("steps");
    expect(r2.container.querySelectorAll("ol > li")).toHaveLength(3);
    // la lista no se duplica en el cuerpo: sólo queda la intro
    expect(screen.getByText("Antes de reaccionar:")).toBeTruthy();
    expect(screen.getAllByText("Frená")).toHaveLength(1);
  });

  it("tip: HexIcon del pilar de la unit", () => {
    const block = text(
      { block_type: "text_solution", variant: "solution", body: "Escribí la única decisión que debe salir de la reunión." },
      { template: "tip" },
    );
    const { container } = render(<BlockRenderer block={block} dimensionCode="PI" {...handlers} />);
    expect(frame(container).dataset.template).toBe("tip");
    const img = container.querySelector("img") as HTMLImageElement;
    expect(img.getAttribute("src")).toContain("hex-bulb-128");
  });

  it("editorial: eyebrow + cuerpo y MosaicBand por defecto", () => {
    const block = text({}, { format: "feed" });
    const { container } = render(<BlockRenderer block={block} dimensionCode="CP" {...handlers} />);
    const f = frame(container);
    expect(f.dataset.template).toBe("editorial");
    expect(f.className).toContain("aspect-square");
    expect(f.className).toContain("bg-hg-cream"); // tone default
    expect(container.querySelector("[aria-hidden].flex.w-full.overflow-hidden")).not.toBeNull(); // MosaicBand
  });

  it("motif none apaga el MosaicBand; tone dimension usa el hue del pilar", () => {
    const block = text({}, { motif: "none", tone: "dimension" });
    const { container } = render(<BlockRenderer block={block} dimensionCode="CP" {...handlers} />);
    expect(frame(container).className).toContain("bg-dimension-p1");
    expect(container.querySelector("[aria-hidden].flex.w-full.overflow-hidden")).toBeNull();
  });

  it("format wide → 16:9", () => {
    const { container } = render(<BlockRenderer block={text({}, { format: "wide" })} dimensionCode="CP" {...handlers} />);
    expect(frame(container).className).toContain("aspect-video");
  });

  it("template explícito que no aplica degrada sin romper (stat sin dato)", () => {
    const block = text({ body: "Sin ningún número." }, { template: "stat" });
    const { container } = render(<BlockRenderer block={block} dimensionCode="CP" {...handlers} />);
    expect(frame(container).dataset.template).toBe("stat");
    expect(screen.getByText("Sin ningún número.")).toBeTruthy();
  });

  it("conserva el auto-complete a los 3s del look clásico", () => {
    vi.useFakeTimers();
    try {
      render(<BlockRenderer block={text({}, { tone: "green" })} dimensionCode="CP" {...handlers} />);
      expect(noop).not.toHaveBeenCalled();
      act(() => {
        vi.advanceTimersByTime(3100);
      });
      expect(noop).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("resolvePresentation · énfasis y accent", () => {
  const b = text({});
  it("emphasis_level explícito gana sobre narrative_tone", () => {
    expect(resolvePresentation({ ...b, presentation: { emphasis_level: "calm" } }, { narrativeTone: "active" }).emphasis).toBe("calm");
  });
  it("narrative_tone active sube a bold; el resto queda calm", () => {
    const withTag = { ...b, presentation: { tone: "green" as const } };
    expect(resolvePresentation(withTag, { narrativeTone: "active" }).emphasis).toBe("bold");
    expect(resolvePresentation(withTag, { narrativeTone: "contemplative" }).emphasis).toBe("calm");
    expect(resolvePresentation(withTag, {}).emphasis).toBe("calm");
  });
  it("accent auto sobre cream = hue del pilar; explícito gana", () => {
    const cream = { ...b, presentation: { tone: "cream" as const } };
    expect(resolvePresentation(cream, { dimensionCode: "CP" }).accent.text).toBe("text-dimension-p1");
    expect(resolvePresentation(cream, { dimensionCode: "RE" }).accent.text).toBe("text-dimension-p3");
    const orange = { ...b, presentation: { accent: "orange" as const } };
    expect(resolvePresentation(orange, { dimensionCode: "RE" }).accent.text).toContain("orange");
  });
  it("defaults: format story, tone cream", () => {
    const r = resolvePresentation({ ...b, presentation: { motif: "none" } }, { dimensionCode: "CP" });
    expect(r.format).toBe("story");
    expect(r.tone).toBe("cream");
  });
});

describe("BlockRenderer · bloques SIN tags siguen por la vista clásica", () => {
  it("presentation ausente / null / {} → sin marco social", () => {
    for (const presentation of [undefined, null, {}] as const) {
      const { container, unmount } = render(
        <BlockRenderer block={text({}, presentation)} dimensionCode="CP" {...handlers} />,
      );
      expect(container.querySelector("[data-template]")).toBeNull();
      unmount();
    }
  });

  it("narrative_tone bold: el emphasis llega a la plantilla", () => {
    const block = text({ block_type: "text_evidence", variant: "evidence", body: ">> Titular", hero_stat: { value: "9%", label: "x", source: null } }, { template: "stat" });
    render(<BlockRenderer block={block} dimensionCode="CP" narrativeTone="active" {...handlers} />);
    expect(screen.getByText("Titular").className).toContain("text-5xl");
    expect(screen.getByLabelText("9% — x").className).toContain("text-8xl");
  });
});
