import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MarkdownBody } from "../MarkdownBody";

describe("MarkdownBody", () => {
  it("renders bold, italic and ==highlight== with the right tags", () => {
    render(<MarkdownBody>{"Un **negrita**, una *itálica* y un ==resaltado=="}</MarkdownBody>);
    expect(screen.getByText("negrita").tagName).toBe("STRONG");
    expect(screen.getByText("itálica").tagName).toBe("EM");
    expect(screen.getByText("resaltado").tagName).toBe("MARK");
  });

  it("renders GFM lists and blockquotes", () => {
    render(<MarkdownBody>{"> Lo que se mide, se mejora.\n\n- uno\n- dos\n- tres"}</MarkdownBody>);
    expect(screen.getByText(/Lo que se mide/).closest("blockquote")).not.toBeNull();
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  it("does not execute raw HTML (XSS-safe: no rehype-raw)", () => {
    render(<MarkdownBody>{"<script>alert('x')</script> texto seguro"}</MarkdownBody>);
    expect(document.querySelector("script")).toBeNull();
    expect(screen.getByText(/texto seguro/)).toBeTruthy();
  });

  it("renders links with target=_blank and rel=noreferrer", () => {
    render(<MarkdownBody>{"Ver [fuente](https://example.com/x)"}</MarkdownBody>);
    const link = screen.getByRole("link", { name: "fuente" });
    expect(link.getAttribute("href")).toBe("https://example.com/x");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toContain("noreferrer");
  });
});
