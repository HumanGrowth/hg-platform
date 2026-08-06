import { PathJourney } from "@/components/path/PathJourney";
import { Display } from "@/components/ui/display";
import { Eyebrow } from "@/components/ui/eyebrow";

export const metadata = { title: "Mi Ruta — Human Growth" };

// Mi Ruta (cierre-beta TASK 1): learning path guiado — un "próximo paso"
// recomendado + timeline + progreso por nivel y dimensión, desde el motor
// GET /me/path. Reemplaza los 6 carriles por pilar (PathLanes).
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
