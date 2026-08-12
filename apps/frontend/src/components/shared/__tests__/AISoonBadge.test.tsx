import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AISoonBadge } from "../AISoonBadge";

describe("AISoonBadge", () => {
  it("renders the label with a 'Próximamente' tooltip and never captures email", () => {
    const { container } = render(<AISoonBadge variant="pill" label="Chatear con este pilar" />);
    expect(screen.getByText("Chatear con este pilar")).toBeTruthy();
    expect(container.querySelector("[title='Próximamente']")).not.toBeNull();
    // No captura de email: sin inputs ni forms.
    expect(container.querySelector("input")).toBeNull();
    expect(container.querySelector("form")).toBeNull();
  });

  it("renders all three variants", () => {
    for (const variant of ["pill", "inline", "card"] as const) {
      const { container } = render(<AISoonBadge variant={variant} label={`v-${variant}`} />);
      expect(container.textContent).toContain(`v-${variant}`);
    }
  });
});
