import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function Fixture() {
  return (
    <Tabs defaultValue="a">
      <TabsList aria-label="Dims">
        <TabsTrigger value="a">Carrera</TabsTrigger>
        <TabsTrigger value="b">Propósito</TabsTrigger>
        <TabsTrigger value="c">Relaciones</TabsTrigger>
      </TabsList>
      <TabsContent value="a">panel-a</TabsContent>
      <TabsContent value="b">panel-b</TabsContent>
      <TabsContent value="c">panel-c</TabsContent>
    </Tabs>
  );
}

describe("Tabs", () => {
  it("muestra el panel del tab activo por defecto", () => {
    render(<Fixture />);
    expect(screen.getByText("panel-a")).toBeTruthy();
    expect(screen.queryByText("panel-b")).toBeNull();
  });

  it("cambia de panel al hacer click en un tab", () => {
    render(<Fixture />);
    fireEvent.click(screen.getByRole("tab", { name: "Propósito" }));
    expect(screen.getByText("panel-b")).toBeTruthy();
    expect(screen.queryByText("panel-a")).toBeNull();
  });

  it("navega con las flechas ←/→ (activación automática)", () => {
    render(<Fixture />);
    screen.getByRole("tab", { name: "Carrera" }).focus();
    fireEvent.keyDown(screen.getByRole("tablist"), { key: "ArrowRight" });
    expect(screen.getByText("panel-b")).toBeTruthy();
    fireEvent.keyDown(screen.getByRole("tablist"), { key: "ArrowRight" });
    expect(screen.getByText("panel-c")).toBeTruthy();
    fireEvent.keyDown(screen.getByRole("tablist"), { key: "ArrowRight" });
    expect(screen.getByText("panel-a")).toBeTruthy();
  });
});
