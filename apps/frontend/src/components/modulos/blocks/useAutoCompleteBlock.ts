"use client";

import * as React from "react";

const AUTO_COMPLETE_MS = 3000;

/**
 * Los bloques de texto no bloquean la navegación: se marcan completed solos a
 * los 3s de montarse (TASK B-06). Compartido por `TextBlockView` (look clásico)
 * y `TemplatedTextBlock` (plantillas sociales) para que ambos completen igual.
 */
export function useAutoCompleteBlock(
  blockId: string,
  isCompleted: boolean,
  onCompleteBlock: () => Promise<void>,
): void {
  React.useEffect(() => {
    if (isCompleted) return;
    const timer = setTimeout(() => {
      void onCompleteBlock();
    }, AUTO_COMPLETE_MS);
    return () => clearTimeout(timer);
    // Solo dispara una vez al montar el bloque — no re-arma si isCompleted
    // cambia por otra vía (evita re-llamar tras completar).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blockId]);
}
