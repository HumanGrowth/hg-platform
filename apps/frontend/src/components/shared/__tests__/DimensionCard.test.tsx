import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DimensionCard } from "../DimensionCard";
import { dimensionByCode } from "@/lib/dimensions";

describe("DimensionCard", () => {
  it("links to /dimensiones/[code] and shows name + score", () => {
    render(<DimensionCard dimension={dimensionByCode("CP")!} score={72} />);
    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe("/dimensiones/CP");
    expect(screen.getByText("Carrera e impacto")).toBeTruthy();
    expect(screen.getByText("72")).toBeTruthy();
  });

  it("marks dimensions without content as 'Próximamente'", () => {
    render(<DimensionCard dimension={dimensionByCode("PR")!} score={0} />);
    expect(screen.getByText("Próximamente")).toBeTruthy();
  });

  it("does not show 'Próximamente' for a dimension with content", () => {
    render(<DimensionCard dimension={dimensionByCode("CP")!} score={10} />);
    expect(screen.queryByText("Próximamente")).toBeNull();
  });
});
