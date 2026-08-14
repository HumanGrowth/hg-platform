"use client";

/**
 * Pantalla de consentimiento de privacidad de datos (Capa Empresa · TASK 5).
 *
 * ⚠️ PENDIENTE-LEGAL: el texto de abajo es un BORRADOR de trabajo, no el texto
 * legal definitivo. Andy debe revisarlo/reemplazarlo antes de producción. La
 * versión vigente la ancla el backend (`consent_version`, hoy "2026-08-v1");
 * al cambiar el texto hay que subir esa versión para re-pedir la aceptación.
 *
 * Hookup pendiente: insertar esta pantalla como primer paso del onboarding
 * (antes de /onboarding/welcome) o como guard global — hoy es una página
 * independiente que llama a POST /me/consent.
 */
import { useRouter } from "next/navigation";
import * as React from "react";

import { apiAcceptConsent, apiGetConsent } from "@/lib/api";
import { toast } from "@/lib/toast-store";

export default function ConsentScreen() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [checking, setChecking] = React.useState(true);

  React.useEffect(() => {
    apiGetConsent()
      .then((s) => {
        if (s.accepted) router.replace("/onboarding/welcome");
        else setChecking(false);
      })
      .catch(() => setChecking(false));
  }, [router]);

  async function accept() {
    setLoading(true);
    try {
      await apiAcceptConsent();
      router.replace("/onboarding/welcome");
    } catch {
      toast("No pudimos registrar tu aceptación. Probá de nuevo.", "danger");
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-16 text-hg-charcoal">
        Cargando…
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-1 flex-col px-6 py-16">
      <h1 className="display text-fg text-[32px] sm:text-[40px]">Tu privacidad</h1>
      <p className="mt-6 text-hg-charcoal">
        Antes de empezar, queremos ser claros sobre qué datos de tu recorrido se comparten con el
        equipo de Recursos Humanos de tu empresa y para qué.
      </p>

      {/* ⚠️ PENDIENTE-LEGAL — borrador, reemplazar por el texto aprobado */}
      <div className="mt-8 rounded-lg border border-hg-line bg-hg-line/10 p-6 text-sm text-hg-charcoal">
        <p className="font-semibold text-fg">Qué ve tu empresa (RRHH y tu manager)</p>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>
            Tu <strong>estado por dimensión</strong> (por ejemplo &ldquo;En crecimiento&rdquo; /
            &ldquo;Sólido&rdquo;) y tu progreso en los módulos.
          </li>
          <li>
            <strong>Nunca</strong> tus respuestas individuales a las preguntas del assessment ni el
            detalle de tus reflexiones.
          </li>
        </ul>
        <p className="mt-4 font-semibold text-fg">Para qué</p>
        <p className="mt-2">
          Para acompañar tu desarrollo y orientar el contenido de tu ruta. Podés retirar tu
          consentimiento más adelante contactando a tu empresa.
        </p>
        <p className="mt-4 text-xs italic text-hg-charcoal/70">
          (Texto preliminar — pendiente de aprobación legal.)
        </p>
      </div>

      <button
        type="button"
        onClick={accept}
        disabled={loading}
        className="mt-10 self-start rounded-md bg-primary px-8 py-4 font-sans text-base font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
      >
        {loading ? "Guardando…" : "Acepto y continúo →"}
      </button>
    </div>
  );
}
