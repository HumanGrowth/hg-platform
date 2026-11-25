"use client";

import * as React from "react";

import { apiListModulosByDimension } from "@/lib/api";
import { DIMENSIONS, type DimensionCode } from "@/lib/dimensions";

/** `true` = tiene units publicadas visibles para el usuario; `false` = todavía no. */
export type DimensionAvailability = Partial<Record<DimensionCode, boolean>>;

/**
 * Qué dimensiones tienen contenido publicado, derivado de la API (no hardcodeado).
 *
 * Pide 1 unit por dimensión a `/modulos/by-dimension`, que ya aplica la visibilidad
 * de la empresa (dimensiones/áreas habilitadas). Mientras carga, o si una consulta
 * falla, la dimensión queda `undefined`: la UI no la marca como "Próximamente" por
 * un error de red.
 */
export function useDimensionAvailability(): DimensionAvailability {
  const [availability, setAvailability] = React.useState<DimensionAvailability>({});

  React.useEffect(() => {
    let active = true;
    Promise.all(
      DIMENSIONS.map((d) =>
        apiListModulosByDimension(d.careerPath, undefined, 1)
          .then((units) => [d.code, units.length > 0] as const)
          .catch(() => [d.code, undefined] as const),
      ),
    ).then((entries) => {
      if (!active) return;
      const next: DimensionAvailability = {};
      for (const [code, has] of entries) if (has !== undefined) next[code] = has;
      setAvailability(next);
    });
    return () => {
      active = false;
    };
  }, []);

  return availability;
}
