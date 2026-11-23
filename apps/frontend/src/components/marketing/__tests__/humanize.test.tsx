import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// El radar (MarketingRadar en /metodo) usa useRouter.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));
vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: (props: { alt: string; src: string }) => <img alt={props.alt} src={props.src} />,
}));

import MetodoPage from "@/app/(marketing)/metodo/page";
import DimensionsRadar from "@/components/marketing/DimensionsRadar";
import Hero from "@/components/marketing/Hero";
import { HugieTeaser } from "@/components/marketing/HugieTeaser";
import { LandingContent } from "@/components/marketing/LandingContent";
import { MarketingLanguageProvider } from "@/components/marketing/LanguageProvider";
import { PlatformLanding } from "@/components/marketing/platform/PlatformLanding";
import { DayAtWork } from "@/components/marketing/people/DayAtWork";
import { ThreePeople } from "@/components/marketing/people/ThreePeople";
import Quote from "@/components/marketing/Quote";

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
    // Los tres datos van en un solo panel sobre la foto
    const stats = screen.getByText("dimensiones del crecimiento humano").closest("dl")!;
    expect(within(stats).getByText("por módulo de aprendizaje")).toBeTruthy();
    expect(within(stats).getByText("vistas: colaborador, líder y RRHH")).toBeTruthy();
  });
});

