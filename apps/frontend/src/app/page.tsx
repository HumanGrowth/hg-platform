export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="max-w-2xl text-center">
        <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-brand-600">
          Human Growth · v0.1.0
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          Plataforma de crecimiento profesional holístico
        </h1>
        <p className="mt-6 text-lg leading-8 text-slate-600">
          Bootstrap del frontend listo. Próximo: cerrar identidad visual (DEC-03) y arrancar
          wireframes del flujo de onboarding.
        </p>

        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[
            { id: "P1", name: "Carrera e Impacto", color: "bg-pillar-p1" },
            { id: "P2", name: "Propósito", color: "bg-pillar-p2" },
            { id: "P3", name: "Relaciones", color: "bg-pillar-p3" },
            { id: "P4", name: "Salud", color: "bg-pillar-p4" },
            { id: "P5", name: "Paz Interior", color: "bg-pillar-p5" },
            { id: "P6", name: "Estabilidad", color: "bg-pillar-p6" },
          ].map((p) => (
            <div
              key={p.id}
              className={`rounded-lg ${p.color} px-3 py-4 text-left text-white shadow`}
            >
              <p className="text-xs font-semibold opacity-90">{p.id}</p>
              <p className="text-sm font-medium">{p.name}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
