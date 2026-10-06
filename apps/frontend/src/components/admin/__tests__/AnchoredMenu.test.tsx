import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AnchoredMenu } from "../AnchoredMenu";

function anchorAt(rect: Partial<DOMRect>): HTMLElement {
  const el = document.createElement("button");
  el.getBoundingClientRect = () => rect as DOMRect;
  return el;
}

describe("AnchoredMenu", () => {
  it("se renderiza en un portal en body, debajo del toggle y alineado a su borde", () => {
    const anchor = anchorAt({ top: 100, bottom: 130, left: 300, right: 400, width: 100, height: 30 });
    const { container } = render(
      <div style={{ transform: "translateX(0)" }}>
        <AnchoredMenu anchor={anchor} open onClose={vi.fn()} width={176} label="Menú">
          <span>opción</span>
        </AnchoredMenu>
      </div>,
    );
    const menu = screen.getByRole("menu");
    // Fuera de cualquier contenedor que cree un containing block.
    expect(container.contains(menu)).toBe(false);
    expect(menu.style.top).toBe("134px"); // bottom + 4
    expect(menu.style.left).toBe("300px");
  });

  it("align=right alinea el borde derecho del menú con el del toggle", () => {
    const anchor = anchorAt({ top: 10, bottom: 40, left: 700, right: 760, width: 60, height: 30 });
    render(
      <AnchoredMenu anchor={anchor} open onClose={vi.fn()} width={200} align="right">
        <span>x</span>
      </AnchoredMenu>,
    );
    expect(screen.getByRole("menu").style.left).toBe("560px"); // right - width
  });

  it("no renderiza nada cerrado", () => {
    render(
      <AnchoredMenu anchor={null} open={false} onClose={vi.fn()} width={100}>
        <span>x</span>
      </AnchoredMenu>,
    );
    expect(screen.queryByRole("menu")).toBeNull();
  });
});
