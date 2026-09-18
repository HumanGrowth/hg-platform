import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MarkdownBody } from "../MarkdownBody";

/** Textos SIN marcadores sociales: no deben alterarse (ni un nodo `hg-*`). */
const PLAIN_CORPUS = [
  "Texto simple sin nada especial.",
  "Un **negrita**, una *itálica* y un ==resaltado== y ~~tachado~~.",
  "> Lo que se mide, se mejora.\n\nDrucker",
  "1. Frená\n2. Respirá\n3. Elegí",
  "Ver https://example.com/a//b y http://foo.org//x//y para más.",
  "Fracción 1/2 // 3/4 y una ruta C://temp//x",
  "Corchetes [[no es stat]] y [stat: 47% · x] tampoco.",
  ">>sin espacio no es headline",
  "Un // suelto y otro // suelto.",
];

describe("MarkdownBody · marcadores sociales (regresión: texto sin marcadores intacto)", () => {
  for (const text of PLAIN_CORPUS) {
    it(`no altera: ${JSON.stringify(text).slice(0, 48)}`, () => {
      const { container } = render(<MarkdownBody>{text}</MarkdownBody>);
      // Los marcadores generan <small>, texto Anton (font-display) o un stat: ninguno
      // debe aparecer en un texto sin marcadores.
      expect(container.querySelector("small, [class*='font-display'], .flex-col")).toBeNull();
    });
  }

  it("`>>` sin espacio se deja como blockquote anidado (comportamiento previo)", () => {
    const { container } = render(<MarkdownBody>{">>sin espacio"}</MarkdownBody>);
    expect(container.querySelector("blockquote blockquote")).not.toBeNull();
  });

  it("preserva el texto literal de `//` y `[[...]]` que no son marcadores", () => {
    const { container } = render(<MarkdownBody>{"Fracción 1/2 // 3/4 y [[no es stat]]"}</MarkdownBody>);
    expect(container.textContent).toContain("1/2 // 3/4");
    expect(container.textContent).toContain("[[no es stat]]");
  });

  it("URLs con // siguen siendo links y no se rompen", () => {
    render(<MarkdownBody>{"Fuente https://example.com/a//b//c fin"}</MarkdownBody>);
    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe("https://example.com/a//b//c");
    expect(link.textContent).toBe("https://example.com/a//b//c");
  });

  it("URL en un link markdown con // en el texto tampoco se parsea", () => {
    render(<MarkdownBody>{"[//no caption//](https://example.com)"}</MarkdownBody>);
    expect(screen.getByRole("link").textContent).toBe("//no caption//");
  });
});

describe("MarkdownBody · marcadores sociales (parseo)", () => {
  it("`>> texto` → headline display (Anton), no blockquote", () => {
    const { container } = render(<MarkdownBody>{">> No se van por el sueldo.\n\nCuerpo normal."}</MarkdownBody>);
    const headline = screen.getByText("No se van por el sueldo.");
    expect(headline.tagName).toBe("P");
    expect(headline.className).toContain("font-display");
    expect(headline.className).toContain("uppercase");
    expect(container.querySelector("blockquote")).toBeNull();
    expect(screen.getByText("Cuerpo normal.").className).not.toContain("font-display");
  });

  it("el headline conserva marcadores inline (==mark==)", () => {
    render(<MarkdownBody>{">> Se van por cómo se sienten. ==Era evitable=="}</MarkdownBody>);
    expect(screen.getByText("Era evitable").tagName).toBe("MARK");
    // dentro del headline el énfasis es por color (no caja) — ver headlineMark
    expect(screen.getByText(/Se van por/).className).toContain("[&_mark]:bg-transparent");
  });

  it("`>` simple sigue siendo blockquote (no headline)", () => {
    const { container } = render(<MarkdownBody>{"> una cita"}</MarkdownBody>);
    expect(container.querySelector("blockquote")).not.toBeNull();
    expect(container.querySelector("[class*='font-display']")).toBeNull();
  });

  it("`[[stat: VALUE · LABEL]]` → hero-stat inline", () => {
    render(<MarkdownBody>{"Antes. [[stat: 47% · de los equipos]] Después."}</MarkdownBody>);
    const value = screen.getByText("47%");
    expect(value.className).toContain("font-display");
    expect(screen.getByText("de los equipos")).toBeTruthy();
  });

  it("`//texto//` → caption chica", () => {
    render(<MarkdownBody>{"El dato. //Fuente: WEF, 2025//"}</MarkdownBody>);
    const cap = screen.getByText("Fuente: WEF, 2025");
    expect(cap.tagName).toBe("SMALL");
    expect(cap.className).toContain("text-xs");
  });

  it("variant onDark re-colorea (no usa tokens theme-aware)", () => {
    render(<MarkdownBody variant="onDark">{"Un **fuerte** y ==marca=="}</MarkdownBody>);
    expect(screen.getByText("fuerte").className).toContain("text-hg-cream");
    expect(screen.getByText("marca").className).toContain("bg-hg-amber");
  });

  it("emphasis bold agranda el headline", () => {
    render(<MarkdownBody emphasis="bold">{">> Titular"}</MarkdownBody>);
    expect(screen.getByText("Titular").className).toContain("text-5xl");
  });
});
