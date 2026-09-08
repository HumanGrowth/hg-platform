import { PathJourney } from "@/components/path/PathJourney";
import { Display } from "@/components/ui/display";
import { Eyebrow } from "@/components/ui/eyebrow";

export const metadata = { title: "Mi Ruta — Human Growth" };

// Mi Ruta: learning path guiado — un "próximo paso" recomendado + timeline con
// los hitos (insignias de área y de nivel) + el catálogo "Explorá por
// dimensión", que se mudó acá desde Módulos. Todo sale de GET /me/path.
export default function PathPage() {
  return (
    <div className="mx-auto max-w-app px-6 py-10">
      <Eyebrow className="mb-2">Mi Ruta</Eyebrow>
      <Display className="mb-2 text-4xl">Tu ruta de crecimiento</Display>
      <p className="max-w-prose text-fg-muted">
        Un paso a la vez, en el orden que más te sirve.
      </p>
      <PathJourney />
    </div>
  );
}
