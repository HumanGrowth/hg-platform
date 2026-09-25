import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CatalogBadge } from "../CatalogBadge";

vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: (props: { src: string; alt: string }) => <img src={props.src} alt={props.alt} />,
}));

describe("CatalogBadge — nunca muestra el ícono genérico del catálogo", () => {
  it("badge de área: se dibuja con el kit (dimensión + nombre del área), no como imagen", () => {
    const { container } = render(
      <CatalogBadge
        code="pillar-cp-p1"
        name="Adaptabilidad de aprendizaje"
        iconUrl="/icons/badge-placeholder.svg"
        unlocked
      />,
    );
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("svg")).not.toBeNull();
    expect(screen.getByRole("img").getAttribute("aria-label")).toContain("Carrera");
  });

  it("badge de nivel: sigue con el kit", () => {
    const { container } = render(
      <CatalogBadge code="level-cp-l2" name="CP · Sólido" iconUrl="/icons/badge-placeholder.svg" unlocked={false} />,
    );
    expect(container.querySelector("svg")).not.toBeNull();
    expect(screen.getByRole("img").getAttribute("aria-label")).toContain("bloqueado");
  });

  it("código desconocido con el placeholder: kit con la dimensión del prefijo", () => {
    const { container } = render(
      <CatalogBadge code="pr-extra" name="Algo" iconUrl="/icons/badge-placeholder.svg" unlocked />,
    );
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByRole("img").getAttribute("aria-label")).toContain("Propósito");
  });

  it("solo respeta un ícono que traiga arte real", () => {
    const { container } = render(
      <CatalogBadge code="cp-1" name="Primer paso" iconUrl="/icons/hex-rocket-128.png" unlocked />,
    );
    expect(container.querySelector("img")?.getAttribute("src")).toBe("/icons/hex-rocket-128.png");
  });
});
