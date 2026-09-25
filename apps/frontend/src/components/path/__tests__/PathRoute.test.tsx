import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PathRoute } from "@/components/path/PathRoute";
import type {
  LearningUnitFeedItem,
  MyPath,
  PathMilestone,
  PathStep,
  PillarFeedback,
} from "@/lib/types";

const step = (n: number, o: Partial<PathStep> = {}): PathStep => ({
  unit_id: `u${n}`,
  slug: `unit-${n}`,
  title: `Módulo ${n}`,
  dimension_code: "CP",
  career_path_code: "P1",
  level_code: "L2",
  pillar_code: "P1",
  estimated_minutes: 8,
  ...o,
});

const milestone = (o: Partial<PathMilestone> = {}): PathMilestone => ({
  kind: "level",
  after_unit_id: "u9",
  title: "Completás el nivel Sólido",
  dimension_code: "CP",
  career_path_code: "P1",
  pillar_code: null,
  level_code: "L2",
  badge_code: "level-cp-l2",
  badge_name: "Carrera · Sólido",
  badge_icon_url: "/icons/badge-placeholder.svg",
  units_remaining: 2,
  requires_assessment: true,
  sequence_position: 3,
  ...o,
});

const path = (o: Partial<MyPath> = {}): MyPath => ({
  current_level: "L2",
  next_step: step(1, { title: "Decisiones bajo presión" }),
  upcoming: [step(2)],
  completed_this_level: 3,
  total_this_level: 12,
  dimensions_progress: [],
  milestones: [milestone()],
  ...o,
});

const heroUnit: LearningUnitFeedItem = {
  id: "u1",
  slug: "unit-1",
  title: "Decisiones bajo presión",
  dimension_code: "CP",
  pillar_code: "P1",
  unit_number: 4,
  level_code: "L2",
  estimated_duration_seconds: 480,
  blocks_count: 7,
  attempt_status: "in_progress",
  poster_url: null,
  video_url: null,
  keywords: null,
};

describe("PathRoute", () => {
  it("muestra el hero del próximo paso con chip y CTA que retoma la unit", () => {
    render(<PathRoute data={path()} heroUnit={heroUnit} />);
    expect(screen.getByText("Próximo · L2 · 8 min")).toBeTruthy();
    const cta = screen.getByRole("link", { name: "Continuar: Decisiones bajo presión" });
    expect(cta.getAttribute("href")).toBe("/modulos/CP/L2/P1/004");
  });

  it("sin la unit resuelta, el CTA cae al slug del next_step", () => {
    render(<PathRoute data={path()} heroUnit={null} />);
    const cta = screen.getByRole("link", { name: "Continuar: Decisiones bajo presión" });
    expect(cta.getAttribute("href")).toBe("/modulos/unit-1");
  });

  it("usa el primer hito como 'Siguiente hito', con unidades faltantes y evaluación", () => {
    render(<PathRoute data={path()} heroUnit={heroUnit} />);
    expect(screen.getByText("Siguiente hito")).toBeTruthy();
    expect(screen.getByText("Se desbloquea al terminar 2 módulos más")).toBeTruthy();
    expect(screen.getByText("Requiere evaluación")).toBeTruthy();
  });

  it("sin hitos ni minutos degrada sin romper", () => {
    render(
      <PathRoute
        data={path({ milestones: [], next_step: step(1, { estimated_minutes: null }) })}
        heroUnit={null}
      />,
    );
    expect(screen.queryByText("Siguiente hito")).toBeNull();
    expect(screen.getByText("Próximo · L2")).toBeTruthy();
  });

  it("expone la barra de progreso del nivel", () => {
    render(<PathRoute data={path()} heroUnit={null} />);
    const bar = screen.getByRole("progressbar");
    expect(bar.getAttribute("aria-valuenow")).toBe("25");
  });

  const areaMilestone = milestone({
    kind: "area",
    after_unit_id: "u2",
    pillar_code: "P1",
    level_code: null,
    badge_code: "pillar-cp-p1",
    title: "Área completa · Adaptabilidad",
  });
  const fb = (o: Partial<PillarFeedback> = {}): PillarFeedback => ({
    pillar_code: "P1",
    dimension_code: "CP",
    text: "Excelente foco en el feedback.",
    updated_at: "2026-09-20T10:00:00Z",
    manager_name: "Ana",
    ...o,
  });

  it("muestra el feedback del pilar en curso en el panel izquierdo, no en la línea", () => {
    render(
      <PathRoute data={path({ milestones: [areaMilestone] })} heroUnit={null} pillarFeedback={[fb()]} />,
    );
    const panel = screen.getByRole("region", { name: "Feedback que impulsa" });
    expect(panel.textContent).toContain("Excelente foco en el feedback.");
    expect(panel.textContent).toContain("— Ana");
    // Un solo bloque de feedback; el hito de pilar en la línea es solo el checkpoint.
    expect(screen.getAllByRole("heading", { name: "Feedback que impulsa", level: 3 })).toHaveLength(1);
    const timeline = screen.getByRole("region", { name: "Próximos pasos" });
    expect(timeline.textContent).not.toContain("Excelente foco en el feedback.");
    expect(timeline.textContent).toContain("Área completa · Adaptabilidad");
  });

  it("sin feedback escrito para el pilar en curso, avisa que el manager lo va a dejar", () => {
    render(<PathRoute data={path({ milestones: [areaMilestone] })} heroUnit={null} />);
    expect(screen.getByText(/Tu manager te va a dejar su feedback/)).toBeTruthy();
  });

  it("el feedback de otros pilares va colapsado dentro del panel", () => {
    render(
      <PathRoute
        data={path({ milestones: [] })}
        heroUnit={null}
        pillarFeedback={[fb({ pillar_code: "P2", text: "Pilar cerrado con éxito." })]}
      />,
    );
    expect(screen.getByText(/Feedback de otros pilares \(1\)/)).toBeTruthy();
    expect(screen.getByText("Pilar cerrado con éxito.")).toBeTruthy();
  });

  it("los próximos pasos viven en una región scrolleable de ~5 pasos", () => {
    const upcoming = Array.from({ length: 12 }, (_, i) => step(i + 2));
    render(<PathRoute data={path({ upcoming, milestones: [] })} heroUnit={null} />);
    const region = screen.getByRole("region", { name: "Próximos pasos" });
    expect(region.getAttribute("data-visible-steps")).toBe("5");
    expect(region.className).toContain("overflow-y-auto");
    expect(region.textContent).toContain("Módulo 13"); // la lista completa está, con scroll
  });

  it("sin next_step muestra el estado 'completaste todo' y omite el panel de nivel sin datos", () => {
    render(
      <PathRoute
        data={path({ next_step: null, upcoming: [], current_level: null, total_this_level: 0, milestones: [] })}
        heroUnit={null}
      />,
    );
    expect(screen.getByText("¡Completaste todo lo disponible!")).toBeTruthy();
    expect(screen.queryByRole("progressbar")).toBeNull();
  });
});
