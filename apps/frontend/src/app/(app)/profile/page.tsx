"use client";

import * as React from "react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";

import { EmptyRing } from "@/components/EmptyRing";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Display } from "@/components/ui/display";
import { Eyebrow } from "@/components/ui/eyebrow";
import { apiMe } from "@/lib/api";
import { PILLARS } from "@/lib/pillars";
import type { Me } from "@/lib/types";

// Mock determinístico mientras no exista el assessment (FE pendiente de DEC-01).
const MOCK_SCORES: Record<string, number> = {
  P1: 62,
  P2: 48,
  P3: 75,
  P4: 55,
  P5: 40,
  P6: 68,
};

export default function ProfilePage() {
  const [me, setMe] = React.useState<Me | null>(null);

  React.useEffect(() => {
    apiMe()
      .then(setMe)
      .catch(() => setMe(null));
  }, []);

  const radarData = PILLARS.map((p) => ({ axis: p.id, score: MOCK_SCORES[p.id] ?? 0 }));

  return (
    <main className="mx-auto w-full max-w-app px-6 py-10">
      {/* Header */}
      <div className="flex items-center gap-5">
        <Avatar name={me?.full_name ?? "?"} size="lg" />
        <div>
          <Eyebrow accent>Mi perfil</Eyebrow>
          <Display variant="display-3" className="mt-1">
            {me?.full_name ?? "Cargando…"}
          </Display>
          <p className="mt-1 flex items-center gap-2 text-sm text-fg-muted">
            <Badge>{me?.role ?? "—"}</Badge>
            {me ? <span>· {me.org_name}</span> : null}
          </p>
        </div>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Radar de las 6 dimensiones */}
        <Card>
          <Eyebrow className="mb-2">Tus 6 dimensiones</Eyebrow>
          <p className="mb-4 text-sm text-fg-muted">
            Valores de muestra · se reemplazan con tu evaluación.
          </p>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="72%">
                <PolarGrid stroke="rgba(26,26,26,0.12)" />
                <PolarAngleAxis
                  dataKey="axis"
                  tick={{ fill: "#6B7061", fontSize: 12, fontWeight: 600 }}
                />
                <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                <Radar
                  name="score"
                  dataKey="score"
                  stroke="#E8530A"
                  fill="#E8530A"
                  fillOpacity={0.25}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Historial de evaluaciones (vacío v1) */}
        <Card className="flex flex-col">
          <Eyebrow className="mb-4">Historial de evaluaciones</Eyebrow>
          <div className="flex flex-1 items-center justify-center py-10">
            <EmptyRing label="Todavía no completaste ninguna evaluación." size={40} />
          </div>
        </Card>
      </div>

      {/* Logros (vacío v1, ring como marco de badge) */}
      <section className="mt-12">
        <Eyebrow>Logros</Eyebrow>
        <Card className="mt-4 flex flex-col items-center justify-center gap-3 py-16 text-center">
          <EmptyRing label="Tus Badges van a aparecer acá cuando completes pilares." />
        </Card>
      </section>
    </main>
  );
}
