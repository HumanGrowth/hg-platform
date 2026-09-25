import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { MyBadge } from "@/lib/types";

import { AreaCard } from "../AreaCard";

const badge: MyBadge = {
  code: "pillar-cp-p1",
  name: "Adaptabilidad de aprendizaje",
  description: "d",
  icon_url: "/icons/badge-placeholder.svg",
  unlock_hint: "h",
  unlocked: false,
  unlocked_at: null,
};

describe("AreaCard", () => {
  it("la insignia del área se dibuja con el design system, no con la imagen genérica", () => {
    const { container } = render(
      <AreaCard dimensionCode="CP" pillarCode="P1" areaName="Adaptabilidad" units={[]} badge={badge} />,
    );
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("sin fila de catálogo igual dibuja la insignia con el kit", () => {
    const { container } = render(
      <AreaCard dimensionCode="CP" pillarCode="P2" areaName="Excelencia" units={[]} badge={undefined} />,
    );
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("svg")).not.toBeNull();
  });
});
