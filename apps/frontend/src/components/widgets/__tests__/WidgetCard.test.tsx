import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { WidgetCard } from "../WidgetCard";

describe("WidgetCard", () => {
  it("shows a loading skeleton and hides children", () => {
    const { container } = render(
      <WidgetCard title="Test" state="loading">
        <span>contenido</span>
      </WidgetCard>,
    );
    expect(container.querySelector(".animate-pulse")).not.toBeNull();
    expect(screen.queryByText("contenido")).toBeNull();
  });

  it("shows error state with a working retry button", () => {
    const onRetry = vi.fn();
    render(
      <WidgetCard title="Test" state="error" onRetry={onRetry}>
        <span>contenido</span>
      </WidgetCard>,
    );
    const btn = screen.getByRole("button", { name: /Reintentar/ });
    fireEvent.click(btn);
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("shows the empty message", () => {
    render(
      <WidgetCard title="Test" state="empty" emptyMessage="Nada por aquí">
        <span>contenido</span>
      </WidgetCard>,
    );
    expect(screen.getByText("Nada por aquí")).toBeTruthy();
    expect(screen.queryByText("contenido")).toBeNull();
  });

  it("renders children when state is ok", () => {
    render(
      <WidgetCard title="Test" state="ok">
        <span>contenido</span>
      </WidgetCard>,
    );
    expect(screen.getByText("contenido")).toBeTruthy();
  });
});
