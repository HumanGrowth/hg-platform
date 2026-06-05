"use client";

import { Display } from "@/components/ui/display";
import { Eyebrow } from "@/components/ui/eyebrow";
import { useAuthStore } from "@/lib/auth-store";

// Placeholder mínimo (FE-03): prueba que la hidratación de sesión funciona.
// FE-04 lo reemplaza con el dashboard completo de 6 dimensiones.
export default function HomePage() {
  const user = useAuthStore((s) => s.user);
  return (
    <main className="mx-auto w-full max-w-app px-6 py-12">
      <Eyebrow accent>Inicio</Eyebrow>
      <Display variant="display-2" className="mt-2">
        Hola{user ? `, ${user.full_name.split(" ")[0]}` : ""}
      </Display>
      <p className="mt-3 text-fg-muted">Sesión activa. El dashboard llega en FE-04.</p>
    </main>
  );
}
