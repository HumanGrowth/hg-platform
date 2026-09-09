/**
 * Países en ISO-3166-1 alpha-2 (lo que espera `Organization.country`,
 * max_length=2 en el backend). Foco en LatAm/España, donde opera HG.
 */
export const COUNTRIES: { code: string; name: string }[] = [
  { code: "CR", name: "Costa Rica" },
  { code: "MX", name: "México" },
  { code: "GT", name: "Guatemala" },
  { code: "HN", name: "Honduras" },
  { code: "SV", name: "El Salvador" },
  { code: "NI", name: "Nicaragua" },
  { code: "PA", name: "Panamá" },
  { code: "CO", name: "Colombia" },
  { code: "VE", name: "Venezuela" },
  { code: "EC", name: "Ecuador" },
  { code: "PE", name: "Perú" },
  { code: "BO", name: "Bolivia" },
  { code: "CL", name: "Chile" },
  { code: "AR", name: "Argentina" },
  { code: "UY", name: "Uruguay" },
  { code: "PY", name: "Paraguay" },
  { code: "BR", name: "Brasil" },
  { code: "DO", name: "República Dominicana" },
  { code: "PR", name: "Puerto Rico" },
  { code: "CU", name: "Cuba" },
  { code: "ES", name: "España" },
  { code: "US", name: "Estados Unidos" },
  { code: "CA", name: "Canadá" },
];

const BY_CODE = new Map(COUNTRIES.map((c) => [c.code, c.name]));

/** Nombre visible de un país por su código ISO-2; cae al código crudo si no está en la lista. */
export function countryName(code: string | null | undefined): string {
  if (!code) return "—";
  return BY_CODE.get(code.toUpperCase()) ?? code;
}
