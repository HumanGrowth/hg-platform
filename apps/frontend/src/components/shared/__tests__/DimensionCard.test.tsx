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

  it("marks a dimension as 'Próximamente' when the API says it has no content", () => {
    render(<DimensionCard dimension={dimensionByCode("RE")!} score={0} hasContent={false} />);
    expect(screen.getByText("Próximamente")).toBeTruthy();
  });

  it("does not show 'Próximamente' for a dimension with content", () => {
    render(<DimensionCard dimension={dimensionByCode("SA")!} score={10} hasContent />);
    expect(screen.queryByText("Próximamente")).toBeNull();
  });

  it("does not block while availability is still unknown", () => {
    render(<DimensionCard dimension={dimensionByCode("ES")!} score={10} />);
    expect(screen.queryByText("Próximamente")).toBeNull();
  });
});