describe("Dimensiones + radar en una sección", () => {
  it("tres dimensiones a cada lado y el radar en el medio, con el ancla del hero", () => {
    setFlag(true);
    const { container } = renderMk(<DimensionsRadar />);
    expect(container.querySelector("section#dimensiones")).toBeTruthy();
    const titles = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(titles).toEqual([
      "Carrera e impacto",
      "Propósito y significado",
      "Relaciones y conexión",
      "Salud y bienestar",
      "Paz interior y claridad",
      "Estabilidad emocional y material",
    ]);
    expect(screen.getByText(/cada usuario ve su propio radar/)).toBeTruthy();
    expect(screen.getByText("Encontrá qué le da sentido a lo que hacés cada día.")).toBeTruthy();
  });

  it("el home ya no incluye 'Detrás de la plataforma'", () => {
    setFlag(true);
    const { container } = renderMk(<LandingContent />);
    expect(container.textContent).not.toMatch(/Detrás de la plataforma/);
    expect(container.querySelectorAll("#dimensiones")).toHaveLength(1);
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

describe("ThreePeople (D2)", () => {
  it("orden RRHH → Líder → Colaborador, rotulado con datos de ejemplo", () => {
    renderMk(<ThreePeople />);
    const roles = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(roles).toEqual(["RRHH", "Líder", "Colaborador"]);
    expect(screen.getByText("Pantallas con datos de ejemplo.")).toBeTruthy();
    expect(
      screen.getByText("Identificá tu nivel de crecimiento y qué hacer esta semana, con una ruta a tu medida."),
    ).toBeTruthy();
  });
});

describe("Quote · formato nuevo (D4)", () => {
  it("mismo copy, con retrato de Jorge", () => {
    setFlag(true);
    renderMk(<Quote />);
    expect(screen.getByText("POR QUÉ CONSTRUIMOS ESTO")).toBeTruthy();
    expect(screen.getByText(/9 de cada 10 profesionales/)).toBeTruthy();
    expect(screen.getByText("Hasta ahora.")).toBeTruthy();
    expect(screen.getByText(/Fundador · HumanGrowth/).parentElement?.textContent).toMatch(/^Jorge Araya/);
    expect(screen.getByText(/Workplace Skills Survey, octubre 2024/)).toBeTruthy();
    const portrait = screen.getByAltText("Jorge Araya, fundador de HumanGrowth") as HTMLImageElement;
    expect(portrait.getAttribute("src")).toBe("/marketing/mentors/jorge-perfil.webp");
  });
});

describe("HugieTeaser · orbe oficial v2, estados y chat (D3)", () => {
  it("flag apagado: orbes en reposo y celebrando, sin chat", () => {
    setFlag(false);
    const { container } = renderMk(<HugieTeaser />);
    expect(container.querySelectorAll(".hugie")).toHaveLength(2);
    expect(container.querySelector(".hugie--celebrando")).toBeTruthy();
    expect(screen.queryByRole("img", { name: /conversación con Hugie/ })).toBeNull();
  });

  it("flag encendido: qué va a hacer Hugie en la plataforma + la vista de chat", () => {
    setFlag(true);
    const { container } = renderMk(<HugieTeaser />);
    expect(screen.getByText("Conocé a Hugie.")).toBeTruthy();
    expect(container.textContent).not.toMatch(/Cambia de energía según el momento|cambia de energía/);
    const fns = screen.getByText("Qué va a hacer Hugie en la plataforma").parentElement!;
    expect(within(fns).getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual([
      "Tu diagnóstico, conversando",
      "Pasos concretos para tu semana",
      "Feedback que explica el porqué",
      "Síntesis de cada módulo",
    ]);
    expect(screen.queryByRole("group", { name: "Estados de Hugie" })).toBeNull();

    const chat = screen.getByRole("img", { name: /conversación con Hugie/ });
    expect(chat.querySelector(".hugie:not(.hugie--bare)")).toBeTruthy();
    // La maqueta no es interactiva: nada enfocable adentro.
    expect(chat.querySelectorAll("button, input, a, [tabindex]")).toHaveLength(0);
    expect(screen.getByText(/Imagen conceptual de Hugie/)).toBeTruthy();
  });
});

describe("/plataforma · Hugie con el diseño nuevo", () => {
  it("flag encendido: orbe v2, chat y funciones en vez de las tres capturas", () => {
    setFlag(true);
    const { container } = renderMk(<PlatformLanding />);
    expect(screen.getByRole("img", { name: /conversación con Hugie/ })).toBeTruthy();
    expect(screen.getByText("Qué va a hacer Hugie en la plataforma")).toBeTruthy();
    expect(container.querySelector(".hugie")).toBeTruthy();
    expect(screen.queryByAltText("Hugie da la bienvenida")).toBeNull();
  });

  it("flag apagado: las tres capturas de onboarding de siempre", () => {
    setFlag(false);
    renderMk(<PlatformLanding />);
    expect(screen.getByAltText("Hugie da la bienvenida")).toBeTruthy();
    expect(screen.queryByRole("img", { name: /conversación con Hugie/ })).toBeNull();
  });
});

describe("/metodo · humanize (D7)", () => {
  it("flag encendido: tres fotos aditivas, el pie nuevo y todo el texto intacto", () => {
    setFlag(true);
    renderMk(<MetodoPage />);
    expect((screen.getByAltText(/pared de post-its/) as HTMLImageElement).getAttribute("src")).toBe(
      "/marketing/people/equipo-sala-postit.webp",
    );
    expect(screen.getByAltText(/frente a una pizarra/)).toBeTruthy();
    expect(screen.getByAltText(/contrastando ideas/)).toBeTruthy();
    expect(screen.getByText("Cada etapa se discute y se documenta en equipo.")).toBeTruthy();
    expect(screen.getByText("Seis pilares, una sola mesa de trabajo")).toBeTruthy();
    // Texto existente sin cambios
    expect(screen.getByText("La ciencia nos respalda.")).toBeTruthy();
    expect(screen.getByText("Los seis pilares son una red, no una lista.")).toBeTruthy();
    expect(screen.getByText("Correlación vs. causalidad")).toBeTruthy();
  });

  it("flag apagado: sin fotos", () => {
    setFlag(false);
    renderMk(<MetodoPage />);
    expect(screen.queryByAltText(/pared de post-its/)).toBeNull();
    expect(screen.queryByText("Cada etapa se discute y se documenta en equipo.")).toBeNull();
  });
});
