import { describe, expect, it } from "vitest";

import type { Block, BlockPresentation, TextBlock } from "@/lib/types";

import { hasPresentation, resolveTextTemplate, templateFor } from "../registry";

function text(overrides: Partial<TextBlock> & { presentation?: BlockPresentation | null }): TextBlock {
  return {
    id: "t",
    position: 1,
    required: false,
    block_type: "text_context",
    variant: "context",
    eyebrow: "E",
    body: "Un cuerpo cualquiera.",
    citation: null,
    applies_to: null,
    requires_evidence_block_id: null,
    hero_stat: null,
    checklist_items: null,
    ...overrides,
  };
}
const evidence = (o: Partial<TextBlock> = {}) =>
  text({ block_type: "text_evidence", variant: "evidence", ...o });
const solution = (o: Partial<TextBlock> = {}) =>
  text({ block_type: "text_solution", variant: "solution", ...o });

describe("templateFor · auto-detect (sin template explícito)", () => {
  it("text_context → editorial", () => {
    expect(templateFor(text({}))).toBe("editorial");
    expect(templateFor(text({ body: "> una cita" }))).toBe("editorial");
  });

  describe("text_evidence", () => {
    it("hero_stat explícito → stat", () => {
      const b = evidence({ hero_stat: { value: "79%", label: "x", source: null } });
      expect(templateFor(b)).toBe("stat");
    });
    it("[[stat: V · L]] inline → stat", () => {
      expect(templateFor(evidence({ body: "Mirá [[stat: 47% · de equipos]] esto" }))).toBe("stat");
    });
    it("pull_quote → quote", () => {
      const b = evidence({ presentation: { tone: "green", pull_quote: { text: "Frase" } } });
      expect(templateFor(b)).toBe("quote");
    });
    it("cita dominante (body arranca con >) → quote", () => {
      expect(templateFor(evidence({ body: "> Lo que se mide, se mejora." }))).toBe("quote");
    });
    it("`>>` headline NO es cita dominante", () => {
      expect(templateFor(evidence({ body: ">> Un titular sin números" }))).toBe("editorial");
    });
    it("número en el cuerpo (mismo criterio del look actual) → stat", () => {
      expect(templateFor(evidence({ body: "El 79% de las renuncias eran evitables." }))).toBe("stat");
    });
    it("hero_stat gana sobre pull_quote", () => {
      const b = evidence({
        hero_stat: { value: "1", label: "x", source: null },
        presentation: { pull_quote: { text: "q" } },
      });
      expect(templateFor(b)).toBe("stat");
    });
    it("sin señales → editorial", () => {
      expect(templateFor(evidence({ body: "Solo prosa, sin datos." }))).toBe("editorial");
    });
  });

  describe("text_solution", () => {
    it("checklist_items → steps", () => {
      expect(templateFor(solution({ checklist_items: [{ title: "a", detail: null }] }))).toBe("steps");
    });
    it("lista 1. 2. 3. en el cuerpo → steps", () => {
      expect(templateFor(solution({ body: "Antes de reaccionar:\n1. Frená\n2. Respirá\n3. Elegí" }))).toBe("steps");
    });
    it("acción corta sin lista → tip", () => {
      expect(templateFor(solution({ body: "Escribí la única decisión que debe salir de la reunión." }))).toBe("tip");
    });
    it("texto largo sin lista → editorial", () => {
      expect(templateFor(solution({ body: "palabra ".repeat(60) }))).toBe("editorial");
    });
  });

  it("quiz → interactive · reflection → quote · video_* → video", () => {
    const quiz = { block_type: "quiz_recall" } as Block;
    const refl = { block_type: "reflection_write" } as Block;
    expect(templateFor(quiz)).toBe("interactive");
    expect(templateFor(refl)).toBe("quote");
    for (const t of ["video_intro", "video_teaching", "video_closing"] as const) {
      expect(templateFor({ block_type: t } as Block)).toBe("video");
    }
  });
});

describe("templateFor · template explícito", () => {
  it("fuerza la plantilla aunque las señales digan otra cosa", () => {
    const b = evidence({
      hero_stat: { value: "79%", label: "x", source: null },
      presentation: { template: "quote" },
    });
    expect(templateFor(b)).toBe("quote");
    expect(templateFor(text({ presentation: { template: "steps" } }))).toBe("steps");
    expect(templateFor(solution({ presentation: { template: "editorial" }, checklist_items: [{ title: "a", detail: null }] }))).toBe("editorial");
  });

  it("template no implementado (announce/data) cae al auto-detect al renderizar", () => {
    const b = evidence({ hero_stat: { value: "9", label: "x", source: null }, presentation: { template: "announce" } });
    expect(templateFor(b)).toBe("announce");
    expect(resolveTextTemplate(b)).toBe("stat");
  });
});

describe("hasPresentation", () => {
  it("false para ausente / null / {} / sólo nulls (unidades ya creadas)", () => {
    expect(hasPresentation(text({}))).toBe(false);
    expect(hasPresentation(text({ presentation: null }))).toBe(false);
    expect(hasPresentation(text({ presentation: {} }))).toBe(false);
    expect(hasPresentation(text({ presentation: { template: null, tone: null } }))).toBe(false);
  });
  it("true con cualquier tag", () => {
    expect(hasPresentation(text({ presentation: { tone: "green" } }))).toBe(true);
    expect(hasPresentation(text({ presentation: { pull_quote: { text: "x" } } }))).toBe(true);
  });
  it("false para bloques que no tienen el campo (quiz/video)", () => {
    expect(hasPresentation({ block_type: "quiz_recall" } as Block)).toBe(false);
  });
});
