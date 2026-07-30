import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import EventosPage from "../page";
import type { CommunityEvent } from "@/lib/types";

const { listEvents } = vi.hoisted(() => ({ listEvents: vi.fn() }));

vi.mock("@/lib/api", () => ({ apiListCommunityEvents: listEvents }));

function ev(partial: Partial<CommunityEvent>): CommunityEvent {
  return {
    id: Math.random().toString(36).slice(2),
    type: "recorded_webinar",
    title: "Evento",
    slug: "evento",
    description: null,
    hero_image_url: null,
    cta_url: null,
    cta_label: null,
    starts_at: null,
    ends_at: null,
    is_featured: false,
    sort_order: 0,
    ...partial,
  };
}

const future = new Date(Date.now() + 86_400_000).toISOString();
const past = new Date(Date.now() - 86_400_000).toISOString();

describe("EventosPage", () => {
  beforeEach(() => listEvents.mockReset());

  it("categorizes events into live / upcoming / past / material sections", async () => {
    listEvents.mockResolvedValue([
      ev({ type: "live_webinar", title: "Vivo Próximo", starts_at: future }),
      ev({ type: "recorded_webinar", title: "Webinar Próximo", starts_at: future }),
      ev({ type: "recorded_webinar", title: "Webinar Pasado", starts_at: past }),
      ev({ type: "material", title: "PDF Guía" }),
    ]);
    render(<EventosPage />);

    await waitFor(() => expect(screen.getByText("Próximos en vivo")).toBeTruthy());
    expect(screen.getByText("Webinars próximos")).toBeTruthy();
    expect(screen.getByText("Webinars pasados")).toBeTruthy();
    expect(screen.getByText("Material relevante")).toBeTruthy();
    expect(screen.getByText("Vivo Próximo")).toBeTruthy();
    expect(screen.getByText("PDF Guía")).toBeTruthy();
  });

  it("shows the featured hero and hides empty sections", async () => {
    listEvents.mockResolvedValue([
      ev({ title: "Destacado", is_featured: true, starts_at: future, type: "live_webinar" }),
    ]);
    render(<EventosPage />);

    // Aparece en el hero destacado + en su sección ("Próximos en vivo").
    await waitFor(() => expect(screen.getAllByText("Destacado").length).toBeGreaterThan(0));
    // No hay eventos de tipo material → esa sección no se muestra.
    expect(screen.queryByText("Material relevante")).toBeNull();
  });

  it("shows an empty state when there are no events", async () => {
    listEvents.mockResolvedValue([]);
    render(<EventosPage />);
    await waitFor(() =>
      expect(screen.getByText("Todavía no hay eventos publicados.")).toBeTruthy(),
    );
  });
});
