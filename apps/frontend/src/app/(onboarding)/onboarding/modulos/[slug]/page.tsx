import { ModuloDetailView } from "@/components/modulos/ModuloDetailView";

/**
 * Viewer de un módulo de Onboarding — reusa el MISMO componente que
 * `(app)/modulos/[...segments]` (video/quiz/reflection, etc.), solo que acá
 * corre fuera del layout `(app)` para colaboradores todavía restringidos
 * (ver `SessionGate` + `onboarding.py`). Algunos links internos de
 * `ModuloDetailView` apuntan a `/path` — para un user restringido, ese
 * `(app)` route lo rebota de vuelta acá vía `SessionGate` (un hop extra, no
 * un loop roto).
 */
export default function OnboardingModuloPage({ params }: { params: { slug: string } }) {
  return <ModuloDetailView slug={params.slug} />;
}
