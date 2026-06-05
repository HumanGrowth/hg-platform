"use client";

import * as React from "react";

import { BetaBanner } from "@/components/BetaBanner";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Dialog } from "@/components/ui/dialog";
import { Display } from "@/components/ui/display";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Input, Label } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-b border-border py-10">
      <Eyebrow accent>{title}</Eyebrow>
      <div className="flex flex-wrap items-start gap-4">{children}</div>
    </section>
  );
}

const PILLARS = [
  "pillar-p1",
  "pillar-p2",
  "pillar-p3",
  "pillar-p4",
  "pillar-p5",
  "pillar-p6",
] as const;

export default function KitPage() {
  const [open, setOpen] = React.useState(false);
  const [chip, setChip] = React.useState("L2");

  return (
    <main className="mx-auto max-w-prose px-6 py-10">
      <BetaBanner />
      <Display variant="display-2" className="mt-8">
        Design kit
      </Display>
      <p className="mt-2 font-sans text-fg-muted">
        Preview de primitives sobre tokens del DS (v1, pendiente DEC-03).
      </p>

      <Section title="Display + serif">
        <Display variant="display-1">Crecé en serio</Display>
        <Display variant="display-3">Sección</Display>
        <p className="font-serif text-2xl italic text-fg">Una nota editorial, con criterio.</p>
      </Section>

      <Section title="Buttons">
        <Button variant="primary">Continuar</Button>
        <Button variant="secondary">Cancelar</Button>
        <Button variant="ghost">Explorar</Button>
        <Button variant="destructive">Revocar</Button>
        <Button size="sm">sm</Button>
        <Button size="lg">lg</Button>
        <Button disabled>Disabled</Button>
      </Section>

      <Section title="Inputs">
        <div className="w-full max-w-xs">
          <Label htmlFor="k-email">Email</Label>
          <Input id="k-email" type="email" placeholder="nombre@empresa.com" />
        </div>
      </Section>

      <Section title="Badges">
        <Badge>Default</Badge>
        <Badge variant="earned">Earned</Badge>
        <Badge variant="success">Activa</Badge>
        <Badge variant="warning">Pendiente</Badge>
        <Badge variant="danger">Vencida</Badge>
        {PILLARS.map((p, i) => (
          <Badge key={p} variant={p}>
            P{i + 1}
          </Badge>
        ))}
      </Section>

      <Section title="Avatar + chips">
        <Avatar name="Ada Lovelace" size="sm" />
        <Avatar name="Ada Lovelace" />
        <Avatar name="Ada Lovelace" size="lg" />
        {["L1", "L2", "L3", "L4a"].map((l) => (
          <Chip key={l} active={chip === l} onClick={() => setChip(l)}>
            {l}
          </Chip>
        ))}
      </Section>

      <Section title="Card">
        <Card className="max-w-sm">
          <CardHeader>
            <CardTitle>Tu próximo paso</CardTitle>
            <CardDescription>Carrera e impacto · 12 min</CardDescription>
          </CardHeader>
          <CardContent>Retomá donde lo dejaste.</CardContent>
        </Card>
      </Section>

      <Section title="Progress">
        <div className="w-full max-w-sm">
          <Progress value={64} label="Progreso" />
        </div>
      </Section>

      <Section title="Tabs">
        <Tabs defaultValue="usuarios" className="w-full">
          <TabsList>
            <TabsTrigger value="usuarios">Usuarios</TabsTrigger>
            <TabsTrigger value="invitaciones">Invitaciones</TabsTrigger>
          </TabsList>
          <TabsContent value="usuarios">Lista de usuarios.</TabsContent>
          <TabsContent value="invitaciones">Lista de invitaciones.</TabsContent>
        </Tabs>
      </Section>

      <Section title="Dialog">
        <Button onClick={() => setOpen(true)}>Abrir dialog</Button>
        <Dialog
          open={open}
          onClose={() => setOpen(false)}
          title="Nueva organización"
          description="Solo el superadmin de HG puede crearla."
        >
          <div className="flex flex-col gap-4">
            <div>
              <Label htmlFor="k-org">Nombre</Label>
              <Input id="k-org" placeholder="Acme Corp" />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={() => setOpen(false)}>Crear</Button>
            </div>
          </div>
        </Dialog>
      </Section>
    </main>
  );
}
