import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: (props: { alt: string; src: string }) => <img alt={props.alt} src={props.src} />,
}));

import Hero from "@/components/marketing/Hero";
import { MarketingLanguageProvider } from "@/components/marketing/LanguageProvider";
import { DayAtWork } from "@/components/marketing/people/DayAtWork";

function renderMk(ui: React.ReactElement) {
  return render(<MarketingLanguageProvider>{ui}</MarketingLanguageProvider>);
}

const FLAG = "NEXT_PUBLIC_SHOW_HUMANIZE";
const orig = process.env[FLAG];
function setFlag(on: boolean) {
  if (on) process.env[FLAG] = "true";
  else delete process.env[FLAG];
}
afterEach(() => {
  if (orig === undefined) delete process.env[FLAG];
  else process.env[FLAG] = orig;
});

describe("Hero · humanize (D1)", () => {
  it("flag apagado: mockups actuales, sin foto", () => {
    setFlag(false);
    renderMk(<Hero />);
    expect(screen.queryByAltText(/mesa larga de oficina/)).toBeNull();
    expect(screen.getByAltText("Player de módulo en el teléfono")).toBeTruthy();
  });

  it("flag encendido: una foto + la captura mobile de inicio, sin cambiar el titular", () => {
    setFlag(true);
    renderMk(<Hero />);
    expect(screen.getByText(/Habilidades Humanas ·/)).toBeTruthy();
    const photo = screen.getByAltText(/mesa larga de oficina/) as HTMLImageElement;
    expect(photo.getAttribute("src")).toBe("/marketing/people/hero-equipo.webp");
    const phone = screen.getByAltText("Inicio de la app en el teléfono") as HTMLImageElement;
    expect(phone.getAttribute("src")).toBe("/marketing/plataforma/mob-home.webp");
    expect(screen.queryByAltText("Inicio de la app: progreso por dimensión")).toBeNull();
    expect(screen.getByText("Pantallas con datos de ejemplo.")).toBeTruthy();
  });
});

describe("DayAtWork", () => {
  beforeEach(() => setFlag(true));

  it("cuatro pestañas; la primera activa con su panel", () => {
    renderMk(<DayAtWork />);
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(4);
    expect(tabs[0].getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("tabpanel").getAttribute("aria-labelledby")).toBe(tabs[0].id);
    expect(screen.getByText("Escucha activa · paso 4 de 5")).toBeTruthy();
  });

  it("se navega con flechas, Inicio y Fin (foco itinerante)", () => {
    renderMk(<DayAtWork />);
    const tabs = screen.getAllByRole("tab");
    fireEvent.keyDown(tabs[0], { key: "ArrowDown" });
    expect(screen.getAllByRole("tab")[1].getAttribute("aria-selected")).toBe("true");
    expect(document.activeElement).toBe(screen.getAllByRole("tab")[1]);
    expect(screen.getByText("Tu plan de acción")).toBeTruthy();

    fireEvent.keyDown(screen.getAllByRole("tab")[1], { key: "End" });
    expect(screen.getAllByRole("tab")[3].getAttribute("aria-selected")).toBe("true");
    expect(screen.getByText("Mi Equipo · 12 personas")).toBeTruthy();

    fireEvent.keyDown(screen.getAllByRole("tab")[3], { key: "ArrowRight" });
    expect(screen.getAllByRole("tab")[0].getAttribute("aria-selected")).toBe("true");

    const inactive = screen.getAllByRole("tab").filter((t) => t.getAttribute("aria-selected") === "false");
    expect(inactive.every((t) => t.getAttribute("tabindex") === "-1")).toBe(true);
  });

  it("al hacer clic cambia la foto del panel", () => {
    renderMk(<DayAtWork />);
    fireEvent.click(screen.getAllByRole("tab")[2]);
    const img = screen.getByAltText(/Taller en una sala de oficina/) as HTMLImageElement;
    expect(img.getAttribute("src")).toBe("/marketing/people/dia-3-taller.webp");
  });
});
